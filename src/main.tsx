import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const fmt = (v) => v ? new Date(v).toLocaleString('ar-EG') : '—';
const num = (v) => Number(v || 0).toLocaleString('en-US');

const panelStateKey = (role, key) => `acm:${role}:${key}`;
function readPanelTab(role, allowed){
  try{
    const saved=sessionStorage.getItem(panelStateKey(role,'tab'));
    return allowed.includes(saved)?saved:'overview';
  }catch{return 'overview';}
}
function readPanelScroll(role, tab){
  try{return Math.max(0,Number(sessionStorage.getItem(panelStateKey(role,'scroll:'+tab))||0));}
  catch{return 0;}
}

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

function NavIcon({name}) {
  const common={width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true'};
  const paths={
    home:<><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>,
    server:<><rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h4M12 17h4"/></>,
    inventory:<><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z"/><path d="M4 12l8 4.5 8-4.5M4 16.5 12 21l8-4.5"/></>,
    upload:<><path d="M12 16V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 20h14"/></>,
    users:<><path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20"/><circle cx="10" cy="7" r="3"/><path d="M17 11a3 3 0 0 0 0-6M19 20v-1a4 4 0 0 0-2.5-3.7"/></>,
    userPlus:<><circle cx="9" cy="7" r="3"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20M18 8v6M15 11h6"/></>,
    manageUsers:<><circle cx="8" cy="8" r="3"/><path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h2"/><path d="m15 14 1.5-1.5 3 3L18 17l-3-3Zm0 0-3.5 3.5V21H15l3-3"/></>,
    codes:<><path d="M7 5h10a2 2 0 0 1 2 2v3a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5V7a2 2 0 0 1 2-2Z"/><path d="M12 8v8"/></>,
    issue:<><path d="M6 4h9l3 3v13H6z"/><path d="M14 4v4h4M9 13h6M12 10v6"/></>,
    credit:<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/></>,
    apps:<><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></>,
    logs:<><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></>
  };
  return <svg {...common}>{paths[name]||paths.home}</svg>;
}

function Panel({ user, csrf, onLogout }) {
  const isAdmin = user.role === 'admin';
  const adminNav = [
    {id:'overview',label:'الرئيسية',icon:'home'},
    {id:'servers',label:'إضافة سيرفر',icon:'server'},
    {id:'inventory',label:'المخزون',icon:'inventory'},
    {id:'import',label:'رفع الأكواد',icon:'upload'},
    {id:'resellers',label:'الموزعون',icon:'users',children:[
      {id:'reseller-create',label:'إنشاء موزع',icon:'userPlus'},
      {id:'reseller-manage',label:'إدارة الموزعين',icon:'manageUsers'}
    ]},
    {id:'issued',label:'الأكواد المفعلة',icon:'codes'},
    {id:'credit',label:'طلبات الكريدت',icon:'credit'},
    {id:'apps',label:'التطبيقات والسوفت وير',icon:'apps'},
    {id:'logs',label:'السجل الكامل',icon:'logs'}
  ];
  const resellerNav = [
    {id:'overview',label:'الرئيسية',icon:'home'},
    {id:'issue',label:'إنشاء الأكواد',icon:'issue'},
    {id:'mycodes',label:'أكوادي',icon:'codes'},
    {id:'credit',label:'طلب كريدت',icon:'credit'},
    {id:'apps',label:'التطبيقات والسوفت وير',icon:'apps'},
    {id:'logs',label:'السجل',icon:'logs'}
  ];
  const navItems = isAdmin ? adminNav : resellerNav;
  const allowedTabs = useMemo(()=>navItems.flatMap(item=>item.children?[item.id,...item.children.map(x=>x.id)]:[item.id]).filter(id=>id!=='resellers'),[isAdmin]);
  const initialTab = useMemo(()=>readPanelTab(user.role,allowedTabs),[user.role]);
  const [tab,setTab] = useState(initialTab);
  const [menuOpen,setMenuOpen] = useState(false);
  const [resellerPocketOpen,setResellerPocketOpen] = useState(()=>['reseller-create','reseller-manage'].includes(initialTab));
  const [data,setData] = useState({ dashboard:null, servers:[], packages:[], resellers:[], codes:[], requests:[], apps:[], logs:[] });
  const [dataReady,setDataReady] = useState(false);
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
      else setNotice('تعذر تحديث البيانات.');
    } finally {
      setDataReady(true);
    }
  }

  useEffect(()=>{ refresh(); },[]);
  useEffect(()=>{ const id=setInterval(refresh,30000); return()=>clearInterval(id); },[]);

  useEffect(()=>{
    try{sessionStorage.setItem(panelStateKey(user.role,'tab'),tab);}catch{}
    if(['reseller-create','reseller-manage'].includes(tab)) setResellerPocketOpen(true);
    if(!dataReady) return;
    const y=readPanelScroll(user.role,tab);
    const raf=requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'})));
    return()=>cancelAnimationFrame(raf);
  },[tab,user.role,dataReady]);

  useEffect(()=>{
    let timer=0;
    const save=()=>{
      clearTimeout(timer);
      timer=window.setTimeout(()=>{
        try{sessionStorage.setItem(panelStateKey(user.role,'scroll:'+tab),String(Math.max(0,window.scrollY||0)));}catch{}
      },80);
    };
    window.addEventListener('scroll',save,{passive:true});
    const onPageHide=()=>{
      try{sessionStorage.setItem(panelStateKey(user.role,'scroll:'+tab),String(Math.max(0,window.scrollY||0)));}catch{}
    };
    window.addEventListener('pagehide',onPageHide);
    return()=>{
      clearTimeout(timer);
      window.removeEventListener('scroll',save);
      window.removeEventListener('pagehide',onPageHide);
      onPageHide();
    };
  },[tab,user.role]);
  useEffect(()=>{
    if(!menuOpen) return;
    const y=window.scrollY;
    const body=document.body;
    const html=document.documentElement;
    const oldBody={position:body.style.position,top:body.style.top,width:body.style.width,overflow:body.style.overflow};
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
      if(path!=='/api/issue') setNotice('تمت العملية بنجاح.');
      await refresh();
      return out;
    } catch (e) {
      const map = {
        INSUFFICIENT_CREDIT:'الرصيد غير كافٍ.',
        INSUFFICIENT_STOCK:'',
        SERVER_PACKAGE_MISMATCH:'تعذر تحديد السيرفر.',
        ISSUE_CONFLICT_RETRY:'تعذر التفعيل. حاول مرة أخرى.',
        IMPORT_LIMIT_700:'الحد الحالي 700 كود في كل عملية رفع.',
        NEGATIVE_BALANCE_NOT_ALLOWED:'لا يمكن أن يصبح الرصيد بالسالب.',
        INVALID_RESELLER:'تحقق من بيانات الموزع.',
        ACCOUNT_EXISTS:'اسم المستخدم أو البريد الإلكتروني مستخدم من قبل.',
        INVALID_APP:'تحقق من رابط الصورة ورابط التحميل.'
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

  function goTo(id){
    try{
      sessionStorage.setItem(panelStateKey(user.role,'scroll:'+tab),String(Math.max(0,window.scrollY||0)));
      sessionStorage.setItem(panelStateKey(user.role,'tab'),id);
    }catch{}
    setTab(id);
    setMenuOpen(false);
  }

  return (
    <div className="panelShell">
      <aside className={'fullSidebar '+(menuOpen?'open':'')}>
        <div className="sidebarTop">
          <Logo compact/>
          <button className="sidebarClose" onClick={()=>setMenuOpen(false)} aria-label="إغلاق">
            <span>×</span>
          </button>
        </div>

        <div className="sidebarAccountCard">
          <div className="sidebarAvatar">{(user.displayName||user.username||'U').slice(0,1).toUpperCase()}</div>
          <div className="sidebarAccountCopy">
            <span>{isAdmin?'ADMIN PANEL':'RESELLER PANEL'}</span>
            <b>{user.displayName||user.username}</b>
            {!isAdmin&&<small>{num(data.dashboard?.user?.credits ?? user.credits)} CREDIT</small>}
          </div>
          <span className="sidebarOnlineDot" title="Online"/>
        </div>

        <div className="sidebarSectionTitle">القائمة</div>

        <nav className="sidebarNav">
          {navItems.map(item=>{
            if(item.children){
              const childActive=item.children.some(x=>x.id===tab);
              return <div className={'sidebarPocket '+(childActive?'active':'')+' '+(resellerPocketOpen?'expanded':'')} key={item.id}>
                <button
                  type="button"
                  className={'sidebarPocketHead '+(childActive?'active':'')}
                  onClick={()=>setResellerPocketOpen(v=>!v)}
                >
                  <span className="sidebarIcon"><NavIcon name={item.icon}/></span>
                  <span className="sidebarText">{item.label}</span>
                  <span className="sidebarChevron">{resellerPocketOpen?'⌃':'⌄'}</span>
                </button>
                <div className={'sidebarSubnav '+(resellerPocketOpen?'show':'')}>
                  {item.children.map(child=><button
                    type="button"
                    key={child.id}
                    className={tab===child.id?'active':''}
                    onClick={()=>goTo(child.id)}
                  >
                    <span className="sidebarSubIcon"><NavIcon name={child.icon}/></span>
                    <span>{child.label}</span>
                  </button>)}
                </div>
              </div>;
            }
            return <button
              type="button"
              key={item.id}
              className={tab===item.id?'active':''}
              onClick={()=>goTo(item.id)}
            >
              <span className="sidebarIcon"><NavIcon name={item.icon}/></span>
              <span className="sidebarText">{item.label}</span>
              <span className="sidebarNavArrow">›</span>
            </button>;
          })}
        </nav>

        <div className="sidebarFooter">
          <button className="sidebarLogout" onClick={logout}>
            <span className="sidebarLogoutIcon">↪</span>
            <span>تسجيل الخروج</span>
          </button>
          <small>ACTIVE CODE MULTI</small>
        </div>
      </aside>

      {menuOpen && <button className="sidebarBackdrop" onClick={()=>setMenuOpen(false)} aria-label="إغلاق القائمة"/>}

      <main className="contentArea">
        <header className="contentHeader">
          <button className="sidebarOpen" onClick={()=>setMenuOpen(true)} aria-label="فتح القائمة">☰</button>
          <div className="contentBrand">
            <span>ACTIVE CODE MULTI</span>
          </div>
        </header>

        {notice && <div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}

        <div className="pageContent">
          {!dataReady ? <div className="panelPageSkeleton" aria-hidden="true">
            <div className="panelSkeletonTitle"/>
            <div className="panelSkeletonCards"><span/><span/><span/><span/></div>
          </div> : <>
          {tab==='overview' && isAdmin && <AdminOverview data={data}/>}
          {tab==='overview' && !isAdmin && <ResellerOverview data={data}/>}
          {tab==='servers' && isAdmin && <Servers action={action} busy={busy}/>}
          {tab==='inventory' && isAdmin && <Inventory data={data}/>}
          {tab==='import' && isAdmin && <ImportCodes data={data} action={action} busy={busy}/>}
          {tab==='reseller-create' && isAdmin && <CreateReseller action={action} busy={busy}/>}
          {tab==='reseller-manage' && isAdmin && <ManageResellers data={data} action={action} busy={busy}/>}
          {tab==='issued' && isAdmin && <Codes codes={data.codes} admin/>}
          {tab==='credit' && isAdmin && <AdminCredit data={data} action={action} busy={busy}/>}
          {tab==='issue' && !isAdmin && <Issue data={data} action={action} busy={busy}/>}
          {tab==='mycodes' && !isAdmin && <Codes codes={data.codes}/>}
          {tab==='credit' && !isAdmin && <RequestCredit data={data} action={action} busy={busy}/>}
          {tab==='apps' && <Apps data={data} action={action} busy={busy} admin={isAdmin}/>}
          {tab==='logs' && <Logs logs={data.logs} admin={isAdmin}/>}
          </>}
        </div>
      </main>
    </div>
  );
}

function AdminOverview({data}) {
  const c=data.dashboard?.counts||{};
  const stats=[
    {label:'إجمالي الأكواد',value:c.total_codes,tone:'blue'},
    {label:'الأكواد المتاحة',value:c.available,tone:'green'},
    {label:'الأكواد المفعلة',value:c.issued,tone:'violet'},
    {label:'الموزعون',value:c.resellers,tone:'orange'},
    {label:'طلبات الكريدت',value:c.pending_requests,tone:'pink'},
    {label:'رصيد الموزعين',value:c.reseller_credits,tone:'cyan'}
  ];

  return <section className="section dashboardSummary premiumDashboard">
    <div className="dashboardHeader">
      <div>
        <h2>الرئيسية</h2>
        <span>آخر حالة مسجلة للوحة</span>
      </div>
      <div className="adminBalanceOpen">
        <span>رصيد الإدارة</span>
        <b>∞</b>
      </div>
    </div>

    <div className="dashboardStats premiumStats">
      {stats.map(item=><div className={'dashboardStat '+item.tone} key={item.label}>
        <span>{item.label}</span>
        <strong>{num(item.value)}</strong>
      </div>)}
    </div>
  </section>;
}

function ResellerOverview({data}) {
  const c=data.dashboard?.counts||{};
  const balance=Number(data.dashboard?.user?.credits||0);
  const recentCodes=(data.codes||[]).slice(0,4);
  const recentRequests=(data.requests||[]).slice(0,4);

  return <>
    <section className="section resellerHome">
      <div className="resellerHomeTop">
        <div>
          <h2>الرئيسية</h2>
          <span>{data.dashboard?.user?.displayName||data.dashboard?.user?.username||''}</span>
        </div>
        <div className="resellerMainBalance">
          <span>الرصيد</span>
          <strong>{num(balance)}</strong>
          <small>CREDIT</small>
        </div>
      </div>

      <div className="resellerQuickStats">
        <div><span>أكوادي</span><strong>{num(c.issued)}</strong></div>
        <div><span>طلبات الرصيد المعلقة</span><strong>{num(c.pending_requests)}</strong></div>
      </div>
    </section>

    <div className="twoCol dashboardDetails">
      <section className="section">
        <div className="sectionHead"><div><h2>آخر الأكواد</h2></div></div>
        {recentCodes.length===0 ? <div className="emptyState compact">لا توجد أكواد حتى الآن.</div> :
          <div className="list">
            {recentCodes.map(x=><div className="listRow recentCodeRow" key={x.id}>
              <div><b>{x.server_name}</b><span>{x.customer_ref||'—'}</span></div>
              <code>{x.code}</code>
              <small>{fmt(x.issued_at)}</small>
            </div>)}
          </div>}
      </section>

      <section className="section">
        <div className="sectionHead"><div><h2>طلبات الرصيد</h2></div></div>
        {recentRequests.length===0 ? <div className="emptyState compact">لا توجد طلبات رصيد.</div> :
          <div className="list">
            {recentRequests.map(r=><div className="listRow" key={r.id}>
              <b>{num(r.amount)} Credit</b>
              <span className={'badge '+r.status}>{r.status}</span>
              <small>{fmt(r.created_at)}</small>
            </div>)}
          </div>}
      </section>
    </div>
  </>;
}

function Servers({action,busy}) {
  const [server,setServer]=useState({name:'',lowStockThreshold:10,creditCost:1});

  return <section className="section focusedForm">
    <div className="sectionHead"><div><h2>إضافة سيرفر</h2></div></div>

    <form className="formGrid" onSubmit={async e=>{
      e.preventDefault();
      await action('/api/admin/servers',server);
      setServer({name:'',lowStockThreshold:10,creditCost:1});
    }}>
      <label>اسم السيرفر</label>
      <input placeholder="مثال: Nova" value={server.name} onChange={e=>setServer({...server,name:e.target.value})} required/>

      <label>تكلفة الكود بالكريدت</label>
      <input type="number" min="0" value={server.creditCost} onChange={e=>setServer({...server,creditCost:e.target.value})} required/>

      <label>تنبيه انخفاض المخزون</label>
      <input type="number" min="0" value={server.lowStockThreshold} onChange={e=>setServer({...server,lowStockThreshold:e.target.value})}/>

      <button className="primary" disabled={busy}>إضافة سيرفر</button>
    </form>
  </section>;
}

function Inventory({data}) {
  return <section className="section">
    <div className="sectionHead">
      <div><h2>المخزون</h2></div>
      <small>{num(data.servers.length)} سيرفر</small>
    </div>

    <div className="inventoryGrid">
      {data.servers.map(s=>{
        const p=data.packages.find(p=>p.server_id===s.id&&Number(p.active)===1);
        const low=Number(s.available_codes)<=Number(s.low_stock_threshold||0);
        return <article className={'inventoryCard '+(low?'low':'')} key={s.id}>
          <div className="inventoryCardHead">
            <div><span>السيرفر</span><b>{s.name}</b></div>
            <em>{Number(s.active)===1?'نشط':'متوقف'}</em>
          </div>
          <div className="inventoryNumbers">
            <div><span>المتاح</span><strong>{num(s.available_codes)}</strong></div>
            <div><span>المفعّل</span><strong>{num(s.issued_codes)}</strong></div>
            <div><span>الإجمالي</span><strong>{num(s.total_codes)}</strong></div>
          </div>
          <div className="inventoryFoot">
            <span>{num(p?.credit_cost||0)} Credit</span>
            <span>تنبيه عند {num(s.low_stock_threshold||0)}</span>
          </div>
        </article>
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
      <div><h2>رفع الأكواد</h2></div>
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
        <b>كود فريد</b>
        <div>
          <em>{num(lines.length)} سطر</em>
          <em>{num(lines.length-nonBlank.length)} فارغ</em>
          <em>{num(nonBlank.length-unique.size)} مكرر داخل الملف</em>
        </div>
        <p>المكرر يتم تجاهله تلقائيًا.</p>
      </div>
    </div>
  </section>;
}
function CreateReseller({action,busy}) {
  const [form,setForm]=useState({username:'',email:'',displayName:'',password:'',credits:0});
  const [showPassword,setShowPassword]=useState(false);

  async function submit(e){
    e.preventDefault();
    await action('/api/admin/resellers',form);
    setForm({username:'',email:'',displayName:'',password:'',credits:0});
    setShowPassword(false);
  }

  return <section className="section resellerCreatePage">
    <div className="resellerCreateHeader">
      <div className="resellerCreateIcon"><NavIcon name="userPlus"/></div>
      <div>
        <span>ACCOUNTS</span>
        <h2>إنشاء موزع</h2>
        <p>بيانات الحساب والرصيد في خطوة واحدة.</p>
      </div>
    </div>

    <form className="resellerCreateForm" onSubmit={submit}>
      <div className="resellerFormGroup">
        <div className="resellerFormGroupHead">
          <span className="groupStep">01</span>
          <div><b>بيانات الدخول</b><small>Username وكلمة المرور</small></div>
        </div>

        <div className="resellerFieldsGrid">
          <label className="resellerField">
            <span>Username</span>
            <input
              placeholder="اسم الدخول"
              value={form.username}
              onChange={e=>setForm({...form,username:e.target.value})}
              autoComplete="off"
              required
            />
          </label>

          <label className="resellerField">
            <span>Password</span>
            <div className="passwordFieldWrap">
              <input
                type={showPassword?'text':'password'}
                placeholder="كلمة المرور"
                value={form.password}
                onChange={e=>setForm({...form,password:e.target.value})}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="passwordToggle"
                onClick={()=>setShowPassword(v=>!v)}
                aria-label={showPassword?'إخفاء كلمة المرور':'إظهار كلمة المرور'}
              >{showPassword?'إخفاء':'إظهار'}</button>
            </div>
          </label>

          <label className="resellerField resellerFieldWide">
            <span>Email <em>اختياري</em></span>
            <input
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})}
            />
          </label>
        </div>
      </div>

      <div className="resellerFormGroup">
        <div className="resellerFormGroupHead">
          <span className="groupStep">02</span>
          <div><b>بيانات الحساب</b><small>اسم العرض والرصيد</small></div>
        </div>

        <div className="resellerFieldsGrid accountGrid">
          <label className="resellerField">
            <span>اسم الموزع <em>اختياري</em></span>
            <input
              placeholder="اسم العرض"
              value={form.displayName}
              onChange={e=>setForm({...form,displayName:e.target.value})}
            />
          </label>

          <label className="resellerField creditStartField">
            <span>رصيد البداية</span>
            <div className="creditInputWrap">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.credits}
                onChange={e=>setForm({...form,credits:e.target.value})}
              />
              <b>CREDIT</b>
            </div>
          </label>
        </div>
      </div>

      <div className="resellerCreateFooter">
        <div className="createAccountState">
          <span className="createStateDot"/>
          <div><b>الحساب سيُنشأ نشطًا</b><small>يمكن تعديل الرصيد لاحقًا من إدارة الموزعين.</small></div>
        </div>
        <button className="primary createResellerBtn" disabled={busy}>
          <NavIcon name="userPlus"/>
          <span>{busy?'جارٍ الإنشاء':'إنشاء الموزع'}</span>
        </button>
      </div>
    </form>
  </section>;
}

function ManageResellers({data,action,busy}) {
  const [amounts,setAmounts]=useState({});

  function countryName(code){
    if(!code) return 'غير متاح';
    try{
      return new Intl.DisplayNames(['ar'],{type:'region'}).of(String(code).toUpperCase())||code;
    }catch{return code;}
  }

  async function addCredit(reseller){
    const amount=Math.trunc(Number(amounts[reseller.id]||0));
    if(!Number.isSafeInteger(amount)||amount<=0) return;
    await action('/api/admin/credit-adjust',{resellerId:reseller.id,amount,note:'إضافة رصيد من إدارة الموزعين'});
    setAmounts(v=>({...v,[reseller.id]:''}));
  }

  return <section className="section resellerManagementPage">
    <div className="resellerManagementHeader">
      <div>
        <h2>إدارة الموزعين</h2>
        <span>{num(data.resellers.length)} موزع</span>
      </div>
      <div className="managementSummary">
        <div><span>إجمالي الرصيد</span><b>{num(data.resellers.reduce((sum,r)=>sum+Number(r.credits||0),0))}</b></div>
        <div><span>إجمالي الأكواد</span><b>{num(data.resellers.reduce((sum,r)=>sum+Number(r.issued_codes||0),0))}</b></div>
      </div>
    </div>

    {data.resellers.length===0 ? <div className="emptyState compact">لا يوجد موزعون حتى الآن.</div> :
      <div className="resellerManagementGrid">
        {data.resellers.map(r=>{
          const d=r.last_login_at?new Date(r.last_login_at):null;
          const lastLogin=d&&!Number.isNaN(d.getTime())
            ? d.toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
            : 'لم يسجل دخول بعد';

          return <article className="resellerProfileCard" key={r.id}>
            <div className="resellerProfileTop">
              <div className="resellerIdentityBlock">
                <div className="resellerInitial">{(r.display_name||r.username||'R').slice(0,1).toUpperCase()}</div>
                <div>
                  <b>{r.display_name||r.username}</b>
                  <span>@{r.username}</span>
                </div>
              </div>
              <span className={'resellerStatus '+(r.status==='active'?'active':'blocked')}>
                {r.status==='active'?'نشط':'متوقف'}
              </span>
            </div>

            <div className="resellerMetricGrid">
              <div>
                <span>الرصيد</span>
                <strong>{num(r.credits)}</strong>
                <small>CREDIT</small>
              </div>
              <div>
                <span>عدد الأكواد</span>
                <strong>{num(r.issued_codes)}</strong>
                <small>CODE</small>
              </div>
            </div>

            <div className="resellerInfoGrid">
              <div>
                <span>الدولة</span>
                <b>{countryName(r.last_country)}</b>
              </div>
              <div>
                <span>IP آخر دخول</span>
                <b className="mono resellerIp">{r.last_login_ip||'—'}</b>
              </div>
              <div className="resellerLastLogin">
                <span>آخر دخول</span>
                <b>{lastLogin}</b>
              </div>
              {r.email&&<div className="resellerEmailInfo">
                <span>Email</span>
                <b>{r.email}</b>
              </div>}
            </div>

            <div className="inlineCreditControl">
              <div>
                <span>إضافة رصيد</span>
                <div className="creditMiniInput">
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="0"
                    value={amounts[r.id]??''}
                    onChange={e=>setAmounts(v=>({...v,[r.id]:e.target.value}))}
                  />
                  <small>CREDIT</small>
                </div>
              </div>
              <button
                type="button"
                disabled={busy||Number(amounts[r.id]||0)<=0}
                onClick={()=>addCredit(r)}
              >إضافة</button>
            </div>
          </article>;
        })}
      </div>
    }
  </section>;
}

function Codes({codes,admin=false}) {
  const [openId,setOpenId]=useState(null);

  async function copy(v){await navigator.clipboard.writeText(v);}
  function download(){
    const text=codes.map(x=>x.code).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
    a.download='active-code-multi.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return <section className="section codesSection">
    <div className="sectionHead">
      <div><span>ISSUED CODES</span><h2>{admin?'كل الأكواد المفعلة':'أكوادي'}</h2></div>
      {codes.length>0&&<button className="secondary" onClick={download}>تنزيل TXT</button>}
    </div>

    {codes.length===0 ? <div className="emptyState compact">لا توجد أكواد حتى الآن.</div> :
      <div className="codesAccordion">
        {codes.map(c=>{
          const isOpen=openId===c.id;
          const d=c.issued_at?new Date(c.issued_at):null;
          const dateText=d&&!Number.isNaN(d.getTime())?d.toLocaleDateString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit'}):'—';
          const timeText=d&&!Number.isNaN(d.getTime())?d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}):'—';

          return <article className={'codeAccordionCard '+(isOpen?'open':'')} key={c.id}>
            <button
              type="button"
              className="codeAccordionSummary"
              onClick={()=>setOpenId(isOpen?null:c.id)}
              aria-expanded={isOpen}
            >
              <div className="codeAccordionServer">
                <span>السيرفر</span>
                <b>{c.server_name}</b>
              </div>

              <div className={'codeAccordionCode mono '+(admin?'adminUsedCode':'')}>{c.code}</div>

              <span className="codeAccordionStatus">مفعّل</span>
              <span className="codeAccordionToggle">{isOpen?'−':'+'}</span>
            </button>

            {isOpen&&<div className="codeAccordionDetails">
              <div className="codeDetailGrid">
                {admin&&<div><span>الموزع</span><b>{c.reseller_name||c.reseller_username||'—'}</b></div>}
                <div><span>العميل</span><b>{c.customer_ref||'—'}</b></div>
                <div><span>تاريخ السحب</span><b>{dateText}</b></div>
                <div><span>الوقت</span><b>{timeText}</b></div>
                <div><span>المدة</span><b>سنوي</b></div>
              </div>

              <button type="button" className="copyCodeBtn" onClick={()=>copy(c.code)}>نسخ الكود</button>
            </div>}
          </article>
        })}
      </div>
    }
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
      <div><span>ISSUE CODE</span><h2>إنشاء كود</h2></div>
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

      <button className="primary wide" disabled={busy||!selected}>تفعيل</button>
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
  const [form,setForm]=useState({name:'',platform:'android',version:'',description:'',imageUrl:'',downloadUrl:'',visibility:'all'});

  return <div className={admin?'twoCol appsLayout':'appsSingle'}>
    {admin&&<section className="section">
      <div className="sectionHead"><div><h2>إضافة تطبيق أو سوفت وير</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{
        e.preventDefault();
        await action('/api/admin/apps',form);
        setForm({...form,name:'',version:'',description:'',imageUrl:'',downloadUrl:''});
      }}>
        <label>الاسم</label>
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>

        <label>النوع</label>
        <select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}>
          <option value="android">Android</option>
          <option value="windows">Windows</option>
          <option value="receiver">Receiver Software</option>
          <option value="other">Other</option>
        </select>

        <label>Version</label>
        <input value={form.version} onChange={e=>setForm({...form,version:e.target.value})}/>

        <label>رابط الصورة / البوستر</label>
        <input type="url" placeholder="https://..." value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})}/>
        {form.imageUrl&&<div className="appPosterPreview"><img src={form.imageUrl} alt="" onError={e=>{e.currentTarget.style.display='none';}}/></div>}

        <label>رابط التحميل</label>
        <input type="url" placeholder="https://..." value={form.downloadUrl} onChange={e=>setForm({...form,downloadUrl:e.target.value})} required/>

        <label>الوصف</label>
        <textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>

        <label>الظهور</label>
        <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
          <option value="all">للجميع</option>
          <option value="reseller">للموزعين</option>
          <option value="admin">للإدارة</option>
        </select>

        <button className="primary" disabled={busy}>إضافة</button>
      </form>
    </section>}

    <section className="section">
      <div className="sectionHead"><div><h2>التطبيقات والسوفت وير</h2></div></div>
      {data.apps.length===0 ? <div className="emptyState compact">لا توجد عناصر مضافة.</div> :
        <div className="softwareFeed">
          {data.apps.map(a=><article className="softwarePost" key={a.id}>
            <div className="softwarePoster">
              {a.image_url?<img src={a.image_url} alt={a.name}/>:<div className="softwarePosterFallback">A</div>}
            </div>
            <div className="softwareBody">
              <div className="softwareMeta">
                <span>{a.platform==='receiver'?'Receiver':a.platform}</span>
                {a.version&&<em>v{a.version}</em>}
              </div>
              <h3>{a.name}</h3>
              {a.description&&<p>{a.description}</p>}
              <a className="downloadAction" href={a.download_url} target="_blank" rel="noreferrer">تحميل</a>
            </div>
          </article>)}
        </div>}
    </section>
  </div>;
}

function Logs({logs,admin}) {
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState('all');
  const [openId,setOpenId]=useState(null);

  const actionMeta={
    LOGIN_SUCCESS:['تسجيل دخول','session'],
    LOGOUT:['تسجيل خروج','session'],
    CREDIT_REQUEST_CREATED:['طلب رصيد جديد','credit'],
    CREDIT_REQUEST_APPROVED:['تم قبول طلب الرصيد','credit'],
    CREDIT_REQUEST_REJECTED:['تم رفض طلب الرصيد','credit'],
    CREDIT_ADJUSTED:['تعديل رصيد موزع','credit'],
    RESELLER_CREATED:['إنشاء موزع','account'],
    CODES_IMPORTED:['رفع أكواد','codes'],
    CODES_ISSUED:['تفعيل أكواد','codes'],
    SERVER_CREATED:['إضافة سيرفر','system'],
    PACKAGE_CREATED:['إضافة باقة','system'],
    APP_ADDED:['إضافة تطبيق أو سوفت وير','system'],
    ADMIN_PASSWORD_CHANGED:['تغيير كلمة مرور الإدارة','account']
  };
  const entityNames={
    session:'جلسة',
    credit_request:'طلب رصيد',
    user:'حساب',
    code_batch:'دفعة أكواد',
    issue_order:'تفعيل أكواد',
    server:'سيرفر',
    package:'باقة',
    app:'تطبيق'
  };
  const detailNames={
    amount:'الرصيد',
    before:'قبل',
    after:'بعد',
    quantity:'العدد',
    totalCost:'الإجمالي',
    customerRef:'العميل',
    filename:'الملف',
    inserted:'تمت الإضافة',
    duplicateCount:'المكرر',
    displayName:'الاسم',
    username:'Username',
    initialCredits:'رصيد البداية',
    name:'الاسم',
    platform:'النوع',
    visibility:'الظهور'
  };

  function meta(log){
    const x=actionMeta[log.action]||[log.action,'system'];
    return {label:x[0],kind:x[1]};
  }

  const filtered=logs.filter(log=>{
    const mm=meta(log);
    const hay=[mm.label,log.action,log.actor_name,log.actor_username,log.entity_type,log.details_json].join(' ').toLowerCase();
    return (kind==='all'||mm.kind===kind) && (!query||hay.includes(query.toLowerCase()));
  });

  return <section className="section logsSection">
    <div className="sectionHead">
      <div><h2>{admin?'السجل الكامل':'السجل'}</h2></div>
      <small>{num(filtered.length)} عملية</small>
    </div>

    <div className="logToolbar">
      <input placeholder="بحث في السجل" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select value={kind} onChange={e=>setKind(e.target.value)}>
        <option value="all">كل العمليات</option>
        <option value="codes">الأكواد</option>
        <option value="credit">الرصيد</option>
        <option value="account">الحسابات</option>
        <option value="session">الدخول والخروج</option>
        <option value="system">النظام</option>
      </select>
    </div>

    <div className="professionalLogs">
      {filtered.length===0 ? <div className="emptyState compact">لا توجد نتائج.</div> :
        filtered.map(log=>{
          const mm=meta(log);
          const id=log.id||log.created_at+log.action;
          const open=openId===id;
          let details={};
          try{details=JSON.parse(log.details_json||'{}')||{};}catch{}
          const visibleDetails=Object.entries(details).filter(([key])=>!key.toLowerCase().endsWith('id')&&!['serverLocked','mode','forced'].includes(key));

          return <article className={'proLogCard '+mm.kind+' '+(open?'open':'')} key={id}>
            <button className="proLogSummary" type="button" onClick={()=>setOpenId(open?null:id)}>
              <span className="logTone"/>
              <div className="proLogMain">
                <b>{mm.label}</b>
                <small>{admin?(log.actor_name||log.actor_username||'SYSTEM'):'حسابي'} · {fmt(log.created_at)}</small>
              </div>
              <span className="proLogEntity">{entityNames[log.entity_type]||log.entity_type||'عملية'}</span>
              <span className="proLogToggle">{open?'−':'+'}</span>
            </button>

            {open&&<div className="proLogDetails">
              {admin&&<div><span>المستخدم</span><b>{log.actor_name||log.actor_username||'SYSTEM'}</b></div>}
              <div><span>النوع</span><b>{entityNames[log.entity_type]||log.entity_type||'—'}</b></div>
              <div><span>التاريخ</span><b>{fmt(log.created_at)}</b></div>
              {visibleDetails.map(([key,value])=><div key={key}>
                <span>{detailNames[key]||key}</span>
                <b>{typeof value==='object'?JSON.stringify(value):String(value)}</b>
              </div>)}
            </div>}
          </article>;
        })
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
  if (loading) return <div className="bootShell" aria-label="تحميل اللوحة">
    <header className="bootHeader"><div className="bootBrandLine"/><div className="bootMenuBox">☰</div></header>
    <main className="bootContent">
      <div className="bootTitleLine"/>
      <div className="bootCardGrid">
        <div/><div/><div/><div/>
      </div>
    </main>
  </div>;
  if (!user) return <Login onAuth={(u,c)=>{setUser(u);setCsrf(c);}}/>;
  if (user.mustChangePassword) return <ForcePasswordChange csrf={csrf} onDone={()=>setUser({...user,mustChangePassword:false})}/>;
  return <Panel user={user} csrf={csrf} onLogout={()=>{setUser(null);setCsrf('');}}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
