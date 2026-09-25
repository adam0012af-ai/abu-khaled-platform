const SESSION_COOKIE = 'acm_session';
const SESSION_HOURS = 24 * 30;
const PASSWORD_ITERATIONS = 100000;
let schemaReady = false;
let runtimeBootstrapReady = false;
let balanceConfigCache = null;
let balanceConfigCacheAt = 0;

const BASE_SCHEMA = [
  "PRAGMA foreign_keys = ON",
  "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, email TEXT UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, password_iterations INTEGER NOT NULL DEFAULT 100000, role TEXT NOT NULL CHECK(role IN ('admin','reseller')), account_type TEXT NOT NULL DEFAULT 'reseller' CHECK(account_type IN ('owner','admin','agent','reseller')), parent_user_id TEXT, display_name TEXT NOT NULL, credits INTEGER NOT NULL DEFAULT 0 CHECK(credits >= 0), last_credit_tx_id TEXT, last_login_ip TEXT, last_country TEXT, last_login_at TEXT, must_change_password INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0,1)), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, csrf_token TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, ip_hash TEXT, user_agent TEXT)",
  "CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL, blocked_until TEXT)",
  "CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE COLLATE NOCASE, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), low_stock_threshold INTEGER NOT NULL DEFAULT 10, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE, name TEXT NOT NULL, duration_label TEXT, credit_cost INTEGER NOT NULL DEFAULT 1 CHECK(credit_cost >= 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, UNIQUE(server_id,name))",
  "CREATE TABLE IF NOT EXISTS code_batches (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id), package_id TEXT NOT NULL REFERENCES packages(id), filename TEXT, imported_by TEXT NOT NULL REFERENCES users(id), total_lines INTEGER NOT NULL DEFAULT 0, blank_count INTEGER NOT NULL DEFAULT 0, inserted_count INTEGER NOT NULL DEFAULT 0, duplicate_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS issue_orders (id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES users(id), server_id TEXT NOT NULL REFERENCES servers(id), package_id TEXT NOT NULL REFERENCES packages(id), customer_ref TEXT, quantity INTEGER NOT NULL CHECK(quantity > 0), unit_cost INTEGER NOT NULL CHECK(unit_cost >= 0), total_cost INTEGER NOT NULL CHECK(total_cost >= 0), credits_before INTEGER NOT NULL, credits_after INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','cancelled')), created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS codes (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id), package_id TEXT NOT NULL REFERENCES packages(id), batch_id TEXT NOT NULL REFERENCES code_batches(id), code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','issued','disabled')), reseller_id TEXT REFERENCES users(id), order_id TEXT REFERENCES issue_orders(id), customer_ref TEXT, issued_at TEXT, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS credit_transactions (id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, type TEXT NOT NULL, reference_id TEXT, note TEXT, admin_id TEXT REFERENCES users(id), balance_before INTEGER NOT NULL, balance_after INTEGER NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS credit_requests (id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL CHECK(amount > 0), note TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), admin_note TEXT, created_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT REFERENCES users(id))",
  "CREATE TABLE IF NOT EXISTS apps (id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT NOT NULL CHECK(platform IN ('android','windows','receiver','other')), version TEXT, description TEXT, image_url TEXT, download_url TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'all' CHECK(visibility IN ('all','admin','reseller')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), actor_role TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details_json TEXT, ip_hash TEXT, user_agent TEXT, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS tx_guards (id TEXT PRIMARY KEY, ok INTEGER NOT NULL CHECK(ok = 1))",
  "CREATE TABLE IF NOT EXISTS sharing_services (id TEXT PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT NOT NULL, slug TEXT NOT NULL UNIQUE COLLATE NOCASE, credit_cost INTEGER NOT NULL DEFAULT 1 CHECK(credit_cost >= 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sharing_batches (id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES sharing_services(id), filename TEXT, imported_by TEXT NOT NULL REFERENCES users(id), total_lines INTEGER NOT NULL DEFAULT 0, blank_count INTEGER NOT NULL DEFAULT 0, inserted_count INTEGER NOT NULL DEFAULT 0, duplicate_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sharing_orders (id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES users(id), service_id TEXT NOT NULL REFERENCES sharing_services(id), customer_ref TEXT, quantity INTEGER NOT NULL CHECK(quantity > 0), unit_cost INTEGER NOT NULL CHECK(unit_cost >= 0), total_cost INTEGER NOT NULL CHECK(total_cost >= 0), credits_before INTEGER NOT NULL, credits_after INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','cancelled')), created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sharing_codes (id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES sharing_services(id), batch_id TEXT NOT NULL REFERENCES sharing_batches(id), code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','issued','disabled')), reseller_id TEXT REFERENCES users(id), order_id TEXT REFERENCES sharing_orders(id), customer_ref TEXT, issued_at TEXT, created_at TEXT NOT NULL)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_sharing_codes_unique ON sharing_codes(code)",
  "CREATE INDEX IF NOT EXISTS idx_sharing_codes_stock ON sharing_codes(service_id,status,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_sharing_codes_reseller ON sharing_codes(reseller_id,issued_at)",
  "CREATE INDEX IF NOT EXISTS idx_sharing_orders_reseller ON sharing_orders(reseller_id,created_at)",
  "CREATE TRIGGER IF NOT EXISTS trg_sharing_code_service_lock BEFORE UPDATE OF service_id ON sharing_codes WHEN NEW.service_id<>OLD.service_id BEGIN SELECT RAISE(ABORT,'SHARING_SERVICE_IDENTITY_LOCKED'); END",
  "CREATE INDEX IF NOT EXISTS idx_codes_stock ON codes(server_id,package_id,status,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_codes_reseller ON codes(reseller_id,issued_at)",
  "CREATE INDEX IF NOT EXISTS idx_orders_reseller ON issue_orders(reseller_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_logs_actor ON audit_logs(actor_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_requests_status ON credit_requests(status,created_at)",
  "CREATE TRIGGER IF NOT EXISTS trg_codes_server_package_insert BEFORE INSERT ON codes BEGIN SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM packages p WHERE p.id=NEW.package_id AND p.server_id=NEW.server_id) THEN RAISE(ABORT,'CODE_SERVER_PACKAGE_MISMATCH') END; END",
  "CREATE TRIGGER IF NOT EXISTS trg_codes_identity_lock BEFORE UPDATE OF server_id,package_id ON codes WHEN NEW.server_id<>OLD.server_id OR NEW.package_id<>OLD.package_id BEGIN SELECT RAISE(ABORT,'CODE_SERVER_IDENTITY_LOCKED'); END",
  "CREATE TRIGGER IF NOT EXISTS trg_orders_server_package_insert BEFORE INSERT ON issue_orders BEGIN SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM packages p WHERE p.id=NEW.package_id AND p.server_id=NEW.server_id) THEN RAISE(ABORT,'ORDER_SERVER_PACKAGE_MISMATCH') END; END",
  "CREATE TRIGGER IF NOT EXISTS trg_packages_server_lock BEFORE UPDATE OF server_id ON packages WHEN NEW.server_id<>OLD.server_id BEGIN SELECT RAISE(ABORT,'PACKAGE_SERVER_IDENTITY_LOCKED'); END",
  "CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash)",
  "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
  "CREATE INDEX IF NOT EXISTS idx_users_parent_type_created ON users(parent_user_id,account_type,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status)",
  "CREATE INDEX IF NOT EXISTS idx_codes_server_status_created ON codes(server_id,status,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_codes_package_status ON codes(package_id,status)",
  "CREATE INDEX IF NOT EXISTS idx_codes_reseller_status_issued ON codes(reseller_id,status,issued_at)",
  "CREATE INDEX IF NOT EXISTS idx_sharing_codes_service_status_created ON sharing_codes(service_id,status,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_sharing_codes_reseller_status_issued ON sharing_codes(reseller_id,status,issued_at)",
  "CREATE INDEX IF NOT EXISTS idx_sharing_orders_service ON sharing_orders(service_id)",
  "CREATE INDEX IF NOT EXISTS idx_requests_reseller_status_created ON credit_requests(reseller_id,status,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_logs_created ON audit_logs(created_at)",
  "CREATE INDEX IF NOT EXISTS idx_apps_active_visibility_created ON apps(active,visibility,created_at)",
  "INSERT OR IGNORE INTO servers(id,name,slug,active,low_stock_threshold,sort_order,created_at) VALUES ('srv_marvel','Marvel','marvel',1,10,10,datetime('now')),('srv_nova','Nova','nova',1,10,20,datetime('now')),('srv_x','X','x',1,10,30,datetime('now')),('srv_spider','Spider','spider',1,10,40,datetime('now')),('srv_mh','MH','mh',1,10,50,datetime('now'))",
  "INSERT OR IGNORE INTO sharing_services(id,name_ar,name_en,slug,credit_cost,active,sort_order,created_at) VALUES ('shr_gosat_plus','جو سات بلس','GoSat Plus','gosat-plus',1,1,10,datetime('now')),('shr_nasher','ناشر عادي','Nasher','nasher',1,1,20,datetime('now')),('shr_nasher_pro_osn','ناشر برو OSN','Nasher Pro OSN','nasher-pro-osn',1,1,30,datetime('now')),('shr_nasher_pro_bein','ناشر برو beIN Sports','Nasher Pro beIN Sports','nasher-pro-bein',1,1,40,datetime('now'))"
];

function now(){ return new Date().toISOString(); }
function uid(prefix){ return prefix+'_'+crypto.randomUUID().replaceAll('-',''); }
function clean(v,max=160){ return String(v??'').trim().slice(0,max); }
function validUsername(v){ const s=String(v||'').trim(); return s.length>0 && s.length<=80; }
function slugify(v){ return clean(v,60).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

function securityHeaders(extra={}){
  return {
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY',
    'referrer-policy':'no-referrer',
    'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()',
    'cross-origin-opener-policy':'same-origin',
    'cross-origin-resource-policy':'same-origin',
    'content-security-policy':"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    ...extra
  };
}

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:securityHeaders({'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers})
  });
}

function randomToken(bytes=32){
  const a=new Uint8Array(bytes); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}

async function sha256(v){
  const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v)));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function hashPassword(password,salt,iterations=PASSWORD_ITERATIONS){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations},key,256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function equal(a,b){
  a=String(a??''); b=String(b??'');
  if(!a || a.length!==b.length) return false;
  let diff=0; for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

function cookieValue(request,name){
  for(const part of (request.headers.get('cookie')||'').split(';')){
    const [k,...v]=part.trim().split('=');
    if(k===name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function sessionCookie(token,maxAge=SESSION_HOURS*3600){
  return SESSION_COOKIE+'='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+maxAge;
}

async function bodyJson(request){ try{return await request.json();}catch{return {};} }

function turnstileEnabled(env){
  return Boolean(String(env.TURNSTILE_SITE_KEY||'').trim() && String(env.TURNSTILE_SECRET_KEY||'').trim());
}

async function verifyTurnstile(env,request,token){
  if(!turnstileEnabled(env)) return {success:true,configured:false};
  const response=String(token||'').trim();
  if(!response) return {success:false,configured:true};

  const form=new FormData();
  form.set('secret',String(env.TURNSTILE_SECRET_KEY));
  form.set('response',response);
  const remoteIp=request.headers.get('cf-connecting-ip');
  if(remoteIp) form.set('remoteip',remoteIp);

  try{
    const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',
      body:form
    }).then(r=>r.json());

    if(!result?.success) return {success:false,configured:true,errorCodes:result?.['error-codes']||[]};
    if(result.action && result.action!=='login') return {success:false,configured:true};
    const expectedHost=clean(env.TURNSTILE_HOSTNAME||'',255).toLowerCase();
    if(expectedHost && String(result.hostname||'').toLowerCase()!==expectedHost) return {success:false,configured:true};
    return {success:true,configured:true};
  }catch{
    return {success:false,configured:true};
  }
}

async function ipHash(request){
  return sha256(request.headers.get('cf-connecting-ip')||'unknown');
}

async function ensureSchema(env){
  if(schemaReady) return;
  await env.DB.batch(BASE_SCHEMA.map(sql=>env.DB.prepare(sql)));

  const cols=(await env.DB.prepare("PRAGMA table_info(users)").all()).results||[];
  if(!cols.some(c=>c.name==='email')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
  }
  if(!cols.some(c=>c.name==='must_change_password')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0").run();
  }
  if(!cols.some(c=>c.name==='last_credit_tx_id')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN last_credit_tx_id TEXT").run();
  }

  if(!cols.some(c=>c.name==='last_login_ip')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN last_login_ip TEXT").run();
  }
  if(!cols.some(c=>c.name==='last_country')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN last_country TEXT").run();
  }
  if(!cols.some(c=>c.name==='last_login_at')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN last_login_at TEXT").run();
  }
  if(!cols.some(c=>c.name==='account_type')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'reseller'").run();
  }
  if(!cols.some(c=>c.name==='parent_user_id')){
    await env.DB.prepare("ALTER TABLE users ADD COLUMN parent_user_id TEXT").run();
  }
  await env.DB.prepare("UPDATE users SET account_type='owner' WHERE role='admin' AND lower(username)='owner'").run();
  await env.DB.prepare("UPDATE users SET account_type='admin' WHERE role='admin' AND lower(username)<>'owner' AND (account_type IS NULL OR account_type='' OR account_type='reseller')").run();
  await env.DB.prepare("INSERT OR IGNORE INTO app_meta(key,value,updated_at) VALUES('balance_mode','currency',datetime('now')),('balance_currency','EGP',datetime('now'))").run();

  const appCols=(await env.DB.prepare("PRAGMA table_info(apps)").all()).results||[];
  if(!appCols.some(c=>c.name==='image_url')){
    await env.DB.prepare("ALTER TABLE apps ADD COLUMN image_url TEXT").run();
  }

  const duplicate=await env.DB.prepare("SELECT code,COUNT(*) c FROM codes GROUP BY code HAVING c>1 LIMIT 1").first();
  if(!duplicate){
    await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_codes_global_unique ON codes(code)").run();
  }
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email COLLATE NOCASE) WHERE email IS NOT NULL AND email<>''").run();
  schemaReady=true;
}

async function audit(env,request,actor,action,entityType=null,entityId=null,details={}){
  await env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .bind(uid('log'),actor?.id||null,actor?.role||null,action,entityType,entityId,JSON.stringify(details),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),now()).run();
}

async function createSession(env,request,userId){
  const token=randomToken(32), csrf=randomToken(24), at=now();
  const expires=new Date(Date.now()+SESSION_HOURS*3600*1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions(id,user_id,token_hash,csrf_token,expires_at,created_at,last_seen_at,ip_hash,user_agent) VALUES(?,?,?,?,?,?,?,?,?)")
    .bind(uid('ses'),userId,await sha256(token),csrf,expires,at,at,await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300)).run();
  return {token,csrf};
}

async function authUser(env,request){
  const token=cookieValue(request,SESSION_COOKIE);
  if(!token) return null;
  const row=await env.DB.prepare("SELECT s.id session_id,s.csrf_token,s.expires_at,s.user_agent,s.last_seen_at,u.id,u.username,u.email,u.display_name,u.role,u.account_type,u.parent_user_id,u.credits,u.must_change_password,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1")
    .bind(await sha256(token),now()).first();
  if(!row || row.status!=='active') return null;

  const ua=(request.headers.get('user-agent')||'').slice(0,300);
  if(row.user_agent && ua && row.user_agent!==ua){
    await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(row.session_id).run();
    return null;
  }

  const last=Date.parse(row.last_seen_at||0);
  if(!Number.isFinite(last) || Date.now()-last>5*60*1000){
    await env.DB.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").bind(now(),row.session_id).run();
  }
  return row;
}

function accountType(u){
  const stored=String(u?.account_type||'').toLowerCase();
  if(['owner','admin','agent','reseller'].includes(stored)) return stored;
  if(u?.role==='admin') return String(u?.username||'').toLowerCase()==='owner'?'owner':'admin';
  return 'reseller';
}

function publicUser(u){
  return {
    id:u.id,
    username:u.username,
    email:u.email||'',
    displayName:u.display_name,
    role:u.role,
    accountType:accountType(u),
    parentUserId:u.parent_user_id||null,
    credits:Number(u.credits||0),
    mustChangePassword:Number(u.must_change_password||0)===1
  };
}

async function getBalanceConfig(env){
  if(balanceConfigCache && Date.now()-balanceConfigCacheAt<60000) return balanceConfigCache;
  const rows=(await env.DB.prepare("SELECT key,value FROM app_meta WHERE key IN ('balance_mode','balance_currency')").all()).results||[];
  const map=Object.fromEntries(rows.map(r=>[r.key,r.value]));
  const mode=map.balance_mode==='credit'?'credit':'currency';
  const currency=['EGP','USD'].includes(String(map.balance_currency||'').toUpperCase())?String(map.balance_currency).toUpperCase():'EGP';
  balanceConfigCache={mode,currency,unit:mode==='credit'?'CREDIT':currency};
  balanceConfigCacheAt=Date.now();
  return balanceConfigCache;
}

function csrfOk(request,user){
  return Boolean(user && equal(request.headers.get('x-csrf-token')||'',user.csrf_token||''));
}

async function ensureBootstrapAdmin(env){
  const password=String(env.ADMIN_PASSWORD||'').trim();
  const existing=await env.DB.prepare("SELECT * FROM users WHERE role='admin' ORDER BY created_at LIMIT 1").first();
  const done=await env.DB.prepare("SELECT value FROM app_meta WHERE key='owner_bootstrap_v5'").first();

  if(done?.value==='done') return existing;
  if(!password) return existing;

  const username='owner';
  const salt=randomToken(18);
  const hash=await hashPassword(password,salt,PASSWORD_ITERATIONS);
  const at=now();
  let admin=existing;

  if(!admin){
    const id=uid('usr');
    await env.DB.prepare("INSERT INTO users(id,username,email,password_hash,password_salt,password_iterations,role,account_type,parent_user_id,display_name,credits,must_change_password,status,created_at,updated_at) VALUES(?,?,NULL,?,?,?,'admin','owner',NULL,'Owner',0,1,'active',?,?)")
      .bind(id,username,hash,salt,PASSWORD_ITERATIONS,at,at).run();
    admin=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
  }else{
    await env.DB.prepare("UPDATE users SET username='owner',password_hash=?,password_salt=?,password_iterations=?,must_change_password=1,status='active',updated_at=? WHERE id=?")
      .bind(hash,salt,PASSWORD_ITERATIONS,at,admin.id).run();
    await env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(admin.id).run();
    admin=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(admin.id).first();
  }

  await env.DB.prepare("DELETE FROM login_attempts").run();
  await env.DB.prepare("INSERT OR REPLACE INTO app_meta(key,value,updated_at) VALUES('owner_bootstrap_v5','done',?)").bind(at).run();
  return admin;
}

async function seedDemo(env,admin){
  if(!admin) return;
  const done=await env.DB.prepare("SELECT value FROM app_meta WHERE key='demo_seed_v2'").first();
  if(done?.value==='done') return;

  const items=[
    ['srv_marvel','marvel','MARVEL'],
    ['srv_nova','nova','NOVA'],
    ['srv_x','x','X'],
    ['srv_spider','spider','SPIDER'],
    ['srv_mh','mh','MH']
  ];

  for(const [serverId,slug,label] of items){
    const packageId='pkg_demo_'+slug+'_12m';
    const batchId='bat_demo_'+slug+'_200';
    const at=now();

    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO packages(id,server_id,name,duration_label,credit_cost,active,sort_order,created_at) VALUES(?,?,?,'12 Months',1,1,10,?)").bind(packageId,serverId,'12 Months',at),
      env.DB.prepare("INSERT OR IGNORE INTO code_batches(id,server_id,package_id,filename,imported_by,total_lines,blank_count,inserted_count,duplicate_count,created_at) VALUES(?,?,?,?,?,200,0,0,0,?)").bind(batchId,serverId,packageId,'DEMO-SEED-200.txt',admin.id,at)
    ]);

    const stmts=[];
    for(let start=1;start<=200;start+=16){
      const nums=[];
      for(let i=start;i<start+16&&i<=200;i++) nums.push(i);
      const params=[];
      for(const i of nums){
        const n=String(i).padStart(4,'0');
        params.push('cod_demo_'+slug+'_'+n,serverId,packageId,batchId,label+'-DEMO-'+n,at);
      }
      stmts.push(env.DB.prepare("INSERT OR IGNORE INTO codes(id,server_id,package_id,batch_id,code,created_at) VALUES "+nums.map(()=>"(?,?,?,?,?,?)").join(',')).bind(...params));
    }
    for(let i=0;i<stmts.length;i+=20) await env.DB.batch(stmts.slice(i,i+20));

    await env.DB.prepare("UPDATE code_batches SET inserted_count=(SELECT COUNT(*) FROM codes WHERE batch_id=?),duplicate_count=200-(SELECT COUNT(*) FROM codes WHERE batch_id=?) WHERE id=?")
      .bind(batchId,batchId,batchId).run();
  }

  await env.DB.prepare("INSERT OR REPLACE INTO app_meta(key,value,updated_at) VALUES('demo_seed_v2','done',?)").bind(now()).run();
}

async function stock(env){
  const servers=(await env.DB.prepare("SELECT s.id,s.name,s.slug,s.active,s.low_stock_threshold,s.sort_order,COUNT(c.id) total_codes,COALESCE(SUM(CASE WHEN c.status='available' THEN 1 ELSE 0 END),0) available_codes,COALESCE(SUM(CASE WHEN c.status='issued' THEN 1 ELSE 0 END),0) issued_codes FROM servers s LEFT JOIN codes c ON c.server_id=s.id GROUP BY s.id ORDER BY s.sort_order,s.name").all()).results||[];
  const packages=(await env.DB.prepare("SELECT p.id,p.server_id,p.name,p.duration_label,p.credit_cost,p.active,p.sort_order,COUNT(c.id) total_codes,COALESCE(SUM(CASE WHEN c.status='available' THEN 1 ELSE 0 END),0) available_codes,COALESCE(SUM(CASE WHEN c.status='issued' THEN 1 ELSE 0 END),0) issued_codes FROM packages p LEFT JOIN codes c ON c.package_id=p.id GROUP BY p.id ORDER BY p.server_id,p.sort_order,p.name").all()).results||[];
  return {servers,packages};
}

async function resellerCatalog(env){
  const servers=(await env.DB.prepare("SELECT s.id,s.name,s.slug,s.active,s.sort_order,p.id package_id,p.credit_cost FROM servers s JOIN packages p ON p.server_id=s.id AND p.active=1 WHERE s.active=1 GROUP BY s.id ORDER BY s.sort_order,s.name").all()).results||[];
  return {
    servers:servers.map(s=>({
      id:s.id,
      name:s.name,
      slug:s.slug,
      active:Number(s.active),
      sort_order:Number(s.sort_order||0),
      package_id:s.package_id,
      credit_cost:Number(s.credit_cost||0)
    })),
    packages:servers.map(s=>({
      id:s.package_id,
      server_id:s.id,
      name:'سنوي',
      duration_label:'12 Months',
      credit_cost:Number(s.credit_cost||0),
      active:1
    }))
  };
}

async function login(request,env){
  const body=await bodyJson(request);
  const identifier=clean(body.identifier||body.username,120);
  const password=String(body.password||'');
  if(!identifier || !password || password.length>256) return json({error:'INVALID_LOGIN'},401);

  if(turnstileEnabled(env)){
    const verification=await verifyTurnstile(env,request,body.turnstileToken);
    if(!verification.success) return json({error:'TURNSTILE_FAILED'},403);
  }

  const key=await sha256(identifier.toLowerCase()+'|'+(request.headers.get('cf-connecting-ip')||'unknown'));
  const gate=await env.DB.prepare("SELECT * FROM login_attempts WHERE key=?").bind(key).first();
  if(gate?.blocked_until && gate.blocked_until>now()) return json({error:'TOO_MANY_ATTEMPTS'},429);

  const user=await env.DB.prepare("SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE LIMIT 1").bind(identifier,identifier).first();
  const computed=user ? await hashPassword(password,user.password_salt,Number(user.password_iterations)) : await hashPassword(password,'invalid-user-salt',PASSWORD_ITERATIONS);
  const ok=Boolean(user && user.status==='active' && equal(computed,user.password_hash));

  if(!ok){
    const current=Date.now();
    let attempts=1, started=now();
    if(gate && current-Date.parse(gate.window_started_at)<15*60*1000){
      attempts=Number(gate.attempts||0)+1;
      started=gate.window_started_at;
    }
    const blocked=attempts>=5?new Date(current+15*60*1000).toISOString():null;
    await env.DB.prepare("INSERT INTO login_attempts(key,attempts,window_started_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until")
      .bind(key,attempts,started,blocked).run();
    return json({error:'INVALID_LOGIN'},401);
  }

  await env.DB.prepare("DELETE FROM login_attempts WHERE key=?").bind(key).run();
  const loginIp=clean(request.headers.get('cf-connecting-ip')||'',64);
  const loginCountry=clean(request.headers.get('cf-ipcountry')||'',8).toUpperCase();
  const loginAt=now();
  await env.DB.prepare("UPDATE users SET last_login_ip=?,last_country=?,last_login_at=?,updated_at=? WHERE id=?")
    .bind(loginIp||null,loginCountry||null,loginAt,loginAt,user.id).run();
  const session=await createSession(env,request,user.id);
  await audit(env,request,user,'LOGIN_SUCCESS','session',null,{mode:'db',country:loginCountry||null});
  return json({user:publicUser(user),csrf:session.csrf},200,{'set-cookie':sessionCookie(session.token)});
}

async function api(request,env){
  await ensureSchema(env);
  if(!runtimeBootstrapReady){
    const bootAdmin=await ensureBootstrapAdmin(env);
    if(bootAdmin) await seedDemo(env,bootAdmin);
    runtimeBootstrapReady=true;
  }
  const url=new URL(request.url), path=url.pathname, method=request.method.toUpperCase();

  if(method!=='GET' && method!=='HEAD'){
    const origin=request.headers.get('origin');
    const fetchSite=(request.headers.get('sec-fetch-site')||'').toLowerCase();
    if(origin!==url.origin) return json({error:'ORIGIN_NOT_ALLOWED'},403);
    if(fetchSite==='cross-site') return json({error:'CROSS_SITE_NOT_ALLOWED'},403);
  }

  if(path==='/api/health'){
    return json({
      ok:true,
      service:'ACTIVE CODE MULTI',
      version:'worker-turnstile-i18n-v9'
    });
  }

  if(path==='/api/public-config' && method==='GET'){
    return json({
      turnstile:{
        enabled:turnstileEnabled(env),
        siteKey:turnstileEnabled(env)?String(env.TURNSTILE_SITE_KEY):''
      }
    });
  }

  if(path==='/api/login' && method==='POST') return login(request,env);

  const user=await authUser(env,request);

  if(path==='/api/logout' && method==='POST'){
    if(user && csrfOk(request,user)){
      await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(user.session_id).run();
      await audit(env,request,user,'LOGOUT','session',user.session_id,{});
    }
    return json({ok:true},200,{'set-cookie':sessionCookie('',0)});
  }

  if(!user) return json({error:'UNAUTHORIZED'},401);
  if(method!=='GET' && method!=='HEAD' && !csrfOk(request,user)) return json({error:'CSRF'},403);

  if(path==='/api/balance-config' && method==='GET'){
    return json({balanceConfig:await getBalanceConfig(env)});
  }

  if(path==='/api/admin/balance-config' && method==='POST'){
    if(user.role!=='admin') return json({error:'ADMIN_ONLY'},403);
    const body=await bodyJson(request);
    const mode=body.mode==='credit'?'credit':body.mode==='currency'?'currency':'';
    const currency=['EGP','USD'].includes(String(body.currency||'').toUpperCase())?String(body.currency).toUpperCase():'EGP';
    if(!mode) return json({error:'INVALID_BALANCE_MODE'},400);
    const at=now();
    await env.DB.prepare("INSERT OR REPLACE INTO app_meta(key,value,updated_at) VALUES('balance_mode',?,?)").bind(mode,at).run();
    await env.DB.prepare("INSERT OR REPLACE INTO app_meta(key,value,updated_at) VALUES('balance_currency',?,?)").bind(currency,at).run();
    await audit(env,request,user,'BALANCE_MODE_CHANGED','settings','balance',{mode,currency});
    balanceConfigCache={mode,currency,unit:mode==='credit'?'CREDIT':currency};
    balanceConfigCacheAt=Date.now();
    return json({ok:true,balanceConfig:balanceConfigCache});
  }

  if(path==='/api/sharing' && method==='GET'){
    if(user.role==='admin'){
      const services=(await env.DB.prepare("SELECT s.id,s.name_ar,s.name_en,s.slug,s.credit_cost,s.active,s.sort_order,COUNT(c.id) total_codes,COALESCE(SUM(CASE WHEN c.status='available' THEN 1 ELSE 0 END),0) available_codes,COALESCE(SUM(CASE WHEN c.status='issued' THEN 1 ELSE 0 END),0) issued_codes FROM sharing_services s LEFT JOIN sharing_codes c ON c.service_id=s.id GROUP BY s.id ORDER BY s.sort_order,s.name_en").all()).results||[];
      const codes=(await env.DB.prepare("SELECT c.id,c.code,c.customer_ref,c.issued_at,c.order_id,s.name_ar service_name_ar,s.name_en service_name_en,u.username reseller_username,u.display_name reseller_name,o.quantity,o.unit_cost,o.total_cost,o.credits_before,o.credits_after,b.filename batch_filename FROM sharing_codes c JOIN sharing_services s ON s.id=c.service_id JOIN users u ON u.id=c.reseller_id JOIN sharing_orders o ON o.id=c.order_id JOIN sharing_batches b ON b.id=c.batch_id WHERE c.status='issued' ORDER BY c.issued_at DESC LIMIT 100").all()).results||[];
      return json({services,codes,balanceConfig:await getBalanceConfig(env)});
    }

    const services=(await env.DB.prepare("SELECT id,name_ar,name_en,slug,credit_cost,active,sort_order FROM sharing_services WHERE active=1 ORDER BY sort_order,name_en").all()).results||[];
    const codes=(await env.DB.prepare("SELECT c.id,c.code,c.customer_ref,c.issued_at,c.order_id,s.name_ar service_name_ar,s.name_en service_name_en,o.quantity,o.unit_cost,o.total_cost FROM sharing_codes c JOIN sharing_services s ON s.id=c.service_id LEFT JOIN sharing_orders o ON o.id=c.order_id WHERE c.reseller_id=? AND c.status='issued' ORDER BY c.issued_at DESC LIMIT 100").bind(user.id).all()).results||[];
    const wallet=await env.DB.prepare("SELECT credits FROM users WHERE id=? LIMIT 1").bind(user.id).first();
    return json({services,codes,balance:Number(wallet?.credits||0),balanceConfig:await getBalanceConfig(env)});
  }

  if(path==='/api/sharing/issue' && method==='POST'){
    if(user.role!=='reseller') return json({error:'RESELLER_ONLY'},403);

    const body=await bodyJson(request);
    const serviceId=clean(body.serviceId,80);
    const customerRef=clean(body.customerRef,120);
    const quantity=Math.trunc(Number(body.quantity||1));
    if(!serviceId||quantity<1||quantity>100) return json({error:'INVALID_ISSUE_REQUEST'},400);

    const service=await env.DB.prepare("SELECT * FROM sharing_services WHERE id=? AND active=1 LIMIT 1").bind(serviceId).first();
    if(!service) return json({error:'SHARING_SERVICE_NOT_FOUND'},404);

    const fresh=await env.DB.prepare("SELECT id,credits,status FROM users WHERE id=? AND role='reseller'").bind(user.id).first();
    const total=Number(service.credit_cost)*quantity;
    if(!fresh||fresh.status!=='active'||Number(fresh.credits)<total) return json({error:'INSUFFICIENT_CREDIT'},409);

    const candidates=(await env.DB.prepare("SELECT id,code FROM sharing_codes WHERE service_id=? AND status='available' ORDER BY created_at,id LIMIT ?")
      .bind(serviceId,quantity).all()).results||[];
    if(candidates.length<quantity) return json({error:'INSUFFICIENT_STOCK'},409);

    const orderId=uid('sord'), txId=uid('ctx'), at=now();
    const before=Number(fresh.credits), after=before-total;
    const codeIds=candidates.map(c=>c.id);
    const idSlots=codeIds.map(()=>'?').join(',');

    try{
      const batch=await env.DB.batch([
        env.DB.prepare("INSERT INTO sharing_orders(id,reseller_id,service_id,customer_ref,quantity,unit_cost,total_cost,credits_before,credits_after,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,'completed',?)")
          .bind(orderId,user.id,serviceId,customerRef,quantity,Number(service.credit_cost),total,before,after,at),

        env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=?,updated_at=? WHERE id=? AND credits=? AND credits>=? AND status='active'")
          .bind(after,txId,at,user.id,before,total),

        env.DB.prepare("UPDATE sharing_codes SET status='issued',reseller_id=?,order_id=?,customer_ref=?,issued_at=? WHERE id IN ("+idSlots+") AND service_id=? AND status='available'")
          .bind(user.id,orderId,customerRef,at,...codeIds,serviceId),

        env.DB.prepare("INSERT INTO credit_transactions(id,reseller_id,amount,type,reference_id,note,balance_before,balance_after,created_at) SELECT ?,?,?,'sharing_issue',?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND last_credit_tx_id=? AND credits=?)")
          .bind(txId,user.id,-total,orderId,'Sharing code issue: '+service.name_en,before,after,at,user.id,txId,after)
      ]);

      const creditChanges=Number(batch?.[1]?.meta?.changes||0);
      const codeChanges=Number(batch?.[2]?.meta?.changes||0);
      const exactCount=await env.DB.prepare("SELECT COUNT(*) count FROM sharing_codes WHERE order_id=? AND reseller_id=? AND service_id=? AND status='issued'")
        .bind(orderId,user.id,serviceId).first();
      const wrongCount=await env.DB.prepare("SELECT COUNT(*) count FROM sharing_codes WHERE order_id=? AND reseller_id=? AND service_id<>?")
        .bind(orderId,user.id,serviceId).first();

      if(creditChanges!==1||codeChanges!==quantity||Number(exactCount?.count||0)!==quantity||Number(wrongCount?.count||0)!==0){
        if(creditChanges===1){
          await env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=NULL,updated_at=? WHERE id=? AND credits=? AND last_credit_tx_id=?")
            .bind(before,now(),user.id,after,txId).run();
        }
        await env.DB.prepare("UPDATE sharing_codes SET status='available',reseller_id=NULL,order_id=NULL,customer_ref=NULL,issued_at=NULL WHERE order_id=? AND reseller_id=?")
          .bind(orderId,user.id).run();
        await env.DB.prepare("DELETE FROM credit_transactions WHERE id=?").bind(txId).run();
        await env.DB.prepare("DELETE FROM sharing_orders WHERE id=?").bind(orderId).run();
        return json({error:'ISSUE_CONFLICT_RETRY'},409);
      }

      await audit(env,request,user,'SHARING_CODES_ISSUED','sharing_order',orderId,{
        serviceId,
        service:service.name_en,
        quantity,
        totalCost:total,
        customerRef,
        serviceLocked:true
      });

      return json({
        ok:true,
        order:{
          id:orderId,
          serviceId,
          serviceAr:service.name_ar,
          serviceEn:service.name_en,
          quantity,
          unitCost:Number(service.credit_cost),
          totalCost:total,
          creditsBefore:before,
          creditsAfter:after,
          customerRef,
          createdAt:at
        },
        codes:candidates.map(c=>({id:c.id,code:c.code}))
      });
    }catch(error){
      console.error('SHARING_ISSUE_FAILED',String(error?.message||error));
      try{
        await env.DB.prepare("UPDATE sharing_codes SET status='available',reseller_id=NULL,order_id=NULL,customer_ref=NULL,issued_at=NULL WHERE order_id=? AND reseller_id=?")
          .bind(orderId,user.id).run();
        await env.DB.prepare("DELETE FROM credit_transactions WHERE id=?").bind(txId).run();
        await env.DB.prepare("DELETE FROM sharing_orders WHERE id=?").bind(orderId).run();
      }catch{}
      return json({error:'ISSUE_CONFLICT_RETRY'},409);
    }
  }


  if(path==='/api/admin/change-password' && method==='POST'){
    if(user.role!=='admin') return json({error:'ADMIN_ONLY'},403);
    const body=await bodyJson(request);
    const currentPassword=String(body.currentPassword||'');
    const newPassword=String(body.newPassword||'');
    if(newPassword.length<12) return json({error:'PASSWORD_TOO_SHORT'},400);

    const dbUser=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(user.id).first();
    const currentHash=await hashPassword(currentPassword,dbUser.password_salt,Number(dbUser.password_iterations));
    if(!equal(currentHash,dbUser.password_hash)) return json({error:'CURRENT_PASSWORD_WRONG'},403);

    const salt=randomToken(18);
    const at=now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=? WHERE id=?")
        .bind(await hashPassword(newPassword,salt),salt,PASSWORD_ITERATIONS,at,user.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").bind(user.id,user.session_id),
      env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(uid('log'),user.id,user.role,'ADMIN_PASSWORD_CHANGED','user',user.id,JSON.stringify({forced:Boolean(user.must_change_password)}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
    ]);
    return json({ok:true});
  }

  if(Number(user.must_change_password||0)===1 && path!=='/api/me'){
    return json({error:'PASSWORD_CHANGE_REQUIRED'},403);
  }

  if(path==='/api/me' && method==='GET'){
    const token=cookieValue(request,SESSION_COOKIE);
    const at=now();
    const expires=new Date(Date.now()+SESSION_HOURS*3600*1000).toISOString();
    await env.DB.prepare("UPDATE sessions SET last_seen_at=?,expires_at=? WHERE id=?").bind(at,expires,user.session_id).run();
    return json({user:publicUser(user),csrf:user.csrf_token},200,{'set-cookie':sessionCookie(token)});
  }

  if(path==='/api/profile' && method==='GET'){
    const row=await env.DB.prepare("SELECT id,username,email,display_name,role,account_type,parent_user_id,credits,status,last_login_ip,last_country,last_login_at,created_at,updated_at FROM users WHERE id=? LIMIT 1").bind(user.id).first();
    if(!row) return json({error:'USER_NOT_FOUND'},404);
    return json({profile:{
      id:row.id,
      username:row.username,
      email:row.email||'',
      displayName:row.display_name||row.username,
      role:row.role,
      accountType:accountType(row),
      parentUserId:row.parent_user_id||null,
      credits:Number(row.credits||0),
      status:row.status,
      lastLoginIp:row.last_login_ip||'',
      lastCountry:row.last_country||'',
      lastLoginAt:row.last_login_at||null,
      createdAt:row.created_at||null,
      updatedAt:row.updated_at||null
    }});
  }

  if(path==='/api/change-password' && method==='POST'){
    const body=await bodyJson(request);
    const currentPassword=String(body.currentPassword||'');
    const newPassword=String(body.newPassword||'');
    if(!currentPassword || !newPassword || newPassword.length>256) return json({error:'INVALID_PASSWORD'},400);

    const dbUser=await env.DB.prepare("SELECT * FROM users WHERE id=? LIMIT 1").bind(user.id).first();
    if(!dbUser) return json({error:'USER_NOT_FOUND'},404);
    const currentHash=await hashPassword(currentPassword,dbUser.password_salt,Number(dbUser.password_iterations));
    if(!equal(currentHash,dbUser.password_hash)) return json({error:'CURRENT_PASSWORD_WRONG'},403);

    const salt=randomToken(18);
    const at=now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=? WHERE id=?")
        .bind(await hashPassword(newPassword,salt),salt,PASSWORD_ITERATIONS,at,user.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").bind(user.id,user.session_id),
      env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(uid('log'),user.id,user.role,'PASSWORD_CHANGED','user',user.id,JSON.stringify({selfService:true}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
    ]);
    return json({ok:true});
  }
  if(path==='/api/servers' && method==='GET'){
    return json(user.role==='admin' ? await stock(env) : await resellerCatalog(env));
  }

  if(path==='/api/apps' && method==='GET'){
    const rows=(await env.DB.prepare("SELECT id,name,platform,version,description,image_url,download_url,visibility,created_at FROM apps WHERE active=1 AND (visibility='all' OR visibility=?) ORDER BY created_at DESC LIMIT 100").bind(user.role).all()).results||[];
    return json({apps:rows});
  }

  if(path==='/api/dashboard' && method==='GET'){
    if(user.role==='admin'){
      const counts=await env.DB.prepare("SELECT (SELECT COUNT(*) FROM users WHERE role='reseller') resellers,(SELECT COUNT(*) FROM codes) total_codes,(SELECT COUNT(*) FROM codes WHERE status='available') available,(SELECT COUNT(*) FROM codes WHERE status='issued') issued,(SELECT COUNT(*) FROM packages WHERE active=1) active_packages,(SELECT COALESCE(SUM(credits),0) FROM users WHERE role='reseller') reseller_credits,(SELECT COUNT(*) FROM credit_requests WHERE status='pending') pending_requests").first();
      return json({counts,balanceConfig:await getBalanceConfig(env)});
    }
    const counts=await env.DB.prepare("SELECT (SELECT COUNT(*) FROM codes WHERE reseller_id=? AND status='issued') main_issued,(SELECT COUNT(*) FROM sharing_codes WHERE reseller_id=? AND status='issued') sharing_issued,((SELECT COUNT(*) FROM codes WHERE reseller_id=? AND status='issued')+(SELECT COUNT(*) FROM sharing_codes WHERE reseller_id=? AND status='issued')) issued,(SELECT COUNT(*) FROM credit_requests WHERE reseller_id=? AND status='pending') pending_requests").bind(user.id,user.id,user.id,user.id,user.id).first();
    return json({user:publicUser(user),counts,balanceConfig:await getBalanceConfig(env)});
  }

  if(path==='/api/my-codes' && method==='GET'){
    const rows=(await env.DB.prepare("SELECT c.id,c.code,c.customer_ref,c.issued_at,c.order_id,s.name server_name,p.name package_name,p.duration_label,o.quantity,o.unit_cost,o.total_cost FROM codes c JOIN servers s ON s.id=c.server_id JOIN packages p ON p.id=c.package_id LEFT JOIN issue_orders o ON o.id=c.order_id WHERE c.reseller_id=? AND c.status='issued' ORDER BY c.issued_at DESC LIMIT 100").bind(user.id).all()).results||[];
    return json({codes:rows});
  }

  if(path==='/api/logs' && method==='GET'){
    const rows=user.role==='admin'
      ? (await env.DB.prepare("SELECT l.*,u.username actor_username,u.display_name actor_name FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.created_at DESC LIMIT 80").all()).results||[]
      : (await env.DB.prepare("SELECT action,entity_type,entity_id,details_json,created_at FROM audit_logs WHERE actor_id=? ORDER BY created_at DESC LIMIT 200").bind(user.id).all()).results||[];
    return json({logs:rows});
  }

  if(path==='/api/credit-requests' && method==='GET'){
    const rows=user.role==='admin'
      ? (await env.DB.prepare("SELECT r.*,u.username,u.display_name FROM credit_requests r JOIN users u ON u.id=r.reseller_id ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 100").all()).results||[]
      : (await env.DB.prepare("SELECT * FROM credit_requests WHERE reseller_id=? ORDER BY created_at DESC LIMIT 100").bind(user.id).all()).results||[];
    return json({requests:rows});
  }

  if(path==='/api/credit-requests' && method==='POST'){
    if(user.role!=='reseller') return json({error:'RESELLER_ONLY'},403);
    const body=await bodyJson(request), amount=Math.trunc(Number(body.amount));
    if(!Number.isSafeInteger(amount)||amount<=0) return json({error:'INVALID_AMOUNT'},400);
    const id=uid('crq');
    await env.DB.prepare("INSERT INTO credit_requests(id,reseller_id,amount,note,status,created_at) VALUES(?,?,?,?,'pending',?)").bind(id,user.id,amount,clean(body.note,300),now()).run();
    await audit(env,request,user,'CREDIT_REQUEST_CREATED','credit_request',id,{amount});
    return json({ok:true,id},201);
  }

  if(path==='/api/issue' && method==='POST'){
    if(user.role!=='reseller') return json({error:'RESELLER_ONLY'},403);
    const body=await bodyJson(request);
    const serverId=clean(body.serverId,80), customerRef=clean(body.customerRef,120);
    const quantity=Math.trunc(Number(body.quantity||1));
    if(!serverId||quantity<1||quantity>100) return json({error:'INVALID_ISSUE_REQUEST'},400);

    const pack=await env.DB.prepare("SELECT p.*,s.name server_name FROM packages p JOIN servers s ON s.id=p.server_id WHERE p.server_id=? AND p.active=1 AND s.active=1 ORDER BY p.sort_order,p.created_at LIMIT 1").bind(serverId).first();
    if(!pack) return json({error:'SERVER_PACKAGE_MISMATCH'},409);
    const packageId=pack.id;

    const fresh=await env.DB.prepare("SELECT id,credits,status FROM users WHERE id=? AND role='reseller'").bind(user.id).first();
    const total=Number(pack.credit_cost)*quantity;
    if(!fresh||fresh.status!=='active'||Number(fresh.credits)<total) return json({error:'INSUFFICIENT_CREDIT'},409);

    const candidates=(await env.DB.prepare("SELECT c.id,c.code FROM codes c JOIN packages p ON p.id=c.package_id WHERE c.server_id=? AND c.package_id=? AND p.server_id=? AND c.status='available' ORDER BY c.created_at,c.id LIMIT ?")
      .bind(serverId,packageId,serverId,quantity).all()).results||[];
    if(candidates.length<quantity) return json({error:'INSUFFICIENT_STOCK'},409);

    const orderId=uid('ord'), txId=uid('ctx'), at=now();
    const before=Number(fresh.credits), after=before-total;
    const codeIds=candidates.map(c=>c.id);
    const idSlots=codeIds.map(()=>'?').join(',');

    try{
      const batch=await env.DB.batch([
        env.DB.prepare("INSERT INTO issue_orders(id,reseller_id,server_id,package_id,customer_ref,quantity,unit_cost,total_cost,credits_before,credits_after,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'completed',?)")
          .bind(orderId,user.id,serverId,packageId,customerRef,quantity,Number(pack.credit_cost),total,before,after,at),

        env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=?,updated_at=? WHERE id=? AND credits=? AND credits>=? AND status='active'")
          .bind(after,txId,at,user.id,before,total),

        env.DB.prepare("UPDATE codes SET status='issued',reseller_id=?,order_id=?,customer_ref=?,issued_at=? WHERE id IN ("+idSlots+") AND status='available'")
          .bind(user.id,orderId,customerRef,at,...codeIds),

        env.DB.prepare("INSERT INTO credit_transactions(id,reseller_id,amount,type,reference_id,note,balance_before,balance_after,created_at) SELECT ?,?,?,'issue',?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND last_credit_tx_id=? AND credits=?)")
          .bind(txId,user.id,-total,orderId,'Code issue: '+pack.server_name+' / '+pack.name,before,after,at,user.id,txId,after)
      ]);

      const creditChanges=Number(batch?.[1]?.meta?.changes||0);
      const codeChanges=Number(batch?.[2]?.meta?.changes||0);
      const exactServerCount=await env.DB.prepare("SELECT COUNT(*) count FROM codes WHERE order_id=? AND reseller_id=? AND server_id=? AND package_id=? AND status='issued'")
        .bind(orderId,user.id,serverId,packageId).first();
      const wrongServerCount=await env.DB.prepare("SELECT COUNT(*) count FROM codes WHERE order_id=? AND reseller_id=? AND (server_id<>? OR package_id<>?)")
        .bind(orderId,user.id,serverId,packageId).first();

      if(creditChanges!==1 || codeChanges!==quantity || Number(exactServerCount?.count||0)!==quantity || Number(wrongServerCount?.count||0)!==0){
        if(creditChanges===1){
          await env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=NULL,updated_at=? WHERE id=? AND credits=? AND last_credit_tx_id=?")
            .bind(before,now(),user.id,after,txId).run();
        }
        await env.DB.prepare("UPDATE codes SET status='available',reseller_id=NULL,order_id=NULL,customer_ref=NULL,issued_at=NULL WHERE order_id=? AND reseller_id=?")
          .bind(orderId,user.id).run();
        await env.DB.prepare("DELETE FROM credit_transactions WHERE id=?").bind(txId).run();
        await env.DB.prepare("DELETE FROM issue_orders WHERE id=?").bind(orderId).run();
        return json({error:'ISSUE_CONFLICT_RETRY'},409);
      }

      try{
        await audit(env,request,user,'CODES_ISSUED','issue_order',orderId,{serverId,packageId,quantity,totalCost:total,customerRef,serverLocked:true});
      }catch(logError){
        console.error('ISSUE_AUDIT_FAILED',String(logError?.message||logError));
      }

      return json({
        ok:true,
        order:{id:orderId,server:pack.server_name,package:pack.name,quantity,unitCost:Number(pack.credit_cost),totalCost:total,creditsBefore:before,creditsAfter:after,customerRef,createdAt:at},
        codes:candidates.map(c=>({id:c.id,code:c.code}))
      });
    }catch(error){
      console.error('ISSUE_TRANSACTION_FAILED',String(error?.message||error));
      try{
        await env.DB.prepare("UPDATE codes SET status='available',reseller_id=NULL,order_id=NULL,customer_ref=NULL,issued_at=NULL WHERE order_id=? AND reseller_id=?")
          .bind(orderId,user.id).run();
        await env.DB.prepare("DELETE FROM credit_transactions WHERE id=?").bind(txId).run();
        await env.DB.prepare("DELETE FROM issue_orders WHERE id=?").bind(orderId).run();
      }catch{}
      return json({error:'ISSUE_CONFLICT_RETRY'},409);
    }
  }

  if(path==='/api/team/resellers' && method==='GET'){
    if(accountType(user)!=='agent') return json({error:'AGENT_ONLY'},403);
    const rows=(await env.DB.prepare("SELECT u.id,u.username,u.email,u.display_name,u.credits,u.status,u.account_type,u.parent_user_id,u.last_login_ip,u.last_country,u.last_login_at,u.created_at,u.updated_at,((SELECT COUNT(*) FROM codes c WHERE c.reseller_id=u.id AND c.status='issued')+(SELECT COUNT(*) FROM sharing_codes sc WHERE sc.reseller_id=u.id AND sc.status='issued')) issued_codes FROM users u WHERE u.role='reseller' AND u.parent_user_id=? ORDER BY u.created_at DESC LIMIT 200").bind(user.id).all()).results||[];
    return json({resellers:rows});
  }

  if(path==='/api/team/resellers' && method==='POST'){
    if(accountType(user)!=='agent') return json({error:'AGENT_ONLY'},403);
    const body=await bodyJson(request);
    const username=clean(body.username,80), email=clean(body.email,120).toLowerCase(), password=String(body.password||'');
    const displayName=clean(body.displayName,80)||username;
    const credits=Math.max(0,Math.trunc(Number(body.credits||0)));
    if(!validUsername(username)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||password.length<1||password.length>256||!Number.isSafeInteger(credits)) return json({error:'INVALID_RESELLER'},400);

    const freshAgent=await env.DB.prepare("SELECT id,credits,status FROM users WHERE id=? AND role='reseller' AND account_type='agent'").bind(user.id).first();
    if(!freshAgent||freshAgent.status!=='active'||Number(freshAgent.credits)<credits) return json({error:'INSUFFICIENT_CREDIT'},409);

    const salt=randomToken(18), id=uid('usr'), at=now(), before=Number(freshAgent.credits), after=before-credits;
    try{
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users(id,username,email,password_hash,password_salt,password_iterations,role,account_type,parent_user_id,display_name,credits,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'reseller','reseller',?,?,?,'active',?,?)")
          .bind(id,username,email||null,await hashPassword(password,salt),salt,PASSWORD_ITERATIONS,user.id,displayName,credits,at,at),
        env.DB.prepare("UPDATE users SET credits=?,updated_at=? WHERE id=? AND credits=? AND account_type='agent'").bind(after,at,user.id,before),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
          .bind(uid('log'),user.id,user.role,'RESELLER_CREATED_BY_AGENT','user',id,JSON.stringify({username,displayName,initialBalance:credits,parentUserId:user.id}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
      ]);
      return json({ok:true,id,balanceAfter:after},201);
    }catch{
      return json({error:'ACCOUNT_EXISTS'},409);
    }
  }

  if(user.role!=='admin') return json({error:'ADMIN_ONLY'},403);

  if(path==='/api/admin/sharing/services' && method==='GET'){
    const services=(await env.DB.prepare("SELECT s.id,s.name_ar,s.name_en,s.slug,s.credit_cost,s.active,s.sort_order,s.created_at,COUNT(c.id) total_codes,COALESCE(SUM(CASE WHEN c.status='available' THEN 1 ELSE 0 END),0) available_codes,COALESCE(SUM(CASE WHEN c.status='issued' THEN 1 ELSE 0 END),0) issued_codes,(SELECT COUNT(*) FROM sharing_orders o WHERE o.service_id=s.id) total_orders FROM sharing_services s LEFT JOIN sharing_codes c ON c.service_id=s.id GROUP BY s.id ORDER BY CASE s.active WHEN 1 THEN 0 ELSE 1 END,s.sort_order,s.name_en").all()).results||[];
    return json({services,balanceConfig:await getBalanceConfig(env)});
  }

  if(path==='/api/admin/sharing/services' && method==='POST'){
    const body=await bodyJson(request);
    const operation=['add','update','delete'].includes(body.operation)?body.operation:'';
    if(!operation) return json({error:'INVALID_SHARING_SERVICE_OPERATION'},400);

    if(operation==='add'){
      const nameAr=clean(body.nameAr,100), nameEn=clean(body.nameEn,100);
      const cost=Math.max(0,Math.trunc(Number(body.creditCost??0)));
      const sortOrder=Math.trunc(Number(body.sortOrder||100));
      const slug=slugify(body.slug||nameEn||nameAr);
      if(!nameAr||!nameEn||!slug||!Number.isSafeInteger(cost)||!Number.isSafeInteger(sortOrder)) return json({error:'INVALID_SHARING_SERVICE'},400);
      const id=uid('shr'), at=now();
      try{
        await env.DB.prepare("INSERT INTO sharing_services(id,name_ar,name_en,slug,credit_cost,active,sort_order,created_at) VALUES(?,?,?,?,?,1,?,?)")
          .bind(id,nameAr,nameEn,slug,cost,sortOrder,at).run();
        await audit(env,request,user,'SHARING_SERVICE_CREATED','sharing_service',id,{nameAr,nameEn,slug,cost,sortOrder});
        return json({ok:true,id},201);
      }catch{return json({error:'SHARING_SERVICE_EXISTS'},409);}
    }

    const serviceId=clean(body.serviceId,80);
    if(!serviceId) return json({error:'SHARING_SERVICE_NOT_FOUND'},404);
    const current=await env.DB.prepare("SELECT * FROM sharing_services WHERE id=? LIMIT 1").bind(serviceId).first();
    if(!current) return json({error:'SHARING_SERVICE_NOT_FOUND'},404);

    if(operation==='update'){
      const nameAr=clean(body.nameAr,100), nameEn=clean(body.nameEn,100);
      const cost=Math.max(0,Math.trunc(Number(body.creditCost??0)));
      const sortOrder=Math.trunc(Number(body.sortOrder||100));
      const active=Number(body.active)===0?0:1;
      if(!nameAr||!nameEn||!Number.isSafeInteger(cost)||!Number.isSafeInteger(sortOrder)) return json({error:'INVALID_SHARING_SERVICE'},400);
      try{
        await env.DB.prepare("UPDATE sharing_services SET name_ar=?,name_en=?,credit_cost=?,active=?,sort_order=? WHERE id=?")
          .bind(nameAr,nameEn,cost,active,sortOrder,serviceId).run();
        await audit(env,request,user,'SHARING_SERVICE_UPDATED','sharing_service',serviceId,{before:{nameAr:current.name_ar,nameEn:current.name_en,cost:current.credit_cost,active:current.active,sortOrder:current.sort_order},after:{nameAr,nameEn,cost,active,sortOrder}});
        return json({ok:true});
      }catch{return json({error:'SHARING_SERVICE_EXISTS'},409);}
    }

    const stats=await env.DB.prepare("SELECT (SELECT COUNT(*) FROM sharing_codes WHERE service_id=?) codes,(SELECT COUNT(*) FROM sharing_codes WHERE service_id=? AND status='issued') issued,(SELECT COUNT(*) FROM sharing_orders WHERE service_id=?) orders").bind(serviceId,serviceId,serviceId).first();
    const codes=Number(stats?.codes||0), issued=Number(stats?.issued||0), orders=Number(stats?.orders||0);

    if(issued>0||orders>0){
      await env.DB.prepare("UPDATE sharing_services SET active=0 WHERE id=?").bind(serviceId).run();
      await audit(env,request,user,'SHARING_SERVICE_ARCHIVED','sharing_service',serviceId,{nameAr:current.name_ar,nameEn:current.name_en,codes,issued,orders,preservedHistory:true});
      return json({ok:true,archived:true,preservedHistory:true});
    }

    await env.DB.prepare("DELETE FROM sharing_codes WHERE service_id=?").bind(serviceId).run();
    await env.DB.prepare("DELETE FROM sharing_batches WHERE service_id=?").bind(serviceId).run();
    await env.DB.prepare("DELETE FROM sharing_services WHERE id=?").bind(serviceId).run();
    await audit(env,request,user,'SHARING_SERVICE_DELETED','sharing_service',serviceId,{nameAr:current.name_ar,nameEn:current.name_en,codes});
    return json({ok:true,deleted:true});
  }

  if(path==='/api/admin/code-stock' && method==='GET'){
    const kind=url.searchParams.get('kind')==='sharing'?'sharing':'iptv';
    const sourceId=clean(url.searchParams.get('sourceId'),80);
    const status=['available','issued','disabled'].includes(url.searchParams.get('status'))?url.searchParams.get('status'):'all';
    const q=clean(url.searchParams.get('q'),160);
    const limit=Math.max(25,Math.min(250,Math.trunc(Number(url.searchParams.get('limit')||100))));

    if(kind==='sharing'){
      const where=[], args=[];
      if(sourceId){ where.push("c.service_id=?"); args.push(sourceId); }
      if(status!=='all'){ where.push("c.status=?"); args.push(status); }
      if(q){ where.push("c.code LIKE ?"); args.push('%'+q+'%'); }
      const sql="SELECT c.id,c.code,c.status,c.customer_ref,c.issued_at,c.created_at,c.service_id source_id,s.name_ar source_name_ar,s.name_en source_name_en,b.filename batch_filename,u.username reseller_username,u.display_name reseller_name FROM sharing_codes c JOIN sharing_services s ON s.id=c.service_id JOIN sharing_batches b ON b.id=c.batch_id LEFT JOIN users u ON u.id=c.reseller_id "+(where.length?'WHERE '+where.join(' AND '):'')+" ORDER BY CASE c.status WHEN 'available' THEN 0 WHEN 'issued' THEN 1 ELSE 2 END,c.created_at DESC LIMIT ?";
      const rows=(await env.DB.prepare(sql).bind(...args,limit).all()).results||[];

      const countWhere=[], countArgs=[];
      if(sourceId){ countWhere.push("service_id=?"); countArgs.push(sourceId); }
      const counts=await env.DB.prepare("SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) available,COALESCE(SUM(CASE WHEN status='issued' THEN 1 ELSE 0 END),0) issued,COALESCE(SUM(CASE WHEN status='disabled' THEN 1 ELSE 0 END),0) disabled FROM sharing_codes "+(countWhere.length?'WHERE '+countWhere.join(' AND '):'')).bind(...countArgs).first();
      const sources=(await env.DB.prepare("SELECT id,name_ar,name_en,credit_cost,active,sort_order FROM sharing_services ORDER BY sort_order,name_en").all()).results||[];
      return json({kind,codes:rows,counts:counts||{total:0,available:0,issued:0,disabled:0},sources});
    }

    const where=[], args=[];
    if(sourceId){ where.push("c.server_id=?"); args.push(sourceId); }
    if(status!=='all'){ where.push("c.status=?"); args.push(status); }
    if(q){ where.push("c.code LIKE ?"); args.push('%'+q+'%'); }
    const sql="SELECT c.id,c.code,c.status,c.customer_ref,c.issued_at,c.created_at,c.server_id source_id,s.name source_name,p.name package_name,p.duration_label,b.filename batch_filename,u.username reseller_username,u.display_name reseller_name FROM codes c JOIN servers s ON s.id=c.server_id JOIN packages p ON p.id=c.package_id JOIN code_batches b ON b.id=c.batch_id LEFT JOIN users u ON u.id=c.reseller_id "+(where.length?'WHERE '+where.join(' AND '):'')+" ORDER BY CASE c.status WHEN 'available' THEN 0 WHEN 'issued' THEN 1 ELSE 2 END,c.created_at DESC LIMIT ?";
    const rows=(await env.DB.prepare(sql).bind(...args,limit).all()).results||[];

    const countWhere=[], countArgs=[];
    if(sourceId){ countWhere.push("server_id=?"); countArgs.push(sourceId); }
    const counts=await env.DB.prepare("SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END),0) available,COALESCE(SUM(CASE WHEN status='issued' THEN 1 ELSE 0 END),0) issued,COALESCE(SUM(CASE WHEN status='disabled' THEN 1 ELSE 0 END),0) disabled FROM codes "+(countWhere.length?'WHERE '+countWhere.join(' AND '):'')).bind(...countArgs).first();
    const sources=(await env.DB.prepare("SELECT s.id,s.name,s.active,s.sort_order,COALESCE((SELECT p.credit_cost FROM packages p WHERE p.server_id=s.id AND p.active=1 ORDER BY p.sort_order,p.created_at LIMIT 1),0) credit_cost FROM servers s ORDER BY s.sort_order,s.name").all()).results||[];
    return json({kind,codes:rows,counts:counts||{total:0,available:0,issued:0,disabled:0},sources});
  }

  if(path==='/api/admin/code-stock' && method==='POST'){
    const body=await bodyJson(request);
    const kind=body.kind==='sharing'?'sharing':body.kind==='iptv'?'iptv':'';
    const operation=['add','update','delete','delete_all'].includes(body.operation)?body.operation:'';
    if(!kind||!operation) return json({error:'INVALID_CODE_OPERATION'},400);

    if(operation==='add'){
      const sourceId=clean(body.sourceId,80), code=clean(body.code,500);
      if(!sourceId||!code) return json({error:'INVALID_CODE'},400);
      const at=now();

      if(kind==='sharing'){
        const source=await env.DB.prepare("SELECT id,name_en FROM sharing_services WHERE id=? LIMIT 1").bind(sourceId).first();
        if(!source) return json({error:'SHARING_SERVICE_NOT_FOUND'},404);
        const batchId=uid('sbat'), codeId=uid('scod');
        try{
          await env.DB.batch([
            env.DB.prepare("INSERT INTO sharing_batches(id,service_id,filename,imported_by,total_lines,blank_count,inserted_count,duplicate_count,created_at) VALUES(?,?,?, ?,1,0,1,0,?)").bind(batchId,sourceId,'MANUAL-ADD.txt',user.id,at),
            env.DB.prepare("INSERT INTO sharing_codes(id,service_id,batch_id,code,status,created_at) VALUES(?,?,?,?,'available',?)").bind(codeId,sourceId,batchId,code,at)
          ]);
          await audit(env,request,user,'SHARING_CODE_ADDED','sharing_code',codeId,{serviceId:sourceId,service:source.name_en,manual:true});
          return json({ok:true,id:codeId},201);
        }catch{
          try{await env.DB.prepare("DELETE FROM sharing_batches WHERE id=? AND NOT EXISTS(SELECT 1 FROM sharing_codes WHERE batch_id=?)").bind(batchId,batchId).run();}catch{}
          return json({error:'CODE_EXISTS'},409);
        }
      }

      const pack=await env.DB.prepare("SELECT p.id,p.name,s.name server_name FROM packages p JOIN servers s ON s.id=p.server_id WHERE p.server_id=? AND p.active=1 ORDER BY p.sort_order,p.created_at LIMIT 1").bind(sourceId).first();
      if(!pack) return json({error:'SERVER_PACKAGE_MISMATCH'},409);
      const batchId=uid('bat'), codeId=uid('cod');
      try{
        await env.DB.batch([
          env.DB.prepare("INSERT INTO code_batches(id,server_id,package_id,filename,imported_by,total_lines,blank_count,inserted_count,duplicate_count,created_at) VALUES(?,?,?,?,?,1,0,1,0,?)").bind(batchId,sourceId,pack.id,'MANUAL-ADD.txt',user.id,at),
          env.DB.prepare("INSERT INTO codes(id,server_id,package_id,batch_id,code,status,created_at) VALUES(?,?,?,?,?,'available',?)").bind(codeId,sourceId,pack.id,batchId,code,at)
        ]);
        await audit(env,request,user,'IPTV_CODE_ADDED','code',codeId,{serverId:sourceId,server:pack.server_name,packageId:pack.id,manual:true});
        return json({ok:true,id:codeId},201);
      }catch{
        try{await env.DB.prepare("DELETE FROM code_batches WHERE id=? AND NOT EXISTS(SELECT 1 FROM codes WHERE batch_id=?)").bind(batchId,batchId).run();}catch{}
        return json({error:'CODE_EXISTS'},409);
      }
    }

    if(operation==='update'){
      const codeId=clean(body.codeId,80), code=clean(body.code,500);
      if(!codeId||!code) return json({error:'INVALID_CODE'},400);

      if(kind==='sharing'){
        const current=await env.DB.prepare("SELECT c.id,c.code,c.status,c.service_id,s.name_en FROM sharing_codes c JOIN sharing_services s ON s.id=c.service_id WHERE c.id=? LIMIT 1").bind(codeId).first();
        if(!current) return json({error:'CODE_NOT_FOUND'},404);
        try{
          await env.DB.prepare("UPDATE sharing_codes SET code=? WHERE id=?").bind(code,codeId).run();
          await audit(env,request,user,'SHARING_CODE_UPDATED','sharing_code',codeId,{serviceId:current.service_id,service:current.name_en,status:current.status,oldCode:current.code,newCode:code});
          return json({ok:true});
        }catch{return json({error:'CODE_EXISTS'},409);}
      }

      const current=await env.DB.prepare("SELECT c.id,c.code,c.status,c.server_id,s.name FROM codes c JOIN servers s ON s.id=c.server_id WHERE c.id=? LIMIT 1").bind(codeId).first();
      if(!current) return json({error:'CODE_NOT_FOUND'},404);
      try{
        await env.DB.prepare("UPDATE codes SET code=? WHERE id=?").bind(code,codeId).run();
        await audit(env,request,user,'IPTV_CODE_UPDATED','code',codeId,{serverId:current.server_id,server:current.name,status:current.status,oldCode:current.code,newCode:code});
        return json({ok:true});
      }catch{return json({error:'CODE_EXISTS'},409);}
    }

    if(operation==='delete'){
      const codeId=clean(body.codeId,80);
      if(!codeId) return json({error:'INVALID_CODE'},400);

      if(kind==='sharing'){
        const current=await env.DB.prepare("SELECT c.id,c.code,c.status,c.service_id,c.batch_id,s.name_en FROM sharing_codes c JOIN sharing_services s ON s.id=c.service_id WHERE c.id=? LIMIT 1").bind(codeId).first();
        if(!current) return json({error:'CODE_NOT_FOUND'},404);
        await env.DB.prepare("DELETE FROM sharing_codes WHERE id=?").bind(codeId).run();
        await env.DB.prepare("UPDATE sharing_batches SET inserted_count=(SELECT COUNT(*) FROM sharing_codes WHERE batch_id=?) WHERE id=?").bind(current.batch_id,current.batch_id).run();
        await env.DB.prepare("DELETE FROM sharing_batches WHERE id=? AND NOT EXISTS(SELECT 1 FROM sharing_codes WHERE batch_id=?)").bind(current.batch_id,current.batch_id).run();
        await audit(env,request,user,'SHARING_CODE_DELETED','sharing_code',codeId,{serviceId:current.service_id,service:current.name_en,status:current.status,code:current.code});
        return json({ok:true});
      }

      const current=await env.DB.prepare("SELECT c.id,c.code,c.status,c.server_id,c.batch_id,s.name FROM codes c JOIN servers s ON s.id=c.server_id WHERE c.id=? LIMIT 1").bind(codeId).first();
      if(!current) return json({error:'CODE_NOT_FOUND'},404);
      await env.DB.prepare("DELETE FROM codes WHERE id=?").bind(codeId).run();
      await env.DB.prepare("UPDATE code_batches SET inserted_count=(SELECT COUNT(*) FROM codes WHERE batch_id=?) WHERE id=?").bind(current.batch_id,current.batch_id).run();
      await env.DB.prepare("DELETE FROM code_batches WHERE id=? AND NOT EXISTS(SELECT 1 FROM codes WHERE batch_id=?)").bind(current.batch_id,current.batch_id).run();
      await audit(env,request,user,'IPTV_CODE_DELETED','code',codeId,{serverId:current.server_id,server:current.name,status:current.status,code:current.code});
      return json({ok:true});
    }

    const sourceId=clean(body.sourceId,80);
    const scope=body.scope==='available'?'available':'all';

    if(kind==='sharing'){
      const conditions=[], args=[];
      if(sourceId){ conditions.push("service_id=?"); args.push(sourceId); }
      if(scope==='available'){ conditions.push("status='available'"); }
      const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
      const before=await env.DB.prepare("SELECT COUNT(*) count FROM sharing_codes"+where).bind(...args).first();
      await env.DB.prepare("DELETE FROM sharing_codes"+where).bind(...args).run();
      await env.DB.prepare("UPDATE sharing_batches SET inserted_count=(SELECT COUNT(*) FROM sharing_codes WHERE sharing_codes.batch_id=sharing_batches.id)").run();
      await env.DB.prepare("DELETE FROM sharing_batches WHERE NOT EXISTS(SELECT 1 FROM sharing_codes WHERE sharing_codes.batch_id=sharing_batches.id)").run();
      const deleted=Number(before?.count||0);
      await audit(env,request,user,'SHARING_CODES_DELETED_ALL','sharing_code',sourceId||null,{serviceId:sourceId||null,scope,deleted});
      return json({ok:true,deleted});
    }

    const conditions=[], args=[];
    if(sourceId){ conditions.push("server_id=?"); args.push(sourceId); }
    if(scope==='available'){ conditions.push("status='available'"); }
    const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
    const before=await env.DB.prepare("SELECT COUNT(*) count FROM codes"+where).bind(...args).first();
    await env.DB.prepare("DELETE FROM codes"+where).bind(...args).run();
    await env.DB.prepare("UPDATE code_batches SET inserted_count=(SELECT COUNT(*) FROM codes WHERE codes.batch_id=code_batches.id)").run();
    await env.DB.prepare("DELETE FROM code_batches WHERE NOT EXISTS(SELECT 1 FROM codes WHERE codes.batch_id=code_batches.id)").run();
    const deleted=Number(before?.count||0);
    await audit(env,request,user,'IPTV_CODES_DELETED_ALL','code',sourceId||null,{serverId:sourceId||null,scope,deleted});
    return json({ok:true,deleted});
  }

  if(path==='/api/admin/partners' && method==='GET'){
    const rows=(await env.DB.prepare("SELECT id,username,email,display_name,status,last_login_ip,last_country,last_login_at,created_at,updated_at FROM users WHERE role='admin' ORDER BY CASE WHEN username='owner' THEN 0 ELSE 1 END,created_at ASC").all()).results||[];
    return json({partners:rows});
  }

  if(path==='/api/admin/partners' && method==='POST'){
    const body=await bodyJson(request);
    const username=clean(body.username,80);
    const email=clean(body.email,120).toLowerCase();
    const password=String(body.password||'');
    const displayName=clean(body.displayName,80)||username;

    if(!validUsername(username)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||password.length<1||password.length>256){
      return json({error:'INVALID_ADMIN'},400);
    }

    const salt=randomToken(18), id=uid('usr'), at=now();
    try{
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users(id,username,email,password_hash,password_salt,password_iterations,role,account_type,parent_user_id,display_name,credits,must_change_password,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'admin','admin',NULL,?,0,0,'active',?,?)")
          .bind(id,username,email||null,await hashPassword(password,salt),salt,PASSWORD_ITERATIONS,displayName,at,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
          .bind(uid('log'),user.id,user.role,'ADMIN_PARTNER_CREATED','user',id,JSON.stringify({username,email:email||null,displayName,fullAccess:true}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
      ]);
      return json({ok:true,id},201);
    }catch{
      return json({error:'ACCOUNT_EXISTS'},409);
    }
  }

  if(path==='/api/admin/resellers' && method==='GET'){
    const rows=(await env.DB.prepare("SELECT u.id,u.username,u.email,u.display_name,u.role,u.credits,u.status,u.account_type,u.parent_user_id,u.last_login_ip,u.last_country,u.last_login_at,u.created_at,u.updated_at,p.username parent_username,p.display_name parent_name,((SELECT COUNT(*) FROM codes c WHERE c.reseller_id=u.id AND c.status='issued')+(SELECT COUNT(*) FROM sharing_codes sc WHERE sc.reseller_id=u.id AND sc.status='issued')) issued_codes FROM users u LEFT JOIN users p ON p.id=u.parent_user_id WHERE COALESCE(u.account_type,'reseller')<>'owner' AND LOWER(u.username)<>'owner' ORDER BY CASE COALESCE(u.account_type,'reseller') WHEN 'admin' THEN 0 WHEN 'agent' THEN 1 ELSE 2 END,u.created_at DESC LIMIT 200").all()).results||[];
    return json({resellers:rows});
  }

  if(path==='/api/admin/resellers' && method==='POST'){
    const body=await bodyJson(request);
    const username=clean(body.username,80), email=clean(body.email,120).toLowerCase(), password=String(body.password||'');
    const displayName=clean(body.displayName,80)||username;
    const accountType=['admin','agent','reseller'].includes(body.accountType)?body.accountType:'reseller';
    const credits=Math.max(0,Math.trunc(Number(body.credits||0)));
    if(!validUsername(username)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||password.length<1||password.length>256||!Number.isSafeInteger(credits)) return json({error:'INVALID_RESELLER'},400);
    const salt=randomToken(18), id=uid('usr'), at=now();
    const dbRole=accountType==='admin'?'admin':'reseller';
    const parentId=accountType==='admin'?null:user.id;
    const startingBalance=accountType==='admin'?0:credits;
    try{
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users(id,username,email,password_hash,password_salt,password_iterations,role,account_type,parent_user_id,display_name,credits,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'active',?,?)").bind(id,username,email||null,await hashPassword(password,salt),salt,PASSWORD_ITERATIONS,dbRole,accountType,parentId,displayName,startingBalance,at,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'ACCOUNT_CREATED','user',id,JSON.stringify({username,email:email||null,displayName,accountType,initialBalance:startingBalance}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
      ]);
      return json({ok:true,id,accountType},201);
    }catch{return json({error:'ACCOUNT_EXISTS'},409);}
  }

  if(path==='/api/admin/user-edit' && method==='POST'){
    const body=await bodyJson(request);
    const userId=clean(body.userId,80);
    const username=clean(body.username,80);
    const email=clean(body.email,120).toLowerCase();
    const displayName=clean(body.displayName,80)||username;
    const accountTypeValue=['admin','agent','reseller'].includes(body.accountType)?body.accountType:'';
    const status=['active','blocked'].includes(body.status)?body.status:'';
    const newPassword=String(body.password||'');
    if(!userId||!validUsername(username)||!accountTypeValue||!status||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||newPassword.length>256) return json({error:'INVALID_USER_EDIT'},400);

    const target=await env.DB.prepare("SELECT * FROM users WHERE id=? LIMIT 1").bind(userId).first();
    if(!target) return json({error:'USER_NOT_FOUND'},404);
    if(String(target.username||'').toLowerCase()==='owner'||accountType(target)==='owner') return json({error:'OWNER_EDIT_LOCKED'},409);

    const dbRole=accountTypeValue==='admin'?'admin':'reseller';
    const parentId=accountTypeValue==='admin'?null:(target.parent_user_id||user.id);
    const at=now();
    const details={before:{username:target.username,email:target.email||'',displayName:target.display_name||'',accountType:accountType(target),status:target.status},after:{username,email,displayName,accountType:accountTypeValue,status},passwordChanged:Boolean(newPassword)};

    try{
      if(newPassword){
        const salt=randomToken(18);
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET username=?,email=?,display_name=?,role=?,account_type=?,parent_user_id=?,status=?,password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=? WHERE id=?")
            .bind(username,email||null,displayName,dbRole,accountTypeValue,parentId,status,await hashPassword(newPassword,salt),salt,PASSWORD_ITERATIONS,at,userId),
          env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId)
        ]);
      }else{
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET username=?,email=?,display_name=?,role=?,account_type=?,parent_user_id=?,status=?,updated_at=? WHERE id=?")
            .bind(username,email||null,displayName,dbRole,accountTypeValue,parentId,status,at,userId),
          env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId)
        ]);
      }
      await audit(env,request,user,'USER_EDITED','user',userId,details);
      return json({ok:true,userId,accountType:accountTypeValue});
    }catch{
      return json({error:'ACCOUNT_EXISTS'},409);
    }
  }

  if(path==='/api/admin/user-role' && method==='POST'){
    const body=await bodyJson(request);
    const targetId=clean(body.userId,80);
    const nextType=['admin','agent','reseller'].includes(body.accountType)?body.accountType:'';
    if(!targetId||!nextType) return json({error:'INVALID_ROLE'},400);

    const target=await env.DB.prepare("SELECT id,username,role,account_type,parent_user_id FROM users WHERE id=? LIMIT 1").bind(targetId).first();
    if(!target) return json({error:'USER_NOT_FOUND'},404);
    if(String(target.username||'').toLowerCase()==='owner'||accountType(target)==='owner') return json({error:'OWNER_ROLE_LOCKED'},409);

    const dbRole=nextType==='admin'?'admin':'reseller';
    const parentId=nextType==='admin'?null:(target.parent_user_id||user.id);
    const at=now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET role=?,account_type=?,parent_user_id=?,updated_at=? WHERE id=?").bind(dbRole,nextType,parentId,at,targetId),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(targetId)
    ]);
    await audit(env,request,user,'USER_ROLE_CHANGED','user',targetId,{from:accountType(target),to:nextType,parentUserId:parentId});
    return json({ok:true,userId:targetId,accountType:nextType});
  }

  if(path==='/api/admin/credit-adjust' && method==='POST'){
    const body=await bodyJson(request), resellerId=clean(body.resellerId,80), amount=Math.trunc(Number(body.amount));
    if(!resellerId||!Number.isSafeInteger(amount)||amount===0) return json({error:'INVALID_ADJUSTMENT'},400);
    const target=await env.DB.prepare("SELECT id,credits FROM users WHERE id=? AND role='reseller'").bind(resellerId).first();
    if(!target) return json({error:'RESELLER_NOT_FOUND'},404);
    const before=Number(target.credits), after=before+amount;
    if(after<0) return json({error:'NEGATIVE_BALANCE_NOT_ALLOWED'},409);
    const txId=uid('ctx'), guard=uid('grd'), at=now();
    try{
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=?,updated_at=? WHERE id=? AND credits=?").bind(after,txId,at,resellerId,before),
        env.DB.prepare("INSERT INTO tx_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM users WHERE id=? AND credits=? AND last_credit_tx_id=?) THEN 1 ELSE 0 END").bind(guard,resellerId,after,txId),
        env.DB.prepare("INSERT INTO credit_transactions(id,reseller_id,amount,type,reference_id,note,admin_id,balance_before,balance_after,created_at) VALUES(?,?,?,'admin_adjustment',?,?,?,?,?,?)").bind(txId,resellerId,amount,txId,clean(body.note,300),user.id,before,after,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'CREDIT_ADJUSTED','user',resellerId,JSON.stringify({amount,before,after}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at),
        env.DB.prepare("DELETE FROM tx_guards WHERE id=?").bind(guard)
      ]);
      return json({ok:true,before,after});
    }catch{return json({error:'CREDIT_CONFLICT_RETRY'},409);}
  }

  if(path==='/api/admin/servers' && method==='POST'){
    const body=await bodyJson(request), name=clean(body.name,60), slug=slugify(body.slug||body.name), threshold=Math.max(0,Math.trunc(Number(body.lowStockThreshold||10)));
    const creditCost=Math.max(0,Math.trunc(Number(body.creditCost??1)));
    if(!name||!slug||!Number.isSafeInteger(creditCost)) return json({error:'INVALID_SERVER'},400);
    const id=uid('srv'), packageId=uid('pkg'), at=now();
    try{
      await env.DB.batch([
        env.DB.prepare("INSERT INTO servers(id,name,slug,active,low_stock_threshold,sort_order,created_at) VALUES(?,?,?,1,?,?,?)").bind(id,name,slug,threshold,Math.trunc(Number(body.sortOrder||100)),at),
        env.DB.prepare("INSERT INTO packages(id,server_id,name,duration_label,credit_cost,active,sort_order,created_at) VALUES(?,?,'سنوي','12 Months',?,1,10,?)").bind(packageId,id,creditCost,at)
      ]);
      await audit(env,request,user,'SERVER_CREATED','server',id,{name,slug,threshold,creditCost,duration:'12 Months'});
      return json({ok:true,id,packageId},201);
    }catch{return json({error:'SERVER_EXISTS'},409);}
  }

  if(path==='/api/admin/packages' && method==='POST'){
    const body=await bodyJson(request), serverId=clean(body.serverId,80), name=clean(body.name,80), duration=clean(body.durationLabel,80), cost=Math.max(0,Math.trunc(Number(body.creditCost)));
    if(!serverId||!name||!Number.isFinite(cost)) return json({error:'INVALID_PACKAGE'},400);
    const server=await env.DB.prepare("SELECT id FROM servers WHERE id=?").bind(serverId).first();
    if(!server) return json({error:'SERVER_NOT_FOUND'},404);
    const id=uid('pkg');
    try{
      await env.DB.prepare("INSERT INTO packages(id,server_id,name,duration_label,credit_cost,active,sort_order,created_at) VALUES(?,?,?,?,?,1,?,?)").bind(id,serverId,name,duration,cost,Math.trunc(Number(body.sortOrder||100)),now()).run();
      await audit(env,request,user,'PACKAGE_CREATED','package',id,{serverId,name,duration,cost});
      return json({ok:true,id},201);
    }catch{return json({error:'PACKAGE_EXISTS'},409);}
  }

  if(path==='/api/admin/import-codes' && method==='POST'){
    const body=await bodyJson(request), serverId=clean(body.serverId,80), filename=clean(body.filename||'codes.txt',120);
    const hasCodeCost=body.codeCost!==undefined&&body.codeCost!==null&&String(body.codeCost)!=='';
    const codeCost=hasCodeCost?Math.max(0,Math.trunc(Number(body.codeCost))):null;
    if(hasCodeCost&&!Number.isSafeInteger(codeCost)) return json({error:'INVALID_CODE_COST'},400);
    const lines=String(body.text||'').replace(/\r/g,'').split('\n');
    const nonBlank=lines.map(x=>x.trim()).filter(Boolean);
    const unique=Array.from(new Set(nonBlank));
    if(!serverId||unique.length===0) return json({error:'EMPTY_IMPORT'},400);
    if(unique.length>700) return json({error:'IMPORT_LIMIT_700'},413);
    const pack=await env.DB.prepare("SELECT id,credit_cost FROM packages WHERE server_id=? AND active=1 ORDER BY sort_order,created_at LIMIT 1").bind(serverId).first();
    if(!pack) return json({error:'SERVER_PACKAGE_MISMATCH'},409);
    const packageId=pack.id;
    const previousCost=Number(pack.credit_cost||0);
    const effectiveCost=hasCodeCost?codeCost:previousCost;
    if(hasCodeCost&&effectiveCost!==previousCost){
      await env.DB.prepare("UPDATE packages SET credit_cost=? WHERE id=?").bind(effectiveCost,packageId).run();
    }

    const existingRows=(await env.DB.prepare("SELECT code FROM codes WHERE code IN ("+unique.slice(0,90).map(()=>'?').join(',')+")").bind(...unique.slice(0,90)).all()).results||[];
    const existing=new Set(existingRows.map(r=>r.code));
    const filtered=unique.filter(c=>!existing.has(c));
    const batchId=uid('bat'), at=now(), blank=lines.length-nonBlank.length;

    await env.DB.prepare("INSERT INTO code_batches(id,server_id,package_id,filename,imported_by,total_lines,blank_count,inserted_count,duplicate_count,created_at) VALUES(?,?,?,?,?,?,?,0,0,?)").bind(batchId,serverId,packageId,filename,user.id,lines.length,blank,at).run();

    let inserted=0;
    for(let offset=0;offset<filtered.length;offset+=16){
      const chunk=filtered.slice(offset,offset+16), params=[];
      for(const code of chunk) params.push(uid('cod'),serverId,packageId,batchId,code,at);
      try{
        const result=await env.DB.prepare("INSERT OR IGNORE INTO codes(id,server_id,package_id,batch_id,code,created_at) VALUES "+chunk.map(()=>"(?,?,?,?,?,?)").join(',')).bind(...params).run();
        inserted+=Number(result.meta?.changes||0);
      }catch{}
    }

    const duplicateCount=Math.max(0,nonBlank.length-inserted);
    await env.DB.prepare("UPDATE code_batches SET inserted_count=?,duplicate_count=? WHERE id=?").bind(inserted,duplicateCount,batchId).run();
    await audit(env,request,user,'CODES_IMPORTED','code_batch',batchId,{serverId,packageId,filename,totalLines:lines.length,inserted,duplicateCount,priceBefore:previousCost,priceAfter:effectiveCost});
    return json({ok:true,batch:{id:batchId,filename,total_lines:lines.length,blank_count:blank,inserted_count:inserted,duplicate_count:duplicateCount,unit_cost:effectiveCost,created_at:at}},201);
  }


  if(path==='/api/admin/sharing/import' && method==='POST'){
    const body=await bodyJson(request);
    const serviceId=clean(body.serviceId,80);
    const filename=clean(body.filename||'sharing-codes.txt',120);
    const hasCodeCost=body.codeCost!==undefined&&body.codeCost!==null&&String(body.codeCost)!=='';
    const codeCost=hasCodeCost?Math.max(0,Math.trunc(Number(body.codeCost))):null;
    if(hasCodeCost&&!Number.isSafeInteger(codeCost)) return json({error:'INVALID_CODE_COST'},400);
    const lines=String(body.text||'').replace(/\r/g,'').split('\n');
    const nonBlank=lines.map(x=>x.trim()).filter(Boolean);
    const unique=Array.from(new Set(nonBlank));

    if(!serviceId||unique.length===0) return json({error:'EMPTY_IMPORT'},400);
    if(unique.length>700) return json({error:'IMPORT_LIMIT_700'},413);

    const service=await env.DB.prepare("SELECT id,name_ar,name_en,credit_cost FROM sharing_services WHERE id=? AND active=1 LIMIT 1").bind(serviceId).first();
    if(!service) return json({error:'SHARING_SERVICE_NOT_FOUND'},404);
    const previousCost=Number(service.credit_cost||0);
    const effectiveCost=hasCodeCost?codeCost:previousCost;
    if(hasCodeCost&&effectiveCost!==previousCost){
      await env.DB.prepare("UPDATE sharing_services SET credit_cost=? WHERE id=?").bind(effectiveCost,serviceId).run();
    }

    const batchId=uid('sbat'), at=now(), blank=lines.length-nonBlank.length;
    await env.DB.prepare("INSERT INTO sharing_batches(id,service_id,filename,imported_by,total_lines,blank_count,inserted_count,duplicate_count,created_at) VALUES(?,?,?,?,?,?,0,0,?)")
      .bind(batchId,serviceId,filename,user.id,lines.length,blank,at).run();

    let inserted=0;
    for(let offset=0;offset<unique.length;offset+=16){
      const chunk=unique.slice(offset,offset+16);
      const params=[];
      for(const code of chunk) params.push(uid('scod'),serviceId,batchId,code,at);
      try{
        const result=await env.DB.prepare("INSERT OR IGNORE INTO sharing_codes(id,service_id,batch_id,code,created_at) VALUES "+chunk.map(()=>"(?,?,?,?,?)").join(','))
          .bind(...params).run();
        inserted+=Number(result.meta?.changes||0);
      }catch{}
    }

    const duplicateCount=Math.max(0,nonBlank.length-inserted);
    await env.DB.prepare("UPDATE sharing_batches SET inserted_count=?,duplicate_count=? WHERE id=?")
      .bind(inserted,duplicateCount,batchId).run();

    await audit(env,request,user,'SHARING_CODES_IMPORTED','sharing_batch',batchId,{
      serviceId,
      service:service.name_en,
      filename,
      totalLines:lines.length,
      inserted,
      duplicateCount,
      priceBefore:previousCost,
      priceAfter:effectiveCost
    });

    return json({
      ok:true,
      batch:{
        id:batchId,
        filename,
        total_lines:lines.length,
        blank_count:blank,
        inserted_count:inserted,
        duplicate_count:duplicateCount,
        unit_cost:effectiveCost,
        created_at:at
      }
    },201);
  }

  if(path==='/api/admin/codes' && method==='GET'){
    const rows=(await env.DB.prepare("SELECT c.id,c.code,c.customer_ref,c.issued_at,c.order_id,s.name server_name,p.name package_name,p.duration_label,u.username reseller_username,u.display_name reseller_name,o.quantity,o.unit_cost,o.total_cost,o.credits_before,o.credits_after,b.filename batch_filename FROM codes c JOIN servers s ON s.id=c.server_id JOIN packages p ON p.id=c.package_id JOIN users u ON u.id=c.reseller_id JOIN issue_orders o ON o.id=c.order_id JOIN code_batches b ON b.id=c.batch_id WHERE c.status='issued' ORDER BY c.issued_at DESC LIMIT 100").all()).results||[];
    return json({codes:rows});
  }

  if(path==='/api/admin/credit-requests/resolve' && method==='POST'){
    const body=await bodyJson(request), requestId=clean(body.requestId,80);
    const decision=body.decision==='approved'?'approved':body.decision==='rejected'?'rejected':'';
    if(!requestId||!decision) return json({error:'INVALID_DECISION'},400);
    const req=await env.DB.prepare("SELECT * FROM credit_requests WHERE id=? AND status='pending'").bind(requestId).first();
    if(!req) return json({error:'REQUEST_NOT_PENDING'},409);
    const at=now();

    if(decision==='rejected'){
      await env.DB.prepare("UPDATE credit_requests SET status='rejected',admin_note=?,resolved_at=?,resolved_by=? WHERE id=? AND status='pending'").bind(clean(body.note,300),at,user.id,requestId).run();
      await audit(env,request,user,'CREDIT_REQUEST_REJECTED','credit_request',requestId,{amount:req.amount});
      return json({ok:true});
    }

    const target=await env.DB.prepare("SELECT id,credits FROM users WHERE id=? AND role='reseller'").bind(req.reseller_id).first();
    if(!target) return json({error:'RESELLER_NOT_FOUND'},404);
    const before=Number(target.credits), amount=Number(req.amount), after=before+amount, txId=uid('ctx'), guard=uid('grd');
    try{
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=?,updated_at=? WHERE id=? AND credits=?").bind(after,txId,at,req.reseller_id,before),
        env.DB.prepare("INSERT INTO tx_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM users WHERE id=? AND credits=? AND last_credit_tx_id=?) THEN 1 ELSE 0 END").bind(guard,req.reseller_id,after,txId),
        env.DB.prepare("UPDATE credit_requests SET status='approved',admin_note=?,resolved_at=?,resolved_by=? WHERE id=? AND status='pending'").bind(clean(body.note,300),at,user.id,requestId),
        env.DB.prepare("INSERT INTO credit_transactions(id,reseller_id,amount,type,reference_id,note,admin_id,balance_before,balance_after,created_at) VALUES(?,?,?,'credit_request',?,?,?,?,?,?)").bind(txId,req.reseller_id,amount,requestId,clean(body.note,300),user.id,before,after,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'CREDIT_REQUEST_APPROVED','credit_request',requestId,JSON.stringify({amount,before,after}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at),
        env.DB.prepare("DELETE FROM tx_guards WHERE id=?").bind(guard)
      ]);
      return json({ok:true,before,after});
    }catch{return json({error:'CREDIT_CONFLICT_RETRY'},409);}
  }

  if(path==='/api/admin/apps' && method==='POST'){
    const body=await bodyJson(request), name=clean(body.name,100), platform=['android','windows','receiver','other'].includes(body.platform)?body.platform:'other', imageUrl=clean(body.imageUrl,700), downloadUrl=clean(body.downloadUrl,700), visibility=['all','admin','reseller'].includes(body.visibility)?body.visibility:'all';
    if(!name||!/^https?:\/\//i.test(downloadUrl)||(imageUrl&&!/^https?:\/\//i.test(imageUrl))) return json({error:'INVALID_APP'},400);
    const id=uid('app'), at=now();
    await env.DB.prepare("INSERT INTO apps(id,name,platform,version,description,image_url,download_url,visibility,active,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?,?)").bind(id,name,platform,clean(body.version,40),clean(body.description,500),imageUrl||null,downloadUrl,visibility,user.id,at,at).run();
    await audit(env,request,user,'APP_ADDED','app',id,{name,platform,visibility,hasImage:Boolean(imageUrl)});
    return json({ok:true,id},201);
  }

  return json({error:'NOT_FOUND'},404);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname.startsWith('/api/')) return await api(request,env);

      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      const type=headers.get('content-type')||'';

      if(type.includes('text/html')){
        headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
        headers.set('pragma','no-cache');
        headers.set('expires','0');
        headers.set('x-acm-ui-version','sidebar-clean-v1');
      }

      for(const [k,v] of Object.entries(securityHeaders())) headers.set(k,v);
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }catch(error){
      console.error('ACTIVE CODE MULTI',error);
      if(url.pathname.startsWith('/api/')) return json({error:'INTERNAL_ERROR'},500);
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      headers.set('cache-control','no-store');
      for(const [k,v] of Object.entries(securityHeaders())) headers.set(k,v);
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }
  }
};
