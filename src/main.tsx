import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const fmt = (v) => v ? new Date(v).toLocaleString('ar-EG') : '—';
const num = (v) => Number(v || 0).toLocaleString('en-US');

function Logo({ compact = false }) {
  return (
    <div className={'brand '+(compact?'compact':'')}>
      <div className="brandMark"><span>A</span><b>C</b><i>M</i></div>
      <div><strong>ACTIVE CODE</strong><em>MULTI</em></div>
    </div>
  );
}

function Login({ onAuth }) {
  const [form, setForm] = useState({ identifier:'', password:'' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/login', {
        method:'POST',
        credentials:'same-origin',
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ identifier:form.identifier, password:form.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'LOGIN_FAILED');
      onAuth(data.user, data.csrf);
    } catch (e) {
      const code = String(e.message || e);
      setError(
        code.includes('TOO_MANY_ATTEMPTS') ? 'محاولات كثيرة. تم إيقاف المحاولة مؤقتاً.' :
        code.includes('INVALID_LOGIN') ? 'اسم المستخدم / البريد الإلكتروني أو كلمة المرور غير صحيحة.' :
        code.includes('SYSTEM_NOT_INITIALIZED') ? 'حساب الإدارة الأول لم يتم تجهيزه بعد.' :
        'تعذر تسجيل الدخول.'
      );
    } finally { setBusy(false); }
  }

  return (
    <div className="loginPage">
      <div className="loginGlow glow1"/><div className="loginGlow glow2"/>
      <section className="loginVisual">
        <Logo/>
        <div className="visualCopy">
          <span className="eyebrow">SECURE DISTRIBUTION PLATFORM</span>
          <h1>إدارة الأكواد.<br/>بدون خلط.<br/><mark>بدون تكرار.</mark></h1>
          <p>دخول موحد وآمن. لا يوجد تسجيل حسابات من الصفحة العامة؛ جميع الحسابات تُنشأ من لوحة الإدارة فقط.</p>
        </div>
        <div className="securityStrip">
          <div>01 <b>Admin Managed</b></div>
          <div>02 <b>Server Isolation</b></div>
          <div>03 <b>Full Audit</b></div>
        </div>
      </section>
      <section className="loginCardWrap">
        <form className="loginCard" onSubmit={submit}>
          <div className="mobileBrand"><Logo compact/></div>
          <span className="panelTag">CONTROL PANEL</span>
          <h2>تسجيل الدخول</h2>
          <p>استخدم اسم المستخدم أو البريد الإلكتروني وكلمة المرور.</p>
          <label>Username or Email</label>
          <input value={form.identifier} onChange={e=>setForm({...form,identifier:e.target.value})} placeholder="username@example.com" autoCapitalize="none" autoComplete="username" required/>
          <label>Password</label>
          <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••••" autoComplete="current-password" required/>
          {error && <div className="errorBox">{error}</div>}
          <button className="primary wide" disabled={busy}>{busy ? 'جاري الدخول…' : 'دخول آمن'}</button>
          <small className="secureNote">Admin Managed Accounts • Session Protected • CSRF Guard</small>
        </form>
      </section>
    </div>
  );
}
function Stat({ label, value, sub }) {
  return <div className="stat"><span>{label}</span><strong>{num(value)}</strong>{sub && <small>{sub}</small>}</div>;
}

function Table({ children }) {
  return <div className="tableWrap"><table>{children}</table></div>;
}

function Panel({ user, csrf, onLogout }) {
  const isAdmin = user.role === 'admin';
  const adminTabs = [
    ['overview','الرئيسية','⌂'],
    ['servers','السيرفرات والباقات','◉'],
    ['import','رفع الأكواد','⇧'],
    ['resellers','الموزعون','♟'],
    ['issued','الأكواد المفعلة','▣'],
    ['credit','طلبات الكريدت','◈'],
    ['apps','التطبيقات والسوفت وير','A'],
    ['logs','السجل الكامل','◷']
  ];
  const resellerTabs = [
    ['issue','إنشاء الأكواد','＋'],
    ['mycodes','أكوادي','▣'],
    ['credit','طلب كريدت','◈'],
    ['apps','التطبيقات والسوفت وير','A'],
    ['logs','السجل','◷']
  ];
  const tabs = isAdmin ? adminTabs : resellerTabs;

  const [tab,setTab] = useState(tabs[0][0]);
  const [menuOpen,setMenuOpen] = useState(false);
  const [data,setData] = useState({ dashboard:null, servers:[], packages:[], resellers:[], codes:[], requests:[], apps:[], logs:[] });
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);

  async function call(path, options={}) {
    const method = options.method || 'GET';
    const headers = { ...(options.headers||{}) };
    if (method !== 'GET') headers['x-csrf-token'] = csrf;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(path,{...options,method,headers,credentials:'same-origin',body:options.body===undefined?undefined:JSON.stringify(options.body)});
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'REQUEST_FAILED');
    return out;
  }

  async function refresh() {
    try {
      const [dash, servers, apps, logs, requests] = await Promise.all([
        call('/api/dashboard'), call('/api/servers'), call('/api/apps'), call('/api/logs'), call('/api/credit-requests')
      ]);
      const next = {
        ...data,
        dashboard:dash,
        servers:servers.servers||[],
        packages:servers.packages||[],
        apps:apps.apps||[],
        logs:logs.logs||[],
        requests:requests.requests||[]
      };
      if (isAdmin) {
        const [resellers,codes] = await Promise.all([call('/api/admin/resellers'),call('/api/admin/codes')]);
        next.resellers = resellers.resellers||[];
        next.codes = codes.codes||[];
      } else {
        const codes = await call('/api/my-codes');
        next.codes = codes.codes||[];
      }
      setData(next);
    } catch (e) {
      if (String(e.message).includes('UNAUTHORIZED')) onLogout(true);
      else setNotice('تعذر تحديث بعض البيانات.');
    }
  }

  useEffect(()=>{ refresh(); },[]);
  useEffect(()=>{ const id=setInterval(refresh,30000); return()=>clearInterval(id); },[]);
  useEffect(()=>{
    if(!menuOpen) return;
    const y=window.scrollY;
    const body=document.body;
    const html=document.documentElement;
    const oldBody={
      position:body.style.position,
      top:body.style.top,
      width:body.style.width,
      overflow:body.style.overflow
    };
    const oldHtmlOverflow=html.style.overflow;
    const oldOverscroll=html.style.overscrollBehavior;

    body.style.position='fixed';
    body.style.top='-'+y+'px';
    body.style.width='100%';
    body.style.overflow='hidden';
    html.style.overflow='hidden';
    html.style.overscrollBehavior='none';

    return ()=>{
      body.style.position=oldBody.position;
      body.style.top=oldBody.top;
      body.style.width=oldBody.width;
      body.style.overflow=oldBody.overflow;
      html.style.overflow=oldHtmlOverflow;
      html.style.overscrollBehavior=oldOverscroll;
      window.scrollTo(0,y);
    };
  },[menuOpen]);

  async function action(path, body) {
    setBusy(true); setNotice('');
    try {
      const out = await call(path,{method:'POST',body});
      setNotice('تمت العملية بنجاح.');
      await refresh();
      return out;
    } catch (e) {
      const map = {
        INSUFFICIENT_CREDIT:'الرصيد غير كافٍ.',
        INSUFFICIENT_STOCK:'',
        SERVER_PACKAGE_MISMATCH:'الباكدج لا تتبع السيرفر المحدد.',
        ISSUE_CONFLICT_RETRY:'حدث تعارض لحظي أثناء الصرف. أعد المحاولة.',
        IMPORT_LIMIT_700:'الحد الحالي 700 كود في كل عملية رفع.',
        NEGATIVE_BALANCE_NOT_ALLOWED:'لا يمكن أن يصبح الرصيد بالسالب.',
        INVALID_RESELLER:'اكتب Username وPassword. لا يوجد حد أدنى.',
        ACCOUNT_EXISTS:'اسم المستخدم أو البريد الإلكتروني مستخدم من قبل.'
      };
      if(e.message==='INSUFFICIENT_STOCK'){
        setNotice('');
        return null;
      }
      setNotice(map[e.message] || 'لم تتم العملية: '+e.message);
      throw e;
    } finally { setBusy(false); }
  }

  async function logout() {
    try { await call('/api/logout',{method:'POST',body:{}}); } catch {}
    onLogout();
  }

  const activeLabel=tabs.find(x=>x[0]===tab)?.[1]||'الرئيسية';

  return (
    <div className="panelShell">
      <aside className={'fullSidebar '+(menuOpen?'open':'')}>
        <div className="sidebarTop">
          <Logo compact/>
          <button className="sidebarClose" onClick={()=>setMenuOpen(false)} aria-label="إغلاق">×</button>
        </div>

        <div className="sidebarLabel">NAVIGATION</div>

        <nav className="sidebarNav">
          {tabs.map(([id,label,icon])=>
            <button
              key={id}
              className={tab===id?'active':''}
              onClick={()=>{setTab(id);setMenuOpen(false);}}
            >
              <span className="sidebarIcon">{icon}</span>
              <span className="sidebarText">{label}</span>
              {id==='overview' && isAdmin &&
                <span className="sidebarBadge">{num(data.dashboard?.counts?.available||0)}</span>}
            </button>
          )}
        </nav>

        <div className="sidebarUser">
          <div className="sidebarAvatar">{(user.displayName||user.username||'U').slice(0,1).toUpperCase()}</div>
          <div>
            <b>{user.displayName||user.username}</b>
            <span>{isAdmin?'UNLIMITED CREDIT':num(data.dashboard?.user?.credits ?? user.credits)+' CREDIT'}</span>
          </div>
        </div>

        <button className="sidebarLogout" onClick={logout}>⇥ <span>تسجيل الخروج</span></button>
      </aside>

      {menuOpen && <button className="sidebarBackdrop" onClick={()=>setMenuOpen(false)} aria-label="إغلاق القائمة"/>}

      <main className="contentArea">
        <header className="contentHeader">
          <button className="sidebarOpen" onClick={()=>setMenuOpen(true)} aria-label="فتح القائمة">☰</button>
          <div>
            <span>ACTIVE CODE MULTI</span>
            <h1>{activeLabel}</h1>
          </div>
        </header>

        {notice && <div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}

        <div className="pageContent">
          {tab==='overview' && isAdmin && <AdminOverview data={data} onNavigate={setTab}/>}
          {tab==='servers' && isAdmin && <Servers data={data} action={action} busy={busy}/>}
          {tab==='import' && isAdmin && <ImportCodes data={data} action={action} busy={busy}/>}
          {tab==='resellers' && isAdmin && <Resellers data={data} action={action} busy={busy}/>}
          {tab==='issued' && isAdmin && <Codes codes={data.codes} admin/>}
          {tab==='credit' && isAdmin && <AdminCredit data={data} action={action} busy={busy}/>}
          {tab==='issue' && !isAdmin && <Issue data={data} action={action} busy={busy}/>}
          {tab==='mycodes' && !isAdmin && <Codes codes={data.codes}/>}
          {tab==='credit' && !isAdmin && <RequestCredit data={data} action={action} busy={busy}/>}
          {tab==='apps' && <Apps data={data} action={action} busy={busy} admin={isAdmin}/>}
          {tab==='logs' && <Logs logs={data.logs} admin={isAdmin}/>}
        </div>
      </main>
    </div>
  );
}

function AdminOverview({data,onNavigate}) {
  const c=data.dashboard?.counts||{};
  const cards=[
    {key:'available',label:'الأكواد المتاحة',value:c.available,sub:'Available Codes',tone:'green',icon:'✓',tab:'servers'},
    {key:'total',label:'إجمالي الأكواد',value:c.total_codes,sub:'Total Inventory',tone:'blue',icon:'▣',tab:'import'},
    {key:'issued',label:'الأكواد المفعلة',value:c.issued,sub:'Activated Codes',tone:'violet',icon:'⚡',tab:'issued'},
    {key:'resellers',label:'الموزعون',value:c.resellers,sub:'Reseller Accounts',tone:'orange',icon:'♟',tab:'resellers'},
    {key:'credits',label:'رصيد الأدمن',display:'∞',sub:'UNLIMITED CREDIT',tone:'cyan',icon:'▤',tab:'resellers'},
    {key:'requests',label:'طلبات الكريدت',value:c.pending_requests,sub:'Pending Requests',tone:'pink',icon:'◈',tab:'credit'}
  ];

  return <>
    <section className="offerCard">
      <div className="offerIcon">⌁</div>
      <div><h2>ACTIVE CODE MULTI</h2><p>إدارة الأكواد والموزعين من لوحة واحدة</p></div>
      <button onClick={()=>onNavigate?.('import')}>＋</button>
    </section>

    <div className="referenceCardGrid">
      {cards.map(card=><button key={card.key} className={'referenceCard '+card.tone} onClick={()=>onNavigate?.(card.tab)}>
        <div className="cardAccent"/>
        <div className="referenceIcon">{card.icon}</div>
        <span>{card.label}</span>
        <strong>{card.display ?? num(card.value)}</strong>
        <small>{card.sub}</small>
      </button>)}
    </div>

    <section className="section referenceInventory">
      <div className="referenceSectionTitle">
        <h2>المخزون حسب السيرفر</h2>
        <span>{num(c.active_packages)} باقات نشطة</span>
      </div>
      <div className="serverGrid">{data.servers.map(s=>{
        const packs=data.packages.filter(p=>p.server_id===s.id);
        return <button className="serverCard" key={s.id} onClick={()=>onNavigate?.('servers')}>
          <div className="serverTop"><b>{s.name}</b><span>{Number(s.active)===1?'ACTIVE':'OFF'}</span></div>
          <strong>{num(s.available_codes)}</strong><small>كود متاح</small>
          <div className="serverFoot"><span>الإجمالي {num(s.total_codes)}</span><span>المفعّل {num(s.issued_codes)}</span></div>
          <div className="packageMini">{packs.map(p=><div key={p.id}><span>{p.name}</span><b>{num(p.available_codes)}</b><em>{num(p.credit_cost)} Credit</em></div>)}</div>
        </button>
      })}</div>
    </section>
  </>;
}
function Servers({data,action,busy}) {
  const [server,setServer]=useState({name:'',lowStockThreshold:10,creditCost:1});

  return <section className="section">
    <div className="sectionHead">
      <div><span>SERVERS</span><h2>السيرفرات السنوية</h2></div>
      <small>كل سيرفر = اشتراك سنوي واحد</small>
    </div>

    <form className="formGrid" onSubmit={async e=>{
      e.preventDefault();
      await action('/api/admin/servers',server);
      setServer({name:'',lowStockThreshold:10,creditCost:1});
    }}>
      <label>اسم السيرفر</label>
      <input placeholder="مثال: Nova" value={server.name} onChange={e=>setServer({...server,name:e.target.value})} required/>

      <label>تكلفة الكود بالكريدت</label>
      <input type="number" min="0" placeholder="مثال: 1" value={server.creditCost} onChange={e=>setServer({...server,creditCost:e.target.value})} required/>

      <label>تنبيه المخزون المنخفض</label>
      <input type="number" min="0" placeholder="مثال: 10" value={server.lowStockThreshold} onChange={e=>setServer({...server,lowStockThreshold:e.target.value})}/>

      <button className="primary" disabled={busy}>إضافة سيرفر سنوي</button>
    </form>

    <div className="serverGrid adminServerGrid">
      {data.servers.map(s=>{
        const p=data.packages.find(p=>p.server_id===s.id&&Number(p.active)===1);
        return <div className="serverCard" key={s.id}>
          <div className="serverTop"><b>{s.name}</b><span>{Number(s.active)===1?'ACTIVE':'OFF'}</span></div>
          <strong>{num(s.available_codes)}</strong>
          <small>كود متاح</small>
          <div className="serverFoot">
            <span>الإجمالي {num(s.total_codes)}</span>
            <span>المفعّل {num(s.issued_codes)}</span>
          </div>
          <div className="packageMini">
            <div>
              <span>سنوي · 12 Months</span>
              <b>{num(p?.credit_cost||0)} Credit</b>
              <em>ثابت للسيرفر</em>
            </div>
          </div>
        </div>
      })}
    </div>
  </section>;
}
function ImportCodes({data,action,busy}) {
  const [form,setForm]=useState({serverId:'',filename:'codes.txt',text:''});
  const lines=form.text.replace(/\r/g,'').split('\n');
  const nonBlank=lines.map(x=>x.trim()).filter(Boolean);
  const unique=new Set(nonBlank);

  async function pickFile(e){
    const f=e.target.files?.[0];
    if(!f)return;
    setForm({...form,filename:f.name,text:await f.text()});
  }

  return <section className="section">
    <div className="sectionHead">
      <div><span>ANNUAL TXT STOCK</span><h2>رفع الأكواد السنوية</h2></div>
      <small>اختر السيرفر فقط — النظام يربط الباقة السنوية تلقائيًا</small>
    </div>

    <div className="importGrid">
      <form className="formGrid" onSubmit={async e=>{
        e.preventDefault();
        await action('/api/admin/import-codes',form);
        setForm({...form,text:''});
      }}>
        <label>السيرفر</label>
        <select value={form.serverId} onChange={e=>setForm({...form,serverId:e.target.value})} required>
          <option value="">اختر السيرفر</option>
          {data.servers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
        </select>

        <label className="filePick">اختيار ملف TXT<input type="file" accept=".txt,text/plain" onChange={pickFile}/></label>
        <textarea rows="14" placeholder="أو الصق الأكواد هنا — كود واحد في كل سطر" value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/>
        <button className="primary" disabled={busy||unique.size===0||!form.serverId}>استيراد المخزون</button>
      </form>

      <div className="previewBox">
        <span>معاينة قبل الرفع</span>
        <strong>{num(unique.size)}</strong>
        <b>كود سنوي فريد</b>
        <div>
          <em>{num(lines.length)} سطر</em>
          <em>{num(lines.length-nonBlank.length)} فارغ</em>
          <em>{num(nonBlank.length-unique.size)} مكرر داخل الملف</em>
        </div>
        <p>المكرر الموجود مسبقًا يتم تجاهله تلقائيًا. الأكواد تظل مرتبطة بالسيرفر المحدد فقط.</p>
      </div>
    </div>
  </section>;
}
function Resellers({data,action,busy}) {
  const [form,setForm]=useState({username:'',email:'',displayName:'',password:'',credits:0});
  const [credit,setCredit]=useState({resellerId:'',amount:1,note:''});
  return <div className="twoCol">
    <section className="section">
      <div className="sectionHead"><div><span>ACCOUNTS</span><h2>إضافة موزع</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/admin/resellers',form);setForm({username:'',email:'',displayName:'',password:'',credits:0});}}>
        <label>Username للدخول</label>
        <input placeholder="اكتب اليوزر كما تريد" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required/>
        <label>Email - اختياري</label>
        <input type="email" placeholder="يمكن تركه فارغًا" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <label>اسم الموزع - اختياري</label>
        <input placeholder="لو سيبته فاضي هياخد نفس Username" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})}/>
        <label>Password</label>
        <input type="password" placeholder="اكتب الباسورد كما تريد" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} autoComplete="new-password" required/>
        <label>رصيد البداية</label>
        <input type="number" min="0" placeholder="مثال: 50" value={form.credits} onChange={e=>setForm({...form,credits:e.target.value})}/>
        <button className="primary" disabled={busy}>إنشاء الموزع</button>
      </form>
      <hr/>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/admin/credit-adjust',credit);}}>
        <select value={credit.resellerId} onChange={e=>setCredit({...credit,resellerId:e.target.value})} required><option value="">اختر موزع</option>{data.resellers.map(r=><option value={r.id} key={r.id}>{r.display_name} — {r.credits}</option>)}</select>
        <input type="number" placeholder="+10 أو -5" value={credit.amount} onChange={e=>setCredit({...credit,amount:e.target.value})} required/>
        <input placeholder="ملاحظة" value={credit.note} onChange={e=>setCredit({...credit,note:e.target.value})}/>
        <button className="secondary" disabled={busy}>تعديل الرصيد</button>
      </form>
    </section>
    <section className="section">
      <div className="sectionHead"><div><span>RESELLERS</span><h2>الحسابات</h2></div></div>
      <Table><thead><tr><th>الموزع</th><th>Username</th><th>Email</th><th>الرصيد</th><th>الحالة</th></tr></thead><tbody>{data.resellers.map(r=><tr key={r.id}><td>{r.display_name}</td><td>{r.username}</td><td>{r.email||'—'}</td><td className="mono">{r.credits}</td><td><span className="badge">{r.status}</span></td></tr>)}</tbody></Table>
    </section>
  </div>;
}

function Codes({codes,admin=false}) {
  async function copy(v){await navigator.clipboard.writeText(v);}
  function download(){
    const text=codes.map(x=>x.code).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.download='active-code-multi.txt';a.click();URL.revokeObjectURL(a.href);
  }
  return <section className="section">
    <div className="sectionHead"><div><span>ISSUED CODES</span><h2>{admin?'كل الأكواد المفعلة':'أكوادي'}</h2></div><button className="secondary" onClick={download}>تنزيل TXT</button></div>
    <Table><thead><tr><th>الكود</th><th>السيرفر</th><th>الباكدج</th>{admin&&<th>الموزع</th>}<th>العميل</th><th>التاريخ</th><th>عملية</th></tr></thead>
    <tbody>{codes.map(c=><tr key={c.id}><td><button className="codeBtn mono" onClick={()=>copy(c.code)}>{c.code}</button></td><td>{c.server_name}</td><td>{c.package_name}</td>{admin&&<td>{c.reseller_name||c.reseller_username}</td>}<td>{c.customer_ref||'—'}</td><td>{fmt(c.issued_at)}</td><td className="mono tiny">{c.order_id}</td></tr>)}</tbody></Table>
  </section>;
}

function Issue({data,action,busy}) {
  const [form,setForm]=useState({serverId:'',customerRef:'',quantity:1});
  const [mode,setMode]=useState('single');
  const [result,setResult]=useState(null);

  const selected=data.servers.find(s=>s.id===form.serverId&&Number(s.active)===1);
  const q=mode==='single'?1:Math.max(1,Math.min(100,Number(form.quantity)||1));
  const unitCost=Number(selected?.credit_cost||0);
  const total=unitCost*q;
  const balance=Number(data.dashboard?.user?.credits||0);

  async function submit(e){
    e.preventDefault();
    const out=await action('/api/issue',{serverId:form.serverId,customerRef:form.customerRef,quantity:q});
    if(out) setResult(out);
  }
  async function copyAll(){await navigator.clipboard.writeText((result?.codes||[]).map(x=>x.code).join('\n'));}
  function download(){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([(result?.codes||[]).map(x=>x.code).join('\n')],{type:'text/plain'}));
    a.download=(result?.order?.server||'codes')+'-'+Date.now()+'.txt';
    a.click(); URL.revokeObjectURL(a.href);
  }

  return <section className="section issueUnified">
    <div className="resellerBalanceCard">
      <span>رصيدك الحالي</span>
      <strong>{num(balance)}</strong>
      <small>CREDIT</small>
    </div>

    <div className="sectionHead">
      <div><span>ANNUAL ISSUE CENTER</span><h2>إنشاء كود سنوي</h2></div>
      <small>جميع الأكواد اشتراك سنوي</small>
    </div>

    <div className="modeSwitch">
      <button type="button" className={mode==='single'?'active':''} onClick={()=>setMode('single')}>كود واحد</button>
      <button type="button" className={mode==='bulk'?'active':''} onClick={()=>setMode('bulk')}>مجموعة أكواد</button>
    </div>

    <form className="formGrid issueForm" onSubmit={submit}>
      <label>السيرفر</label>
      <select value={form.serverId} onChange={e=>{setForm({...form,serverId:e.target.value});setResult(null);}} required>
        <option value="">اختر السيرفر</option>
        {data.servers.filter(s=>Number(s.active)===1).map(s=>
          <option value={s.id} key={s.id}>{s.name} — {num(s.credit_cost)} Credit</option>
        )}
      </select>

      <label>اسم العميل أو رقم الهاتف</label>
      <input value={form.customerRef} onChange={e=>setForm({...form,customerRef:e.target.value})} placeholder="مثال: Ahmed أو 010..."/>

      {mode==='bulk'&&<>
        <label>عدد الأكواد</label>
        <input type="number" min="1" max="100" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
      </>}

      <div className="costBox">
        <div><span>العدد</span><b>{q}</b></div>
        <div><span>تكلفة الكود</span><b>{num(unitCost)} Credit</b></div>
        <div><span>الإجمالي</span><b>{num(total)} Credit</b></div>
        <div><span>رصيدك</span><b>{num(balance)} Credit</b></div>
      </div>

      <button className="primary wide" disabled={busy||!selected}>{busy?'جاري الصرف…':'تفعيل واستخراج'}</button>
    </form>

    <div className={'inlineResult '+(result?'hasResult':'')}>
      <div className="inlineResultHead">
        <div><span>RESULT</span><h3>الأكواد الناتجة</h3></div>
        {result&&<div className="rowBtns">
          <button className="secondary" type="button" onClick={copyAll}>نسخ الكل</button>
          <button className="secondary" type="button" onClick={download}>تنزيل TXT</button>
        </div>}
      </div>

      {!result ? <div className="emptyState compact">بعد التفعيل ستظهر الأكواد هنا مباشرة.</div> : <>
        <div className="resultMeta">
          <b>{result.order.server}</b>
          <span>سنوي</span>
          <em>{result.order.creditsBefore} → {result.order.creditsAfter} Credit</em>
        </div>
        <div className="issuedList">{result.codes.map(x=>
          <button key={x.id} className="issuedCode mono" onClick={()=>navigator.clipboard.writeText(x.code)}>{x.code}</button>
        )}</div>
      </>}
    </div>
  </section>;
}
function AdminCredit({data,action,busy}) {
  return <section className="section">
    <div className="sectionHead"><div><span>CREDIT REQUESTS</span><h2>طلبات الكريدت</h2></div></div>
    <Table><thead><tr><th>الموزع</th><th>الكمية</th><th>الملاحظة</th><th>الحالة</th><th>التاريخ</th><th>قرار</th></tr></thead>
    <tbody>{data.requests.map(r=><tr key={r.id}><td>{r.display_name||r.username}</td><td>{r.amount}</td><td>{r.note||'—'}</td><td><span className={'badge '+r.status}>{r.status}</span></td><td>{fmt(r.created_at)}</td><td>{r.status==='pending'?<div className="inlineBtns"><button disabled={busy} onClick={()=>action('/api/admin/credit-requests/resolve',{requestId:r.id,decision:'approved'})}>قبول</button><button disabled={busy} onClick={()=>action('/api/admin/credit-requests/resolve',{requestId:r.id,decision:'rejected'})}>رفض</button></div>:'—'}</td></tr>)}</tbody></Table>
  </section>;
}

function RequestCredit({data,action,busy}) {
  const [form,setForm]=useState({amount:10,note:''});
  return <div className="twoCol">
    <section className="section">
      <div className="sectionHead"><div><span>REQUEST CREDIT</span><h2>طلب رصيد</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/credit-requests',form);setForm({amount:10,note:''});}}>
        <input type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/>
        <textarea rows="5" placeholder="ملاحظة للـ Admin" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        <button className="primary" disabled={busy}>إرسال الطلب</button>
      </form>
    </section>
    <section className="section">
      <div className="sectionHead"><div><span>HISTORY</span><h2>طلباتي</h2></div></div>
      <div className="list">{data.requests.map(r=><div className="listRow" key={r.id}><b>{r.amount} نقطة</b><span className={'badge '+r.status}>{r.status}</span><small>{fmt(r.created_at)}</small></div>)}</div>
    </section>
  </div>;
}

function Apps({data,action,busy,admin}) {
  const [form,setForm]=useState({name:'',platform:'android',version:'',description:'',downloadUrl:'',visibility:'all'});
  return <div className={admin?'twoCol':''}>
    {admin&&<section className="section">
      <div className="sectionHead"><div><span>SOFTWARE CENTER</span><h2>إضافة تطبيق أو سوفت وير</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/admin/apps',form);setForm({...form,name:'',version:'',description:'',downloadUrl:''});}}>
        <input placeholder="الاسم" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
        <select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}><option value="android">Android</option><option value="windows">Windows</option><option value="receiver">Receiver Software</option><option value="other">Other</option></select>
        <input placeholder="Version" value={form.version} onChange={e=>setForm({...form,version:e.target.value})}/>
        <input placeholder="https:// download link" value={form.downloadUrl} onChange={e=>setForm({...form,downloadUrl:e.target.value})} required/>
        <textarea rows="4" placeholder="الوصف" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}><option value="all">للجميع</option><option value="reseller">للموزعين</option><option value="admin">للإدارة</option></select>
        <button className="primary" disabled={busy}>إضافة</button>
      </form>
    </section>}
    <section className="section">
      <div className="sectionHead"><div><span>DOWNLOADS</span><h2>التطبيقات والسوفت وير</h2></div></div>
      <div className="appGrid">{data.apps.map(a=><a className="downloadCard" href={a.download_url} target="_blank" rel="noreferrer" key={a.id}><span>{a.platform.toUpperCase()}</span><h3>{a.name}</h3><p>{a.description||'بدون وصف'}</p><div><b>{a.version||'Latest'}</b><em>تحميل ↗</em></div></a>)}</div>
    </section>
  </div>;
}

function Logs({logs,admin}) {
  return <section className="section logsSection">
    <div className="sectionHead"><div><span>AUDIT TRAIL</span><h2>{admin?'السجل المتكامل':'سجل حسابي'}</h2></div></div>

    <div className="desktopLogs">
      <Table><thead><tr>{admin&&<th>المستخدم</th>}<th>الحدث</th><th>النوع</th><th>التفاصيل</th><th>الوقت</th></tr></thead>
      <tbody>{logs.map(l=><tr key={l.id||l.created_at+l.action}>{admin&&<td>{l.actor_name||l.actor_username||'SYSTEM'}</td>}<td><span className="event">{l.action}</span></td><td>{l.entity_type||'—'}</td><td className="logDetails">{l.details_json||'{}'}</td><td>{fmt(l.created_at)}</td></tr>)}</tbody></Table>
    </div>

    <div className="mobileLogs">
      {logs.length===0 ? <div className="emptyState compact">لا توجد عمليات مسجلة بعد.</div> :
        logs.map(l=><article className="logCard" key={l.id||l.created_at+l.action}>
          <div className="logCardTop">
            <span className="event">{l.action}</span>
            <time>{fmt(l.created_at)}</time>
          </div>
          {admin&&<div className="logLine"><span>المستخدم</span><b>{l.actor_name||l.actor_username||'SYSTEM'}</b></div>}
          <div className="logLine"><span>النوع</span><b>{l.entity_type||'—'}</b></div>
          <details>
            <summary>التفاصيل</summary>
            <pre>{l.details_json||'{}'}</pre>
          </details>
        </article>)
      }
    </div>
  </section>;
}


function ForcePasswordChange({ csrf, onDone }) {
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  async function submit(e){
    e.preventDefault();
    setError('');
    if(newPassword.length<12){ setError('الباسورد الجديد لازم يكون 12 حرف على الأقل.'); return; }
    if(newPassword!==confirm){ setError('تأكيد الباسورد غير مطابق.'); return; }
    setBusy(true);
    try{
      const res=await fetch('/api/admin/change-password',{
        method:'POST',
        credentials:'same-origin',
        headers:{'content-type':'application/json','x-csrf-token':csrf},
        body:JSON.stringify({currentPassword,newPassword})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'FAILED');
      onDone();
    }catch(e){
      const code=String(e.message||e);
      setError(
        code.includes('CURRENT_PASSWORD_WRONG')?'الباسورد المؤقت الحالي غير صحيح.':
        code.includes('PASSWORD_TOO_SHORT')?'الباسورد الجديد لازم يكون 12 حرف على الأقل.':
        'تعذر تغيير الباسورد.'
      );
    }finally{setBusy(false);}
  }

  return <div className="loginPage">
    <div className="loginGlow glow1"/><div className="loginGlow glow2"/>
    <section className="loginVisual">
      <Logo/>
      <div className="visualCopy">
        <span className="eyebrow">OWNER SECURITY</span>
        <h1>تأمين حساب<br/>المالك أولاً.</h1>
        <p>لا يمكن استخدام لوحة الإدارة قبل تغيير كلمة المرور المؤقتة إلى كلمة مرور خاصة بك.</p>
      </div>
      <div className="securityStrip">
        <div>01 <b>One-Time Password</b></div>
        <div>02 <b>Private Admin Access</b></div>
        <div>03 <b>Audit Protected</b></div>
      </div>
    </section>
    <section className="loginCardWrap">
      <form className="loginCard" onSubmit={submit}>
        <div className="mobileBrand"><Logo compact/></div>
        <span className="panelTag">REQUIRED SECURITY STEP</span>
        <h2>تغيير كلمة المرور</h2>
        <p>اكتب الباسورد المؤقت الحالي، وبعدها اختار باسورد جديد خاص بيك.</p>
        <label>Current temporary password</label>
        <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password" required/>
        <label>New password</label>
        <input type="password" minLength="12" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" required/>
        <label>Confirm new password</label>
        <input type="password" minLength="12" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/>
        {error&&<div className="errorBox">{error}</div>}
        <button className="primary wide" disabled={busy}>{busy?'جاري الحفظ…':'حفظ الباسورد الجديد'}</button>
        <small className="secureNote">This step is required once only</small>
      </form>
    </section>
  </div>;
}

function App() {
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState(null);
  const [csrf,setCsrf]=useState('');

  async function boot() {
    try {
      const r=await fetch('/api/me',{credentials:'same-origin'});
      if (r.ok) {
        const d=await r.json();
        setUser(d.user);
        setCsrf(d.csrf);
      }
    } finally { setLoading(false); }
  }

  useEffect(()=>{boot();},[]);
  if (loading) return <div className="splash"><Logo/><span>SECURE STARTUP</span></div>;
  if (!user) return <Login onAuth={(u,c)=>{setUser(u);setCsrf(c);}}/>;
  if (user.mustChangePassword) return <ForcePasswordChange csrf={csrf} onDone={()=>setUser({...user,mustChangePassword:false})}/>;
  return <Panel user={user} csrf={csrf} onLogout={()=>{setUser(null);setCsrf('');}}/>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
