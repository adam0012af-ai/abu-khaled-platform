const SESSION_COOKIE = 'acm_session';
const SESSION_HOURS = 12;
const PASSWORD_ITERATIONS = 150000;
let schemaReady = false;

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, password_iterations INTEGER NOT NULL DEFAULT 150000, role TEXT NOT NULL CHECK(role IN ('admin','reseller')), display_name TEXT NOT NULL, credits INTEGER NOT NULL DEFAULT 0 CHECK(credits >= 0), last_credit_tx_id TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, csrf_token TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, ip_hash TEXT, user_agent TEXT)",
  "CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_started_at TEXT NOT NULL, blocked_until TEXT)",
  "CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE COLLATE NOCASE, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), low_stock_threshold INTEGER NOT NULL DEFAULT 10, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE, name TEXT NOT NULL, duration_label TEXT, credit_cost INTEGER NOT NULL DEFAULT 1 CHECK(credit_cost >= 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, UNIQUE(server_id,name))",
  "CREATE TABLE IF NOT EXISTS code_batches (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id), package_id TEXT NOT NULL REFERENCES packages(id), filename TEXT, imported_by TEXT NOT NULL REFERENCES users(id), total_lines INTEGER NOT NULL DEFAULT 0, blank_count INTEGER NOT NULL DEFAULT 0, inserted_count INTEGER NOT NULL DEFAULT 0, duplicate_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS issue_orders (id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES users(id), server_id TEXT NOT NULL REFERENCES servers(id), package_id TEXT NOT NULL REFERENCES packages(id), customer_ref TEXT, quantity INTEGER NOT NULL CHECK(quantity > 0), unit_cost INTEGER NOT NULL CHECK(unit_cost >= 0), total_cost INTEGER NOT NULL CHECK(total_cost >= 0), credits_before INTEGER NOT NULL, credits_after INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','cancelled')), created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS codes (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id), package_id TEXT NOT NULL REFERENCES packages(id), batch_id TEXT NOT NULL REFERENCES code_batches(id), code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','issued','disabled')), reseller_id TEXT REFERENCES users(id), order_id TEXT REFERENCES issue_orders(id), customer_ref TEXT, issued_at TEXT, created_at TEXT NOT NULL, UNIQUE(server_id,package_id,code))",
  "CREATE TABLE IF NOT EXISTS credit_transactions (id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL, type TEXT NOT NULL, reference_id TEXT, note TEXT, admin_id TEXT REFERENCES users(id), balance_before INTEGER NOT NULL, balance_after INTEGER NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS credit_requests (id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL CHECK(amount > 0), note TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), admin_note TEXT, created_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT REFERENCES users(id))",
  "CREATE TABLE IF NOT EXISTS apps (id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT NOT NULL CHECK(platform IN ('android','windows','receiver','other')), version TEXT, description TEXT, download_url TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'all' CHECK(visibility IN ('all','admin','reseller')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), actor_role TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details_json TEXT, ip_hash TEXT, user_agent TEXT, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS tx_guards (id TEXT PRIMARY KEY, ok INTEGER NOT NULL CHECK(ok = 1))",
  "CREATE INDEX IF NOT EXISTS idx_codes_stock ON codes(server_id,package_id,status,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_codes_reseller ON codes(reseller_id,issued_at)",
  "CREATE INDEX IF NOT EXISTS idx_orders_reseller ON issue_orders(reseller_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_logs_actor ON audit_logs(actor_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON credit_requests(status,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash)",
  "INSERT OR IGNORE INTO servers(id,name,slug,active,low_stock_threshold,sort_order,created_at) VALUES ('srv_marvel','Marvel','marvel',1,10,10,datetime('now')),('srv_nova','Nova','nova',1,10,20,datetime('now')),('srv_x','X','x',1,10,30,datetime('now')),('srv_spider','Spider','spider',1,10,40,datetime('now')),('srv_mh','MH','mh',1,10,50,datetime('now'))"
];

function now() { return new Date().toISOString(); }
function uid(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', ''); }
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}
function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}
function sessionCookie(token, maxAge = SESSION_HOURS * 3600) {
  return SESSION_COOKIE + '=' + encodeURIComponent(token) + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + maxAge;
}
function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function passwordHash(password, salt, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
function secureEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function bodyJson(request) {
  try { return await request.json(); } catch { return {}; }
}
async function ipHash(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return sha256(ip);
}
async function ensureSchema(env) {
  if (schemaReady) return;
  try {
    const found = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    if (!found) await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
    else await env.DB.prepare(SCHEMA[SCHEMA.length - 1]).run();
    schemaReady = true;
  } catch (e) {
    schemaReady = false;
    throw e;
  }
}
async function audit(env, request, actor, action, entityType, entityId, details = {}) {
  await env.DB.prepare(
    'INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
  ).bind(
    uid('log'),
    actor?.id || null,
    actor?.role || null,
    action,
    entityType || null,
    entityId || null,
    JSON.stringify(details),
    await ipHash(request),
    (request.headers.get('user-agent') || '').slice(0, 300),
    now()
  ).run();
}
async function authUser(env, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT s.id session_id,s.csrf_token,s.expires_at,u.id,u.username,u.display_name,u.role,u.credits,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1"
  ).bind(tokenHash, now()).first();
  if (!row || row.status !== 'active') return null;
  return row;
}
function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.display_name, role: u.role, credits: Number(u.credits || 0) };
}
function mutationAllowed(request, user) {
  if (!user) return false;
  const token = request.headers.get('x-csrf-token') || '';
  return secureEqual(token, user.csrf_token || '');
}
function validUsername(v) { return /^[A-Za-z0-9_.-]{3,40}$/.test(String(v || '')); }
function cleanText(v, max = 160) { return String(v || '').trim().slice(0, max); }
function slugify(v) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}
async function createSession(env, request, userId) {
  const token = randomToken(32);
  const csrf = randomToken(24);
  const created = now();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions(id,user_id,token_hash,csrf_token,expires_at,created_at,last_seen_at,ip_hash,user_agent) VALUES(?,?,?,?,?,?,?,?,?)'
  ).bind(
    uid('ses'), userId, await sha256(token), csrf, expires, created, created,
    await ipHash(request), (request.headers.get('user-agent') || '').slice(0, 300)
  ).run();
  return { token, csrf, expires };
}
async function listServers(env) {
  const servers = (await env.DB.prepare(
    "SELECT s.id,s.name,s.slug,s.active,s.low_stock_threshold,s.sort_order,COUNT(c.id) total_codes,COALESCE(SUM(CASE WHEN c.status='available' THEN 1 ELSE 0 END),0) available_codes,COALESCE(SUM(CASE WHEN c.status='issued' THEN 1 ELSE 0 END),0) issued_codes FROM servers s LEFT JOIN codes c ON c.server_id=s.id GROUP BY s.id ORDER BY s.sort_order,s.name"
  ).all()).results || [];
  const packages = (await env.DB.prepare(
    "SELECT p.id,p.server_id,p.name,p.duration_label,p.credit_cost,p.active,p.sort_order,COUNT(c.id) total_codes,COALESCE(SUM(CASE WHEN c.status='available' THEN 1 ELSE 0 END),0) available_codes,COALESCE(SUM(CASE WHEN c.status='issued' THEN 1 ELSE 0 END),0) issued_codes FROM packages p LEFT JOIN codes c ON c.package_id=p.id GROUP BY p.id ORDER BY p.server_id,p.sort_order,p.name"
  ).all()).results || [];
  return { servers, packages };
}
async function api(request, env) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  }

  if (path === '/api/health') return json({ ok: true, service: 'ACTIVE CODE MULTI' });

  if (path === '/api/setup/status' && method === 'GET') {
    const row = await env.DB.prepare('SELECT COUNT(*) count FROM users').first();
    return json({ needsSetup: Number(row?.count || 0) === 0, setupKeyConfigured: Boolean(env.SETUP_KEY) });
  }

  if (path === '/api/setup' && method === 'POST') {
    const count = await env.DB.prepare('SELECT COUNT(*) count FROM users').first();
    if (Number(count?.count || 0) > 0) return json({ error: 'SETUP_ALREADY_COMPLETE' }, 409);
    if (!env.SETUP_KEY) return json({ error: 'SETUP_KEY_NOT_CONFIGURED' }, 503);
    const supplied = request.headers.get('x-setup-key') || '';
    if (!secureEqual(supplied, String(env.SETUP_KEY))) return json({ error: 'INVALID_SETUP_KEY' }, 403);
    const body = await bodyJson(request);
    const username = cleanText(body.username, 40);
    const displayName = cleanText(body.displayName || 'Owner', 80);
    const password = String(body.password || '');
    if (!validUsername(username) || password.length < 10) return json({ error: 'INVALID_OWNER_CREDENTIALS' }, 400);
    const salt = randomToken(18);
    const created = now();
    const owner = { id: uid('usr'), role: 'admin' };
    await env.DB.prepare(
      "INSERT INTO users(id,username,password_hash,password_salt,password_iterations,role,display_name,credits,status,created_at,updated_at) VALUES(?,?,?,?,?,'admin',?,0,'active',?,?)"
    ).bind(owner.id, username, await passwordHash(password, salt), salt, PASSWORD_ITERATIONS, displayName, created, created).run();
    await audit(env, request, owner, 'OWNER_CREATED', 'user', owner.id, { username });
    const session = await createSession(env, request, owner.id);
    const fresh = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(owner.id).first();
    return json({ user: publicUser(fresh), csrf: session.csrf }, 201, { 'set-cookie': sessionCookie(session.token) });
  }

  if (path === '/api/login' && method === 'POST') {
    const body = await bodyJson(request);
    const username = cleanText(body.username, 40);
    const password = String(body.password || '');
    const key = await sha256(username.toLowerCase() + '|' + (request.headers.get('cf-connecting-ip') || 'unknown'));
    const gate = await env.DB.prepare('SELECT * FROM login_attempts WHERE key=?').bind(key).first();
    if (gate?.blocked_until && gate.blocked_until > now()) return json({ error: 'TOO_MANY_ATTEMPTS' }, 429);
    const user = await env.DB.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE LIMIT 1').bind(username).first();
    const calculated = user ? await passwordHash(password, user.password_salt, Number(user.password_iterations)) : await passwordHash(password, 'invalid-user-salt', PASSWORD_ITERATIONS);
    const ok = Boolean(user && user.status === 'active' && secureEqual(calculated, user.password_hash));
    if (!ok) {
      const currentTime = Date.now();
      let attempts = 1;
      let windowStarted = now();
      if (gate && (currentTime - Date.parse(gate.window_started_at)) < 15 * 60 * 1000) {
        attempts = Number(gate.attempts || 0) + 1;
        windowStarted = gate.window_started_at;
      }
      const blockedUntil = attempts >= 5 ? new Date(currentTime + 15 * 60 * 1000).toISOString() : null;
      await env.DB.prepare(
        'INSERT INTO login_attempts(key,attempts,window_started_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until'
      ).bind(key, attempts, windowStarted, blockedUntil).run();
      return json({ error: 'INVALID_LOGIN' }, 401);
    }
    await env.DB.prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();
    const session = await createSession(env, request, user.id);
    await audit(env, request, user, 'LOGIN_SUCCESS', 'session', null, {});
    return json({ user: publicUser(user), csrf: session.csrf }, 200, { 'set-cookie': sessionCookie(session.token) });
  }

  const user = await authUser(env, request);

  if (path === '/api/logout' && method === 'POST') {
    if (user) {
      if (!mutationAllowed(request, user)) return json({ error: 'CSRF' }, 403);
      await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(user.session_id).run();
      await audit(env, request, user, 'LOGOUT', 'session', user.session_id, {});
    }
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
  }

  if (!user) return json({ error: 'UNAUTHORIZED' }, 401);
  if (method !== 'GET' && method !== 'HEAD' && !mutationAllowed(request, user)) return json({ error: 'CSRF' }, 403);

  if (path === '/api/me' && method === 'GET') return json({ user: publicUser(user), csrf: user.csrf_token });

  if (path === '/api/servers' && method === 'GET') return json(await listServers(env));

  if (path === '/api/apps' && method === 'GET') {
    const rows = (await env.DB.prepare(
      "SELECT id,name,platform,version,description,download_url,visibility,created_at FROM apps WHERE active=1 AND (visibility='all' OR visibility=?) ORDER BY created_at DESC LIMIT 100"
    ).bind(user.role).all()).results || [];
    return json({ apps: rows });
  }

  if (path === '/api/dashboard' && method === 'GET') {
    if (user.role === 'admin') {
      const stock = await listServers(env);
      const counts = await env.DB.prepare(
        "SELECT (SELECT COUNT(*) FROM users WHERE role='reseller') resellers,(SELECT COUNT(*) FROM codes WHERE status='available') available,(SELECT COUNT(*) FROM codes WHERE status='issued') issued,(SELECT COUNT(*) FROM credit_requests WHERE status='pending') pending_requests"
      ).first();
      return json({ ...stock, counts });
    }
    const counts = await env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM codes WHERE reseller_id=? AND status='issued') issued,(SELECT COUNT(*) FROM credit_requests WHERE reseller_id=? AND status='pending') pending_requests"
    ).bind(user.id, user.id).first();
    return json({ user: publicUser(user), counts });
  }

  if (path === '/api/my-codes' && method === 'GET') {
    const rows = (await env.DB.prepare(
      "SELECT c.id,c.code,c.customer_ref,c.issued_at,c.order_id,s.name server_name,p.name package_name,p.duration_label,o.quantity,o.total_cost FROM codes c JOIN servers s ON s.id=c.server_id JOIN packages p ON p.id=c.package_id LEFT JOIN issue_orders o ON o.id=c.order_id WHERE c.reseller_id=? AND c.status='issued' ORDER BY c.issued_at DESC LIMIT 500"
    ).bind(user.id).all()).results || [];
    return json({ codes: rows });
  }

  if (path === '/api/logs' && method === 'GET') {
    const rows = user.role === 'admin'
      ? (await env.DB.prepare("SELECT l.*,u.username actor_username,u.display_name actor_name FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.created_at DESC LIMIT 250").all()).results || []
      : (await env.DB.prepare("SELECT action,entity_type,entity_id,details_json,created_at FROM audit_logs WHERE actor_id=? ORDER BY created_at DESC LIMIT 200").bind(user.id).all()).results || [];
    return json({ logs: rows });
  }

  if (path === '/api/credit-requests' && method === 'GET') {
    const rows = user.role === 'admin'
      ? (await env.DB.prepare("SELECT r.*,u.username,u.display_name FROM credit_requests r JOIN users u ON u.id=r.reseller_id ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 300").all()).results || []
      : (await env.DB.prepare('SELECT * FROM credit_requests WHERE reseller_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all()).results || [];
    return json({ requests: rows });
  }

  if (path === '/api/credit-requests' && method === 'POST') {
    if (user.role !== 'reseller') return json({ error: 'RESELLER_ONLY' }, 403);
    const body = await bodyJson(request);
    const amount = Math.trunc(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return json({ error: 'INVALID_AMOUNT' }, 400);
    const id = uid('crq');
    await env.DB.prepare(
      "INSERT INTO credit_requests(id,reseller_id,amount,note,status,created_at) VALUES(?,?,?,?,'pending',?)"
    ).bind(id, user.id, amount, cleanText(body.note, 300), now()).run();
    await audit(env, request, user, 'CREDIT_REQUEST_CREATED', 'credit_request', id, { amount });
    return json({ ok: true, id }, 201);
  }

  if (path === '/api/issue' && method === 'POST') {
    if (user.role !== 'reseller') return json({ error: 'RESELLER_ONLY' }, 403);
    const body = await bodyJson(request);
    const serverId = cleanText(body.serverId, 80);
    const packageId = cleanText(body.packageId, 80);
    const customerRef = cleanText(body.customerRef, 120);
    const quantity = Math.trunc(Number(body.quantity || 1));
    if (!serverId || !packageId || quantity < 1 || quantity > 100) return json({ error: 'INVALID_ISSUE_REQUEST' }, 400);
    const pack = await env.DB.prepare(
      "SELECT p.*,s.name server_name,s.active server_active FROM packages p JOIN servers s ON s.id=p.server_id WHERE p.id=? AND p.server_id=? AND p.active=1 AND s.active=1 LIMIT 1"
    ).bind(packageId, serverId).first();
    if (!pack) return json({ error: 'SERVER_PACKAGE_MISMATCH' }, 409);
    const fresh = await env.DB.prepare("SELECT id,credits,status FROM users WHERE id=? AND role='reseller'").bind(user.id).first();
    const total = Number(pack.credit_cost) * quantity;
    if (!fresh || fresh.status !== 'active' || Number(fresh.credits) < total) return json({ error: 'INSUFFICIENT_CREDIT' }, 409);
    const stock = await env.DB.prepare(
      "SELECT COUNT(*) count FROM codes WHERE server_id=? AND package_id=? AND status='available'"
    ).bind(serverId, packageId).first();
    if (Number(stock?.count || 0) < quantity) return json({ error: 'INSUFFICIENT_STOCK', available: Number(stock?.count || 0) }, 409);
    const orderId = uid('ord');
    const creditTx = uid('ctx');
    const guardCredit = uid('grd');
    const guardStock = uid('grd');
    const at = now();
    const before = Number(fresh.credits);
    const after = before - total;
    try {
      const batch = await env.DB.batch([
        env.DB.prepare("INSERT INTO issue_orders(id,reseller_id,server_id,package_id,customer_ref,quantity,unit_cost,total_cost,credits_before,credits_after,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'completed',?)").bind(orderId,user.id,serverId,packageId,customerRef,quantity,Number(pack.credit_cost),total,before,after,at),
        env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=?,updated_at=? WHERE id=? AND credits=? AND status='active'").bind(after,creditTx,at,user.id,before),
        env.DB.prepare("INSERT INTO tx_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM users WHERE id=? AND credits=? AND last_credit_tx_id=?) THEN 1 ELSE 0 END").bind(guardCredit,user.id,after,creditTx),
        env.DB.prepare("UPDATE codes SET status='issued',reseller_id=?,order_id=?,customer_ref=?,issued_at=? WHERE id IN (SELECT id FROM codes WHERE server_id=? AND package_id=? AND status='available' ORDER BY created_at,id LIMIT ?) RETURNING id,code").bind(user.id,orderId,customerRef,at,serverId,packageId,quantity),
        env.DB.prepare("INSERT INTO tx_guards(id,ok) SELECT ?,CASE WHEN (SELECT COUNT(*) FROM codes WHERE order_id=? AND server_id=? AND package_id=? AND reseller_id=? AND status='issued')=? THEN 1 ELSE 0 END").bind(guardStock,orderId,serverId,packageId,user.id,quantity),
        env.DB.prepare("INSERT INTO credit_transactions(id,reseller_id,amount,type,reference_id,note,balance_before,balance_after,created_at) VALUES(?,?,?,'issue',?,?, ?,?,?)").bind(creditTx,user.id,-total,orderId,'Code issue: '+pack.server_name+' / '+pack.name,before,after,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'CODES_ISSUED','issue_order',orderId,JSON.stringify({serverId,packageId,quantity,totalCost:total,customerRef}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at),
        env.DB.prepare('DELETE FROM tx_guards WHERE id=?').bind(guardCredit),
        env.DB.prepare('DELETE FROM tx_guards WHERE id=?').bind(guardStock)
      ]);
      const issued = batch[3]?.results || [];
      if (issued.length !== quantity) throw new Error('ATOMIC_ISSUE_COUNT_MISMATCH');
      return json({ ok: true, order: { id: orderId, server: pack.server_name, package: pack.name, quantity, unitCost: Number(pack.credit_cost), totalCost: total, creditsBefore: before, creditsAfter: after, customerRef, createdAt: at }, codes: issued });
    } catch (e) {
      return json({ error: 'ISSUE_CONFLICT_RETRY' }, 409);
    }
  }

  if (user.role !== 'admin') return json({ error: 'ADMIN_ONLY' }, 403);

  if (path === '/api/admin/resellers' && method === 'GET') {
    const rows = (await env.DB.prepare(
      "SELECT id,username,display_name,credits,status,created_at,updated_at FROM users WHERE role='reseller' ORDER BY created_at DESC LIMIT 500"
    ).all()).results || [];
    return json({ resellers: rows });
  }

  if (path === '/api/admin/resellers' && method === 'POST') {
    const body = await bodyJson(request);
    const username = cleanText(body.username, 40);
    const displayName = cleanText(body.displayName, 80);
    const password = String(body.password || '');
    const credits = Math.max(0, Math.trunc(Number(body.credits || 0)));
    if (!validUsername(username) || !displayName || password.length < 10 || credits > 1000000) return json({ error: 'INVALID_RESELLER' }, 400);
    const salt = randomToken(18);
    const id = uid('usr');
    const at = now();
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users(id,username,password_hash,password_salt,password_iterations,role,display_name,credits,status,created_at,updated_at) VALUES(?,?,?,?,?,'reseller',?,?,'active',?,?)").bind(id,username,await passwordHash(password,salt),salt,PASSWORD_ITERATIONS,displayName,credits,at,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'RESELLER_CREATED','user',id,JSON.stringify({username,displayName,initialCredits:credits}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
      ]);
      return json({ ok: true, id }, 201);
    } catch { return json({ error: 'USERNAME_EXISTS' }, 409); }
  }

  if (path === '/api/admin/credit-adjust' && method === 'POST') {
    const body = await bodyJson(request);
    const resellerId = cleanText(body.resellerId, 80);
    const amount = Math.trunc(Number(body.amount));
    if (!resellerId || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000000) return json({ error: 'INVALID_ADJUSTMENT' }, 400);
    const target = await env.DB.prepare("SELECT id,credits,status FROM users WHERE id=? AND role='reseller'").bind(resellerId).first();
    if (!target) return json({ error: 'RESELLER_NOT_FOUND' }, 404);
    const before = Number(target.credits);
    const after = before + amount;
    if (after < 0) return json({ error: 'NEGATIVE_BALANCE_NOT_ALLOWED' }, 409);
    const txId = uid('ctx');
    const guard = uid('grd');
    const at = now();
    try {
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET credits=?,last_credit_tx_id=?,updated_at=? WHERE id=? AND credits=?").bind(after,txId,at,resellerId,before),
        env.DB.prepare("INSERT INTO tx_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM users WHERE id=? AND credits=? AND last_credit_tx_id=?) THEN 1 ELSE 0 END").bind(guard,resellerId,after,txId),
        env.DB.prepare("INSERT INTO credit_transactions(id,reseller_id,amount,type,reference_id,note,admin_id,balance_before,balance_after,created_at) VALUES(?,?,?,'admin_adjustment',?,?,?,?,?,?)").bind(txId,resellerId,amount,txId,cleanText(body.note,300),user.id,before,after,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'CREDIT_ADJUSTED','user',resellerId,JSON.stringify({amount,before,after}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at),
        env.DB.prepare('DELETE FROM tx_guards WHERE id=?').bind(guard)
      ]);
      return json({ ok: true, before, after });
    } catch { return json({ error: 'CREDIT_CONFLICT_RETRY' }, 409); }
  }

  if (path === '/api/admin/servers' && method === 'POST') {
    const body = await bodyJson(request);
    const name = cleanText(body.name, 60);
    const slug = slugify(body.slug || name);
    const threshold = Math.max(0, Math.trunc(Number(body.lowStockThreshold || 10)));
    if (!name || !slug) return json({ error: 'INVALID_SERVER' }, 400);
    const id = uid('srv');
    try {
      await env.DB.prepare('INSERT INTO servers(id,name,slug,active,low_stock_threshold,sort_order,created_at) VALUES(?,?,?,1,?,?,?)')
        .bind(id,name,slug,threshold,Math.trunc(Number(body.sortOrder || 100)),now()).run();
      await audit(env, request, user, 'SERVER_CREATED', 'server', id, { name, slug, threshold });
      return json({ ok: true, id }, 201);
    } catch { return json({ error: 'SERVER_EXISTS' }, 409); }
  }

  if (path === '/api/admin/packages' && method === 'POST') {
    const body = await bodyJson(request);
    const serverId = cleanText(body.serverId, 80);
    const name = cleanText(body.name, 80);
    const duration = cleanText(body.durationLabel, 80);
    const cost = Math.max(0, Math.trunc(Number(body.creditCost)));
    if (!serverId || !name || !Number.isFinite(cost)) return json({ error: 'INVALID_PACKAGE' }, 400);
    const server = await env.DB.prepare('SELECT id FROM servers WHERE id=?').bind(serverId).first();
    if (!server) return json({ error: 'SERVER_NOT_FOUND' }, 404);
    const id = uid('pkg');
    try {
      await env.DB.prepare('INSERT INTO packages(id,server_id,name,duration_label,credit_cost,active,sort_order,created_at) VALUES(?,?,?,?,?,1,?,?)')
        .bind(id,serverId,name,duration,cost,Math.trunc(Number(body.sortOrder || 100)),now()).run();
      await audit(env, request, user, 'PACKAGE_CREATED', 'package', id, { serverId, name, duration, cost });
      return json({ ok: true, id }, 201);
    } catch { return json({ error: 'PACKAGE_EXISTS' }, 409); }
  }

  if (path === '/api/admin/import-codes' && method === 'POST') {
    const body = await bodyJson(request);
    const serverId = cleanText(body.serverId, 80);
    const packageId = cleanText(body.packageId, 80);
    const filename = cleanText(body.filename || 'codes.txt', 120);
    const source = String(body.text || '').replace(/\r/g, '');
    const lines = source.split('\n');
    const nonBlank = lines.map((x) => x.trim()).filter(Boolean);
    const unique = Array.from(new Set(nonBlank));
    const blankCount = lines.length - nonBlank.length;
    if (!serverId || !packageId || unique.length === 0) return json({ error: 'EMPTY_IMPORT' }, 400);
    if (unique.length > 1000) return json({ error: 'IMPORT_LIMIT_1000' }, 413);
    const pack = await env.DB.prepare('SELECT id FROM packages WHERE id=? AND server_id=?').bind(packageId,serverId).first();
    if (!pack) return json({ error: 'SERVER_PACKAGE_MISMATCH' }, 409);
    const batchId = uid('bat');
    const at = now();
    const placeholders = unique.map(() => '(?,?,?,?,?,?)').join(',');
    const params = [];
    unique.forEach((code) => params.push(uid('cod'),serverId,packageId,batchId,code,at));
    const insertSql = "INSERT OR IGNORE INTO codes(id,server_id,package_id,batch_id,code,created_at) VALUES " + placeholders;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO code_batches(id,server_id,package_id,filename,imported_by,total_lines,blank_count,inserted_count,duplicate_count,created_at) VALUES(?,?,?,?,?,?,?,0,0,?)').bind(batchId,serverId,packageId,filename,user.id,lines.length,blankCount,at),
      env.DB.prepare(insertSql).bind(...params),
      env.DB.prepare('UPDATE code_batches SET inserted_count=(SELECT COUNT(*) FROM codes WHERE batch_id=?),duplicate_count=total_lines-blank_count-(SELECT COUNT(*) FROM codes WHERE batch_id=?) WHERE id=?').bind(batchId,batchId,batchId),
      env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'CODES_IMPORTED','code_batch',batchId,JSON.stringify({serverId,packageId,filename,totalLines:lines.length}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
    ]);
    const result = await env.DB.prepare('SELECT id,filename,total_lines,blank_count,inserted_count,duplicate_count,created_at FROM code_batches WHERE id=?').bind(batchId).first();
    return json({ ok: true, batch: result }, 201);
  }

  if (path === '/api/admin/codes' && method === 'GET') {
    const rows = (await env.DB.prepare(
      "SELECT c.id,c.code,c.customer_ref,c.issued_at,c.order_id,s.name server_name,p.name package_name,p.duration_label,u.username reseller_username,u.display_name reseller_name,o.quantity,o.unit_cost,o.total_cost,o.credits_before,o.credits_after,b.filename batch_filename FROM codes c JOIN servers s ON s.id=c.server_id JOIN packages p ON p.id=c.package_id JOIN users u ON u.id=c.reseller_id JOIN issue_orders o ON o.id=c.order_id JOIN code_batches b ON b.id=c.batch_id WHERE c.status='issued' ORDER BY c.issued_at DESC LIMIT 500"
    ).all()).results || [];
    return json({ codes: rows });
  }

  if (path === '/api/admin/credit-requests/resolve' && method === 'POST') {
    const body = await bodyJson(request);
    const requestId = cleanText(body.requestId, 80);
    const decision = body.decision === 'approved' ? 'approved' : body.decision === 'rejected' ? 'rejected' : '';
    if (!requestId || !decision) return json({ error: 'INVALID_DECISION' }, 400);
    const req = await env.DB.prepare("SELECT * FROM credit_requests WHERE id=? AND status='pending'").bind(requestId).first();
    if (!req) return json({ error: 'REQUEST_NOT_PENDING' }, 409);
    const at = now();
    if (decision === 'rejected') {
      await env.DB.batch([
        env.DB.prepare("UPDATE credit_requests SET status='rejected',admin_note=?,resolved_at=?,resolved_by=? WHERE id=? AND status='pending'").bind(cleanText(body.note,300),at,user.id,requestId),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'CREDIT_REQUEST_REJECTED','credit_request',requestId,JSON.stringify({amount:req.amount}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at)
      ]);
      return json({ ok: true });
    }
    const target = await env.DB.prepare("SELECT id,credits FROM users WHERE id=? AND role='reseller'").bind(req.reseller_id).first();
    if (!target) return json({ error: 'RESELLER_NOT_FOUND' }, 404);
    const before = Number(target.credits);
    const amount = Number(req.amount);
    const after = before + amount;
    const txId = uid('ctx');
    const guard = uid('grd');
    try {
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET credits=?,last_credit_tx_id=?,updated_at=? WHERE id=? AND credits=?').bind(after,txId,at,req.reseller_id,before),
        env.DB.prepare("INSERT INTO tx_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM users WHERE id=? AND credits=? AND last_credit_tx_id=?) THEN 1 ELSE 0 END").bind(guard,req.reseller_id,after,txId),
        env.DB.prepare("UPDATE credit_requests SET status='approved',admin_note=?,resolved_at=?,resolved_by=? WHERE id=? AND status='pending'").bind(cleanText(body.note,300),at,user.id,requestId),
        env.DB.prepare("INSERT INTO credit_transactions(id,reseller_id,amount,type,reference_id,note,admin_id,balance_before,balance_after,created_at) VALUES(?,?,?,'credit_request',?,?,?,?,?,?)").bind(txId,req.reseller_id,amount,requestId,cleanText(body.note,300),user.id,before,after,at),
        env.DB.prepare("INSERT INTO audit_logs(id,actor_id,actor_role,action,entity_type,entity_id,details_json,ip_hash,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(uid('log'),user.id,user.role,'CREDIT_REQUEST_APPROVED','credit_request',requestId,JSON.stringify({amount,before,after}),await ipHash(request),(request.headers.get('user-agent')||'').slice(0,300),at),
        env.DB.prepare('DELETE FROM tx_guards WHERE id=?').bind(guard)
      ]);
      return json({ ok: true, before, after });
    } catch { return json({ error: 'CREDIT_CONFLICT_RETRY' }, 409); }
  }

  if (path === '/api/admin/apps' && method === 'POST') {
    const body = await bodyJson(request);
    const name = cleanText(body.name, 100);
    const platform = ['android','windows','receiver','other'].includes(body.platform) ? body.platform : 'other';
    const downloadUrl = cleanText(body.downloadUrl, 500);
    const visibility = ['all','admin','reseller'].includes(body.visibility) ? body.visibility : 'all';
    if (!name || !/^https?:\/\//i.test(downloadUrl)) return json({ error: 'INVALID_APP' }, 400);
    const id = uid('app');
    const at = now();
    await env.DB.prepare('INSERT INTO apps(id,name,platform,version,description,download_url,visibility,active,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?,?)')
      .bind(id,name,platform,cleanText(body.version,40),cleanText(body.description,500),downloadUrl,visibility,user.id,at,at).run();
    await audit(env, request, user, 'APP_ADDED', 'app', id, { name, platform, visibility });
    return json({ ok: true, id }, 201);
  }

  return json({ error: 'NOT_FOUND' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env);
      return env.ASSETS.fetch(request);
    } catch (e) {
      console.error('ACTIVE CODE MULTI worker error', e);
      if (url.pathname.startsWith('/api/')) return json({ error: 'INTERNAL_ERROR' }, 500);
      return env.ASSETS.fetch(request);
    }
  }
};