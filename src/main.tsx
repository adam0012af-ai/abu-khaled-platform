import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const fmt = (v,lang='ar') => v ? new Date(v).toLocaleString(lang==='en'?'en-US':'ar-EG') : '—';
const num = (v) => Number(v || 0).toLocaleString('en-US');
const balanceUnit = (config,lang='ar') => {
  const mode=config?.mode==='credit'?'credit':'currency';
  if(mode==='credit') return lang==='en'?'CREDIT':'كريدت';
  const currency=String(config?.currency||'EGP').toUpperCase();
  if(currency==='USD') return lang==='en'?'USD':'$';
  return lang==='en'?'EGP':'ج.م';
};

const panelStateKey = (role, key) => `acm:${role}:${key}`;

const LanguageContext=createContext({lang:'ar',setLang:()=>{}});
function useLanguage(){
  const ctx=useContext(LanguageContext);
  const l=(ar,en)=>ctx.lang==='en'?en:ar;
  return {...ctx,l};
}
function LanguageSwitcher({compact=false}){
  const {lang,setLang}=useLanguage();
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const current=lang==='en'
    ? {flag:'🇺🇸',short:'EN',label:'English'}
    : {flag:'🇸🇦',short:'AR',label:'العربية'};

  useEffect(()=>{
    if(!open) return;
    const close=(e)=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc=(e)=>{ if(e.key==='Escape') setOpen(false); };
    document.addEventListener('pointerdown',close);
    document.addEventListener('keydown',esc);
    return()=>{
      document.removeEventListener('pointerdown',close);
      document.removeEventListener('keydown',esc);
    };
  },[open]);

  function choose(next){
    setLang(next);
    setOpen(false);
  }

  return <div className={'languageMenu '+(compact?'compact':'')} ref={ref}>
    <button
      type="button"
      className="languageTrigger"
      onClick={()=>setOpen(v=>!v)}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Language"
    >
      <span className="langFlag">{current.flag}</span>
      <span className="langCurrent">{current.short}</span>
      <span className="langChevron">⌄</span>
    </button>

    {open&&<div className="languagePopover" role="menu">
      <button type="button" className={lang==='ar'?'active':''} onClick={()=>choose('ar')} role="menuitem">
        <span>🇸🇦</span><b>العربية</b>
      </button>
      <button type="button" className={lang==='en'?'active':''} onClick={()=>choose('en')} role="menuitem">
        <span>🇺🇸</span><b>English</b>
      </button>
    </div>}
  </div>;
}

const ADMIN_ROUTE_TO_TAB = {
  dashboard:'overview',
  servers:'servers',
  inventory:'inventory',
  'codes/import':'import',
  'dealers/new':'reseller-create',
  dealers:'reseller-manage',
  codes:'issued',
  credit:'credit',
  apps:'apps',
  sharing:'sharing',
  partners:'partners',
  logs:'logs',
  profile:'profile'
};
const RESELLER_ROUTE_TO_TAB = {
  dashboard:'overview',
  issue:'issue',
  codes:'mycodes',
  'dealers/new':'reseller-create',
  dealers:'reseller-manage',
  credit:'credit',
  apps:'apps',
  sharing:'sharing',
  logs:'logs',
  profile:'profile'
};
const ADMIN_TAB_TO_ROUTE = Object.fromEntries(Object.entries(ADMIN_ROUTE_TO_TAB).map(([route,tab])=>[tab,route]));
const RESELLER_TAB_TO_ROUTE = Object.fromEntries(Object.entries(RESELLER_ROUTE_TO_TAB).map(([route,tab])=>[tab,route]));

function cleanHashRoute(){
  try{
    return decodeURIComponent(window.location.hash.replace(/^#\/?/,'').replace(/\/+$/,''));
  }catch{return '';}
}
function tabFromHash(role,allowed){
  const map=role==='admin'?ADMIN_ROUTE_TO_TAB:RESELLER_ROUTE_TO_TAB;
  const tab=map[cleanHashRoute()]||'overview';
  return allowed.includes(tab)?tab:'overview';
}
function hashForTab(role,tab){
  const map=role==='admin'?ADMIN_TAB_TO_ROUTE:RESELLER_TAB_TO_ROUTE;
  return '#/'+(map[tab]||'dashboard');
}

function readPanelScroll(role, tab){
  try{return Math.max(0,Number(sessionStorage.getItem(panelStateKey(role,'scroll:'+tab))||0));}
  catch{return 0;}
}

function readPanelData(role){
  try{
    const raw=sessionStorage.getItem(panelStateKey(role,'data'));
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'?parsed:null;
  }catch{return null;}
}
function writePanelData(role,data){
  try{sessionStorage.setItem(panelStateKey(role,'data'),JSON.stringify(data));}catch{}
}

function Logo({ compact = false }) {
  return (
    <div className={'brand '+(compact?'compact':'')}>
      <div className="brandMark"><span>A</span><b>C</b><i>M</i></div>
      <div><strong>ACTIVE CODE</strong><em>MULTI</em></div>
    </div>
  );
}

function PremiumLoginLogo() {
  return <div className="acmPremiumLogo" aria-label="ACTIVE CODE MULTI">
    <div className="acmPremiumLogoEmblem" aria-hidden="true">
      <svg viewBox="0 0 96 96" role="img">
        <defs>
          <linearGradient id="acmLogoGradient" x1="12" y1="8" x2="84" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#38BDF8"/>
            <stop offset=".48" stopColor="#6366F1"/>
            <stop offset="1" stopColor="#10B981"/>
          </linearGradient>
          <linearGradient id="acmLogoInner" x1="24" y1="18" x2="72" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1E293B"/>
            <stop offset="1" stopColor="#0F172A"/>
          </linearGradient>
          <filter id="acmLogoGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.23 0 0 0 0 0.51 0 0 0 0 0.96 0 0 0 .35 0"/>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="9" y="9" width="78" height="78" rx="25" fill="url(#acmLogoInner)" stroke="url(#acmLogoGradient)" strokeWidth="2"/>
        <path d="M27 62 39.5 34h5L57 62h-8l-2.6-6H37.6L35 62h-8Zm13.2-12h3.6L42 44.7 40.2 50Z" fill="#F8FAFC"/>
        <circle cx="64" cy="39" r="6" fill="#38BDF8"/>
        <circle cx="69" cy="56" r="6" fill="#10B981"/>
        <path d="M64 45v5.5c0 3 2 5.5 5 5.5" stroke="#A5F3FC" strokeWidth="2.5" strokeLinecap="round" filter="url(#acmLogoGlow)"/>
      </svg>
      <span className="acmPremiumLogoMini">ACM</span>
    </div>
    <div className="acmPremiumLogoCopy">
      <strong>ACTIVE CODE</strong>
      <span>MULTI</span>
    </div>
  </div>;
}

function Login({ onAuth }) {
  const {lang,l}=useLanguage();
  const [form,setForm]=useState({identifier:'',password:''});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [showPassword,setShowPassword]=useState(false);

  const [turnstile,setTurnstile]=useState({enabled:false,siteKey:''});
  const [turnstileToken,setTurnstileToken]=useState('');
  const [turnstileError,setTurnstileError]=useState('');

  const turnstileNode=useRef(null);
  const turnstileWidget=useRef(null);

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/public-config',{credentials:'same-origin'})
      .then(r=>r.ok?r.json():null)
      .then(cfg=>{
        if(cancelled||!cfg?.turnstile) return;
        setTurnstile({
          enabled:Boolean(cfg.turnstile.enabled),
          siteKey:String(cfg.turnstile.siteKey||'')
        });
      })
      .catch(()=>{});
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    if(!turnstile.enabled||!turnstile.siteKey||!turnstileNode.current) return;

    let stopped=false;
    let timer=0;

    const mountWidget=()=>{
      if(stopped) return;
      if(!window.turnstile?.render){
        timer=window.setTimeout(mountWidget,120);
        return;
      }

      try{
        if(turnstileWidget.current!==null){
          window.turnstile.remove(turnstileWidget.current);
          turnstileWidget.current=null;
        }

        turnstileWidget.current=window.turnstile.render(turnstileNode.current,{
          sitekey:turnstile.siteKey,
          theme:'light',
          size:'normal',
          language:lang==='en'?'en':'ar',
          action:'login',
          execution:'render',
          appearance:'always',
          retry:'auto',
          'refresh-expired':'auto',
          'refresh-timeout':'auto',
          callback:(token)=>{
            setTurnstileToken(token||'');
            setTurnstileError('');
          },
          'expired-callback':()=>{
            setTurnstileToken('');
            setTurnstileError(l('انتهت صلاحية التحقق. أعد التحقق.','Verification expired. Verify again.'));
          },
          'error-callback':()=>{
            setTurnstileToken('');
            setTurnstileError(l('تعذر التحقق. حاول مرة أخرى.','Verification failed. Try again.'));
          }
        });
      }catch{
        setTurnstileError(l('تعذر تحميل التحقق.','Unable to load verification.'));
      }
    };

    mountWidget();

    return()=>{
      stopped=true;
      clearTimeout(timer);
      try{
        if(turnstileWidget.current!==null&&window.turnstile?.remove){
          window.turnstile.remove(turnstileWidget.current);
        }
      }catch{}
      turnstileWidget.current=null;
      setTurnstileToken('');
    };
  },[turnstile.enabled,turnstile.siteKey,lang]);

  function resetTurnstile(){
    setTurnstileToken('');
    try{
      if(turnstileWidget.current!==null&&window.turnstile?.reset){
        window.turnstile.reset(turnstileWidget.current);
      }
    }catch{}
  }

  async function submit(){
    if(!String(form.identifier||'').trim()||!String(form.password||'')){
      setError(l('أدخل اسم المستخدم وكلمة المرور.','Enter your username and password.'));
      return;
    }

    if(turnstile.enabled&&!turnstileToken){
      setError(l('أكمل التحقق الأمني أولاً.','Complete security verification first.'));
      return;
    }

    setBusy(true);
    setError('');

    try{
      const res=await fetch('/api/login',{
        method:'POST',
        credentials:'same-origin',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          identifier:form.identifier,
          password:form.password,
          turnstileToken
        })
      });

      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'LOGIN_FAILED');

      onAuth(data.user,data.csrf);
    }catch(e){
      const code=String(e.message||e);
      setError(
        code.includes('TURNSTILE')
          ? l('فشل التحقق الأمني. أعد المحاولة.','Security verification failed. Try again.')
          : code.includes('TOO_MANY_ATTEMPTS')
          ? l('محاولات كثيرة. حاول لاحقًا.','Too many attempts. Try again later.')
          : code.includes('INVALID_LOGIN')
          ? l('بيانات الدخول غير صحيحة.','Invalid login details.')
          : l('تعذر تسجيل الدخول.','Unable to sign in.')
      );
      resetTurnstile();
    }finally{
      setBusy(false);
    }
  }

  return <div className="loginPage">
    <div className="loginBackdrop" aria-hidden="true"/>

    <main className="loginViewport">
      <section className="loginPanel loginPanelV2" aria-labelledby="login-title">
        <header className="loginHero">
          <div className="loginHeroGlow" aria-hidden="true"/>
          <div className="loginLanguage">
            <LanguageSwitcher compact/>
          </div>
          <div className="loginBrandCenter">
            <PremiumLoginLogo/>
            <span className="loginBrandKicker">CONTROL PANEL</span>
          </div>
        </header>

        <div className="loginPanelBody">
          <div className="loginHeading">
            <span className="loginEyebrow">{l('وصول آمن','SECURE ACCESS')}</span>
            <h1 id="login-title">{l('تسجيل الدخول','Sign in')}</h1>
          </div>

          <form className="loginForm" onSubmit={e=>e.preventDefault()} autoComplete="on">
            <label className="loginField">
              <span>{l('اسم المستخدم أو البريد الإلكتروني','Username or email')}</span>
              <input
                dir="ltr"
                type="text"
                value={form.identifier}
                onChange={e=>setForm({...form,identifier:e.target.value})}
                placeholder={l('اسم المستخدم أو البريد الإلكتروني','Username or email')}
                autoCapitalize="none"
                autoComplete="username"
                required
              />
            </label>

            <label className="loginField">
              <span>{l('كلمة المرور','Password')}</span>
              <div className="loginPassword">
                <input
                  dir="ltr"
                  type={showPassword?'text':'password'}
                  value={form.password}
                  onChange={e=>setForm({...form,password:e.target.value})}
                  placeholder={l('كلمة المرور','Password')}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="passwordToggle"
                  onClick={()=>setShowPassword(v=>!v)}
                  aria-label={showPassword?l('إخفاء كلمة المرور','Hide password'):l('إظهار كلمة المرور','Show password')}
                  title={showPassword?l('إخفاء','Hide'):l('إظهار','Show')}
                >
                  {showPassword
                    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.3 0 9 5 9 8a10.7 10.7 0 0 1-2.2 3.7"/><path d="M6.6 6.6C4.3 8.1 3 10.3 3 12c0 3 3.7 8 9 8 1 0 2-.2 2.9-.5"/></svg>
                    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.7-8 9-8 9 8 9 8-3.7 8-9 8-9-8-9-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </label>

            {turnstile.enabled&&<div className="loginVerify">
              <div className="turnstileHost native" ref={turnstileNode}/>
              {turnstileError&&<div className="verifyError">{turnstileError}</div>}
            </div>}

            {error&&<div className="loginError" role="alert">{error}</div>}

            <button
              className="loginSubmit"
              type="button"
              onClick={submit}
              disabled={busy||(turnstile.enabled&&!turnstileToken)}
            >
              {busy?l('جارٍ تسجيل الدخول…','Signing in…'):l('تسجيل الدخول','Sign in')}
            </button>
          </form>
        </div>

        <footer className="loginPanelFooter">
          <span>© ACTIVE CODE MULTI · TTV4K</span>
          <span className="loginSecurity">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/></svg>
            {l('جلسة آمنة','Secure session')}
          </span>
        </footer>
      </section>
    </main>
  </div>;
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
    sharing:<><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8"/></>,
    logs:<><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></>,
    profile:<><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></>
  };
  return <svg {...common}>{paths[name]||paths.home}</svg>;
}

function Panel({ user, csrf, onLogout }) {
  const {lang,l}=useLanguage();
  const isAdmin = user.role === 'admin';
  const accountType = user.accountType || (isAdmin?(String(user.username||'').toLowerCase()==='owner'?'owner':'admin'):'reseller');
  const isOwner = accountType === 'owner';
  const isAgent = accountType === 'agent';
  const canManageResellers = isAdmin || isAgent;
  const adminNav = [
    {id:'overview',label:l('الرئيسية','Dashboard'),icon:'home'},
    {id:'servers-pocket',label:l('إدارة السيرفرات','Server management'),icon:'server',children:[
      {id:'servers',label:l('إضافة سيرفر IPTV','Add IPTV server'),icon:'server'},
      {id:'inventory',label:l('مخزون IPTV','IPTV inventory'),icon:'inventory'},
      {id:'import',label:l('رفع أكواد IPTV','Import IPTV codes'),icon:'upload'},
      {id:'sharing-admin',label:l('إدارة الشيرنج','Sharing management'),icon:'sharing'}
    ]},
    {id:'code-stock',label:l('إدارة أكواد IPTV','IPTV code management'),icon:'codes',children:[
      {id:'iptv-stock',label:l('الأكواد: إضافة / تعديل / حذف','Codes: add / edit / delete'),icon:'codes'}
    ]},
    {id:'resellers',label:l('الموزعون','Resellers'),icon:'users',children:[
      {id:'reseller-create',label:l('إنشاء موزع','Create reseller'),icon:'userPlus'},
      {id:'reseller-manage',label:l('إدارة الموزعين','Manage resellers'),icon:'manageUsers'}
    ]},
    {id:'issued',label:l('الأكواد المفعلة','Issued codes'),icon:'codes'},
    {id:'credit',label:l('طلبات الرصيد','Balance requests'),icon:'credit'},
    {id:'partners',label:l('الشركاء والأدمن','Partners & admins'),icon:'users'},
    {id:'apps',label:l('التطبيقات والسوفت وير','Apps & software'),icon:'apps'},
    {id:'logs',label:l('السجل الكامل','Activity log'),icon:'logs'}
  ];
  const resellerNav = [
    {id:'overview',label:l('الرئيسية','Dashboard'),icon:'home'},
    {id:'creation',label:l('الإنشاء','Create'),icon:'issue',children:[
      {id:'issue',label:l('إنشاء كود IPTV','Issue IPTV code'),icon:'issue'},
      {id:'sharing',label:l('إنشاء كود شيرنج','Issue sharing code'),icon:'sharing'}
    ]},
    {id:'mycodes',label:l('أكوادي','My codes'),icon:'codes'},
    ...(isAgent?[{id:'resellers',label:l('موزعيني','My resellers'),icon:'users',children:[
      {id:'reseller-create',label:l('إنشاء موزع','Create reseller'),icon:'userPlus'},
      {id:'reseller-manage',label:l('إدارة موزعيني','Manage my resellers'),icon:'manageUsers'}
    ]}]:[]),
    {id:'credit',label:l('طلب رصيد','Request balance'),icon:'credit'},
    {id:'apps',label:l('التطبيقات والسوفت وير','Apps & software'),icon:'apps'},
    {id:'logs',label:l('السجل','Activity'),icon:'logs'}
  ];
  const navItems = isAdmin ? adminNav : resellerNav;
  const allowedTabs = useMemo(()=>[...navItems.flatMap(item=>item.children?item.children.map(x=>x.id):[item.id]),'profile'],[isAdmin,isAgent]);
  const initialTab = useMemo(()=>tabFromHash(user.role,allowedTabs),[user.role,allowedTabs]);
  const [tab,setTab] = useState(initialTab);
  const [menuOpen,setMenuOpen] = useState(false);
  const [openPockets,setOpenPockets] = useState(()=>({creation:['issue','sharing'].includes(initialTab),resellers:['reseller-create','reseller-manage'].includes(initialTab),'servers-pocket':['servers','inventory','import','sharing-admin'].includes(initialTab),'code-stock':['iptv-stock'].includes(initialTab)}));
  const flatNavItems = useMemo(()=>navItems.flatMap(item=>item.children||[item]),[navItems]);
  const currentLabel = flatNavItems.find(item=>item.id===tab)?.label || l('الرئيسية','Dashboard');
  const emptyData={ dashboard:null, profile:null, balanceConfig:{mode:'currency',currency:'EGP',unit:'EGP'}, servers:[], packages:[], resellers:[], codes:[], requests:[], apps:[], logs:[] };
  const cachedData=useMemo(()=>readPanelData(user.role),[user.role]);
  const [data,setData] = useState(()=>cachedData||emptyData);
  const [dataReady,setDataReady] = useState(()=>Boolean(cachedData));
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
      const [dash, profile, servers, apps, logs, requests] = await Promise.all([
        call('/api/dashboard'), call('/api/profile'), call('/api/servers'), call('/api/apps'), call('/api/logs'), call('/api/credit-requests')
      ]);
      const next = {
        ...data,
        dashboard:dash,
        profile:profile.profile||null,
        balanceConfig:dash.balanceConfig||data.balanceConfig||{mode:'currency',currency:'EGP',unit:'EGP'},
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
        if(isAgent){
          const team=await call('/api/team/resellers');
          next.resellers=team.resellers||[];
        }
      }
      setData(next);
      writePanelData(user.role,next);
    } catch (e) {
      if (String(e.message).includes('UNAUTHORIZED')) onLogout(true);
      else setNotice(l('تعذر تحديث البيانات.','Unable to refresh data.'));
    } finally {
      setDataReady(true);
    }
  }

  useEffect(()=>{ refresh(); },[]);
  useEffect(()=>{ const id=setInterval(refresh,30000); return()=>clearInterval(id); },[]);

  useEffect(()=>{
    const syncFromHash=()=>{
      const next=tabFromHash(user.role,allowedTabs);
      setTab(next);
      setMenuOpen(false);
      const parent=navItems.find(item=>item.children?.some(x=>x.id===next));
      if(parent) setOpenPockets(v=>({...v,[parent.id]:true}));
    };

    const canonical=hashForTab(user.role,tabFromHash(user.role,allowedTabs));
    if(window.location.hash!==canonical){
      window.history.replaceState(null,'',canonical);
    }
    syncFromHash();
    window.addEventListener('hashchange',syncFromHash);
    return()=>window.removeEventListener('hashchange',syncFromHash);
  },[user.role,allowedTabs]);

  useEffect(()=>{
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
      if(path!=='/api/issue') setNotice(l('تمت العملية بنجاح.','Completed successfully.'));
      await refresh();
      return out;
    } catch (e) {
      const map = {
        INSUFFICIENT_CREDIT:l('الرصيد غير كافٍ.','Insufficient credit.'),
        INSUFFICIENT_STOCK:'',
        SERVER_PACKAGE_MISMATCH:l('تعذر تحديد السيرفر.','Server not available.'),
        ISSUE_CONFLICT_RETRY:l('تعذر التفعيل. حاول مرة أخرى.','Activation failed. Try again.'),
        IMPORT_LIMIT_700:l('الحد الحالي 700 كود.','Maximum 700 codes per import.'),
        NEGATIVE_BALANCE_NOT_ALLOWED:l('لا يمكن أن يصبح الرصيد بالسالب.','Balance cannot be negative.'),
        INVALID_RESELLER:l('تحقق من بيانات الموزع.','Check reseller details.'),
        ACCOUNT_EXISTS:l('اسم المستخدم أو البريد مستخدم.','Username or email already exists.'),
        INVALID_APP:l('تحقق من الروابط.','Check the links.'),
        INVALID_ROLE:l('اختيار الصلاحية غير صحيح.','Invalid account role.'),
        OWNER_ROLE_LOCKED:l('لا يمكن تغيير صلاحية المالك.','Owner role cannot be changed.'),
        AGENT_ONLY:l('هذه العملية متاحة للوكيل فقط.','This action is for agents only.')
      };
      if(e.message==='INSUFFICIENT_STOCK'){
        setNotice('');
        return null;
      }
      setNotice(map[e.message] || l('لم تتم العملية: ','Request failed: ')+e.message);
      throw e;
    } finally { setBusy(false); }
  }

  async function logout() {
    try { await call('/api/logout',{method:'POST',body:{}}); } catch {}
    try{
      sessionStorage.removeItem(panelStateKey(user.role,'data'));
    }catch{}
    window.history.replaceState(null,'',window.location.pathname+window.location.search);
    onLogout();
  }

  function goTo(id){
    try{
      sessionStorage.setItem(panelStateKey(user.role,'scroll:'+tab),String(Math.max(0,window.scrollY||0)));
    }catch{}
    const target=hashForTab(user.role,id);
    setTab(id);
    setMenuOpen(false);
    if(window.location.hash!==target) window.location.hash=target;
  }

  return (
    <div className="panelShell">
      <aside className={'fullSidebar '+(menuOpen?'open':'')}>
        <div className="sidebarTop">
          <Logo compact/>
          <button className="sidebarClose" onClick={()=>setMenuOpen(false)} aria-label={l('إغلاق','Close')}>
            <span>×</span>
          </button>
        </div>

        <div className="sidebarAccountCard">
          <div className="sidebarAvatar">{(user.displayName||user.username||'U').slice(0,1).toUpperCase()}</div>
          <div className="sidebarAccountCopy">
            <span>{isAdmin?(isOwner?l('لوحة المالك','OWNER PANEL'):l('شريك أدمن','PARTNER ADMIN')):(isAgent?l('لوحة الوكيل','AGENT PANEL'):l('لوحة الموزع','RESELLER PANEL'))}</span>
            <b>{user.displayName||user.username}</b>
            {!isAdmin&&<small>{num(data.dashboard?.user?.credits ?? user.credits)} {balanceUnit(data.balanceConfig,lang)}</small>}
          </div>
          <span className="sidebarOnlineDot" title="Online"/>
        </div>

        <div className="sidebarSectionTitle">{l('القائمة','MENU')}</div>

        <nav className="sidebarNav">
          {navItems.map(item=>{
            if(item.children){
              const childActive=item.children.some(x=>x.id===tab);
              const pocketOpen=Boolean(openPockets[item.id]);
              return <div className={'sidebarPocket '+(childActive?'active':'')+' '+(pocketOpen?'expanded':'')} key={item.id}>
                <button
                  type="button"
                  className={'sidebarPocketHead '+(childActive?'active':'')}
                  onClick={()=>setOpenPockets(v=>({...v,[item.id]:!v[item.id]}))}
                >
                  <span className="sidebarIcon"><NavIcon name={item.icon}/></span>
                  <span className="sidebarText">{item.label}</span>
                  <span className="sidebarChevron">{pocketOpen?'⌃':'⌄'}</span>
                </button>
                <div className={'sidebarSubnav '+(pocketOpen?'show':'')}>
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
            </button>;
          })}
        </nav>

        <div className="sidebarBottom">
          <button
            type="button"
            className={'sidebarBottomAction sidebarProfileAction '+(tab==='profile'?'active':'')}
            onClick={()=>goTo('profile')}
          >
            <span className="sidebarIcon"><NavIcon name="profile"/></span>
            <span>{l('البروفايل','Profile')}</span>
          </button>
          <button
            type="button"
            className="sidebarBottomAction sidebarLogoutAction"
            onClick={logout}
          >
            <span className="sidebarLogoutGlyph">↪</span>
            <span>{l('تسجيل الخروج','Sign out')}</span>
          </button>
          <div className="sidebarFooter"><small>Developed by TTV4K</small></div>
        </div>
      </aside>

      {menuOpen && <button className="sidebarBackdrop" onClick={()=>setMenuOpen(false)} aria-label={l('إغلاق القائمة','Close menu')}/>}

      <main className="contentArea">
        <header className="contentHeader">
          <div className="contentHeaderLead">
            <button className="sidebarOpen" onClick={()=>setMenuOpen(true)} aria-label={l('فتح القائمة','Open menu')}>
              <span className="hamburgerLines" aria-hidden="true"><i/><i/><i/></span>
            </button>
            <div className="contentHeaderMeta">
              <span>ACTIVE CODE MULTI</span>
              <b>{currentLabel}</b>
            </div>
          </div>
          <div className="contentHeaderActions">
            <button className={'headerProfileBtn '+(tab==='profile'?'active':'')} onClick={()=>goTo('profile')} aria-label={l('البروفايل','Profile')}>
              <span>{(user.displayName||user.username||'U').slice(0,1).toUpperCase()}</span>
            </button>
            <LanguageSwitcher compact/>
          </div>
        </header>

        {notice && <div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}

        <div className="pageContent">
          {!dataReady ? <div className="panelLoadingState" aria-hidden="true">
            <span className="panelLoadingLine"/>
          </div> : <section className="routeView active" data-route={tab} key={tab}>
            {tab==='overview' && isAdmin && <AdminOverview data={data} action={action} busy={busy} user={user}/>}
            {tab==='overview' && !isAdmin && <ResellerOverview data={data} goTo={goTo}/>}
            {tab==='servers' && isAdmin && <Servers action={action} busy={busy} balanceConfig={data.balanceConfig}/>}
            {tab==='inventory' && isAdmin && <Inventory data={data}/>}
            {tab==='import' && isAdmin && <ImportCodes data={data} action={action} busy={busy} balanceConfig={data.balanceConfig}/>} 
            {tab==='iptv-stock' && isAdmin && <CodeStockManager kind="iptv" call={call} balanceConfig={data.balanceConfig}/>} 
            {tab==='sharing-admin' && isAdmin && <SharingAdminManager call={call} action={action} busy={busy} balanceConfig={data.balanceConfig}/>}

            {tab==='reseller-create' && canManageResellers && <CreateReseller action={action} busy={busy} endpoint={isAdmin?'/api/admin/resellers':'/api/team/resellers'} balanceConfig={data.balanceConfig} agentMode={isAgent}/>}
            {tab==='reseller-manage' && canManageResellers && <ManageResellers data={data} action={action} busy={busy} admin={isAdmin} balanceConfig={data.balanceConfig}/>}
            {tab==='issued' && isAdmin && <Codes codes={data.codes} admin/>}
            {tab==='credit' && isAdmin && <AdminCredit data={data} action={action} busy={busy}/>}
            {tab==='issue' && !isAdmin && <Issue data={data} action={action} busy={busy}/>}
            {tab==='mycodes' && !isAdmin && <Codes codes={data.codes}/>}
            {tab==='credit' && !isAdmin && <RequestCredit data={data} action={action} busy={busy}/>}
            {tab==='apps' && <Apps data={data} action={action} busy={busy} admin={isAdmin}/>}
            {tab==='sharing' && !isAdmin && <Sharing admin={false} call={call} action={action} busy={busy} balanceConfig={data.balanceConfig}/>} 
            {tab==='partners' && isAdmin && <AdminPartners call={call} action={action} busy={busy}/>}
            {tab==='logs' && <Logs logs={data.logs} admin={isAdmin}/>} 
            {tab==='profile' && <ProfilePage call={call}/>}
          </section>}
        </div>
      </main>
    </div>
  );
}


function AdminPartners({call,action,busy}){
  const {lang,l}=useLanguage();
  const [partners,setPartners]=useState([]);
  const [ready,setReady]=useState(false);
  const [form,setForm]=useState({username:'',email:'',displayName:'',password:''});
  const [showPassword,setShowPassword]=useState(false);

  async function load(){
    try{
      const out=await call('/api/admin/partners');
      setPartners(out.partners||[]);
    }finally{
      setReady(true);
    }
  }

  useEffect(()=>{load();},[]);

  async function submit(e){
    e.preventDefault();
    await action('/api/admin/partners',form);
    setForm({username:'',email:'',displayName:'',password:''});
    setShowPassword(false);
    await load();
  }

  function countryName(code){
    if(!code) return '—';
    try{
      return new Intl.DisplayNames([lang==='en'?'en':'ar'],{type:'region'}).of(String(code).toUpperCase())||code;
    }catch{return code;}
  }

  return <div className="adminPartnersPage">
    <section className="section adminPartnerCreate">
      <div className="sectionHead">
        <div><h2>{l('إضافة شريك أدمن','Add administrator partner')}</h2><p className="adminPartnerLead">{l('حساب شريك يدخل نفس لوحة الإدارة ويشاهد ويدير كل الأقسام بدون نقص في الصلاحيات.','A partner account uses the same administration panel with complete visibility and management access.')}</p></div>
        <span className="fullAccessBadge">{l('نفس صلاحيات المالك','OWNER-LEVEL ACCESS')}</span>
      </div>

      <div className="adminPartnerPermissionGrid">
        <span>{l('كل السيرفرات والمخزون','All servers & inventory')}</span>
        <span>{l('كل الموزعين والأرصدة','All resellers & balances')}</span>
        <span>{l('كل الأكواد والشيرنج','All codes & sharing')}</span>
        <span>{l('السجل الكامل وإدارة الشركاء','Full logs & partner management')}</span>
      </div>

      <form className="adminPartnerForm" onSubmit={submit}>
        <label className="acmField">
          <span>{l('اسم المستخدم','Username')}</span>
          <input dir="ltr" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required/>
        </label>

        <label className="acmField">
          <span>{l('كلمة المرور','Password')}</span>
          <div className="acmPasswordBox">
            <input dir="ltr" type={showPassword?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/>
            <button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?l('إخفاء','Hide'):l('إظهار','Show')}</button>
          </div>
        </label>

        <label className="acmField">
          <span>{l('اسم الشريك','Partner name')}</span>
          <input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})}/>
        </label>

        <label className="acmField">
          <span>{l('البريد الإلكتروني','Email')}</span>
          <input dir="ltr" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        </label>

        <button className="acmPrimaryBtn adminPartnerCreateBtn" disabled={busy}>
          <NavIcon name="userPlus"/>
          <span>{l('إنشاء شريك أدمن','Create admin partner')}</span>
        </button>
      </form>
    </section>

    <section className="section adminPartnersListSection">
      <div className="sectionHead">
        <div><h2>{l('الشركاء','Administrators')}</h2></div>
        <small>{num(partners.length)}</small>
      </div>

      {!ready ? <div className="panelLoadingState"><span className="panelLoadingLine"/></div> :
      <div className="adminPartnersList">
        {partners.map(p=>{
          const owner=String(p.username||'').toLowerCase()==='owner';
          return <article className="adminPartnerCard" key={p.id}>
            <div className="adminPartnerAvatar">{(p.display_name||p.username||'A').slice(0,1).toUpperCase()}</div>
            <div className="adminPartnerIdentity">
              <div>
                <b>{p.display_name||p.username}</b>
                <span className={owner?'ownerBadge':'partnerBadge'}>{owner?l('المالك','OWNER'):l('شريك','PARTNER')}</span>
              </div>
              <small>@{p.username}</small>
            </div>
            <div className="adminPartnerMeta">
              <div><span>{l('الدولة','Country')}</span><b>{countryName(p.last_country)}</b></div>
              <div><span>IP</span><b dir="ltr">{p.last_login_ip||'—'}</b></div>
              <div><span>{l('آخر دخول','Last login')}</span><b>{p.last_login_at?fmt(p.last_login_at,lang):'—'}</b></div>
              <div><span>{l('الحالة','Status')}</span><b>{p.status==='active'?l('نشط','Active'):l('متوقف','Disabled')}</b></div>
            </div>
          </article>;
        })}
      </div>}
    </section>
  </div>;
}


function SharingAdminManager({call,action,busy,balanceConfig}){
  const {lang,l}=useLanguage();
  const emptyForm={nameAr:'',nameEn:'',creditCost:1,sortOrder:100,active:1};
  const [services,setServices]=useState([]);
  const [form,setForm]=useState(emptyForm);
  const [editId,setEditId]=useState('');
  const [deleteId,setDeleteId]=useState('');
  const [ready,setReady]=useState(false);
  const [localBusy,setLocalBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function loadServices(){
    setReady(false);
    try{
      const out=await call('/api/admin/sharing/services');
      setServices(out.services||[]);
    }catch{
      setMessage(l('تعذر تحميل أقسام الشيرنج.','Unable to load sharing services.'));
    }finally{
      setReady(true);
    }
  }

  useEffect(()=>{loadServices();},[]);

  function resetForm(){
    setForm(emptyForm);
    setEditId('');
  }

  async function submitService(e){
    e.preventDefault();
    setLocalBusy(true);
    setMessage('');
    try{
      const body=editId
        ? {operation:'update',serviceId:editId,...form}
        : {operation:'add',...form};
      await call('/api/admin/sharing/services',{method:'POST',body});
      setMessage(editId?l('تم تعديل قسم الشيرنج.','Sharing service updated.'):l('تمت إضافة قسم الشيرنج.','Sharing service added.'));
      resetForm();
      await loadServices();
    }catch(e){
      const code=String(e.message||e);
      const map={
        INVALID_SHARING_SERVICE:l('راجع اسم القسم والسعر.','Check the service name and cost.'),
        SHARING_SERVICE_EXISTS:l('القسم موجود بالفعل.','Sharing service already exists.')
      };
      setMessage(map[code]||l('لم تتم العملية: ','Request failed: ')+code);
    }finally{
      setLocalBusy(false);
    }
  }

  function startEdit(service){
    setEditId(service.id);
    setDeleteId('');
    setForm({
      nameAr:service.name_ar||'',
      nameEn:service.name_en||'',
      creditCost:Number(service.credit_cost||0),
      sortOrder:Number(service.sort_order||100),
      active:Number(service.active)===0?0:1
    });
    requestAnimationFrame(()=>document.querySelector('.sharingServiceEditor')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  async function deleteService(service){
    setLocalBusy(true);
    setMessage('');
    try{
      const out=await call('/api/admin/sharing/services',{method:'POST',body:{operation:'delete',serviceId:service.id}});
      if(out.archived){
        setMessage(l('تم إيقاف القسم وحفظ العمليات القديمة الخاصة به.','Service archived and historical transactions were preserved.'));
      }else{
        setMessage(l('تم حذف قسم الشيرنج.','Sharing service deleted.'));
      }
      setDeleteId('');
      if(editId===service.id) resetForm();
      await loadServices();
    }catch(e){
      setMessage(l('تعذر حذف القسم: ','Unable to delete service: ')+String(e.message||e));
    }finally{
      setLocalBusy(false);
    }
  }

  async function restoreService(service){
    setLocalBusy(true);
    setMessage('');
    try{
      await call('/api/admin/sharing/services',{method:'POST',body:{
        operation:'update',
        serviceId:service.id,
        nameAr:service.name_ar,
        nameEn:service.name_en,
        creditCost:Number(service.credit_cost||0),
        sortOrder:Number(service.sort_order||100),
        active:1
      }});
      setMessage(l('تمت إعادة تفعيل القسم.','Service restored.'));
      await loadServices();
    }catch(e){
      setMessage(l('تعذر إعادة التفعيل: ','Unable to restore: ')+String(e.message||e));
    }finally{
      setLocalBusy(false);
    }
  }

  return <div className="sharingAdminHub">
    <section className="section sharingServiceManager">
      <div className="sectionHead sharingAdminTitle">
        <div>
          <h2>{l('إدارة الشيرنج','Sharing management')}</h2>
          <p>{l('من هنا تضيف أقسام الشيرنج وتعدلها وتحذفها، ثم ترفع وتدير الأكواد الخاصة بكل قسم.','Add, edit, or delete sharing services here, then manage the codes for each service.')}</p>
        </div>
        <span>{num(services.filter(s=>Number(s.active)===1).length)} {l('قسم نشط','active')}</span>
      </div>

      <form className="sharingServiceEditor" onSubmit={submitService}>
        <div className="sharingServiceEditorHead">
          <b>{editId?l('تعديل قسم الشيرنج','Edit sharing service'):l('إضافة قسم شيرنج جديد','Add sharing service')}</b>
          {editId&&<button type="button" onClick={resetForm}>{l('إلغاء التعديل','Cancel edit')}</button>}
        </div>
        <label>
          <span>{l('الاسم بالعربي','Arabic name')}</span>
          <input value={form.nameAr} onChange={e=>setForm(v=>({...v,nameAr:e.target.value}))} placeholder="مثال: ناشر برو" required/>
        </label>
        <label>
          <span>{l('الاسم بالإنجليزي','English name')}</span>
          <input dir="ltr" value={form.nameEn} onChange={e=>setForm(v=>({...v,nameEn:e.target.value}))} placeholder="Example: Nasher Pro" required/>
        </label>
        <label>
          <span>{l('سعر الكود','Code cost')} ({balanceUnit(balanceConfig,lang)})</span>
          <input dir="ltr" type="number" min="0" value={form.creditCost} onChange={e=>setForm(v=>({...v,creditCost:e.target.value}))} required/>
        </label>
        <label>
          <span>{l('الترتيب','Sort order')}</span>
          <input dir="ltr" type="number" value={form.sortOrder} onChange={e=>setForm(v=>({...v,sortOrder:e.target.value}))}/>
        </label>
        {editId&&<label>
          <span>{l('الحالة','Status')}</span>
          <select value={form.active} onChange={e=>setForm(v=>({...v,active:Number(e.target.value)}))}>
            <option value={1}>{l('نشط','Active')}</option>
            <option value={0}>{l('متوقف','Disabled')}</option>
          </select>
        </label>}
        <button className="primary sharingServiceSave" disabled={localBusy}>{localBusy?l('جارٍ الحفظ…','Saving…'):(editId?l('حفظ التعديل','Save changes'):l('إضافة القسم','Add service'))}</button>
      </form>

      {message&&<div className="codeStockMessage">{message}</div>}

      {!ready?<div className="panelLoadingState"><span className="panelLoadingLine"/></div>:
      <div className="sharingServiceList">
        {services.map((service,index)=><article className={'sharingServiceManageCard '+(Number(service.active)===0?'disabled':'')} key={service.id}>
          <div className="sharingServiceManageIndex">{String(index+1).padStart(2,'0')}</div>
          <div className="sharingServiceManageMain">
            <div>
              <b>{lang==='en'?service.name_en:service.name_ar}</b>
              <small>{lang==='en'?service.name_ar:service.name_en}</small>
            </div>
            <div className="sharingServiceManageStats">
              <span>{l('السعر','Cost')} <strong>{num(service.credit_cost)} {balanceUnit(balanceConfig,lang)}</strong></span>
              <span>{l('المتاح','Available')} <strong>{num(service.available_codes)}</strong></span>
              <span>{l('المفعّل','Issued')} <strong>{num(service.issued_codes)}</strong></span>
              <span>{l('العمليات','Orders')} <strong>{num(service.total_orders)}</strong></span>
            </div>
          </div>
          <span className={'sharingServiceState '+(Number(service.active)===1?'active':'disabled')}>{Number(service.active)===1?l('نشط','Active'):l('متوقف','Disabled')}</span>
          <div className="sharingServiceManageActions">
            <button type="button" onClick={()=>startEdit(service)}>{l('تعديل','Edit')}</button>
            {Number(service.active)===0
              ? <button type="button" className="restore" disabled={localBusy} onClick={()=>restoreService(service)}>{l('إعادة تفعيل','Restore')}</button>
              : deleteId===service.id
                ? <>
                    <button type="button" className="danger" disabled={localBusy} onClick={()=>deleteService(service)}>{l('تأكيد الحذف','Confirm delete')}</button>
                    <button type="button" onClick={()=>setDeleteId('')}>{l('إلغاء','Cancel')}</button>
                  </>
                : <button type="button" className="dangerGhost" onClick={()=>setDeleteId(service.id)}>{l('حذف','Delete')}</button>}
          </div>
        </article>)}
      </div>}
    </section>

    <CodeStockManager kind="sharing" call={call} balanceConfig={balanceConfig}/>
    <Sharing admin call={call} action={action} busy={busy} balanceConfig={balanceConfig}/>
  </div>;
}

function Sharing({admin,call,action,busy,balanceConfig}){
  const {lang,l}=useLanguage();
  const [data,setData]=useState({services:[],codes:[],balance:0,balanceConfig:balanceConfig||{mode:'currency',currency:'EGP'}});
  const [ready,setReady]=useState(false);
  const [importForm,setImportForm]=useState({serviceId:'',filename:'sharing-codes.txt',text:'',codeCost:''});
  const [issueForm,setIssueForm]=useState({serviceId:'',customerRef:'',quantity:1});
  const [mode,setMode]=useState('single');
  const [result,setResult]=useState(null);
  const [openId,setOpenId]=useState(null);

  async function load(){
    try{
      const out=await call('/api/sharing');
      setData({
        services:out.services||[],
        codes:out.codes||[],
        balance:Number(out.balance||0),
        balanceConfig:out.balanceConfig||balanceConfig||{mode:'currency',currency:'EGP'}
      });
    }finally{
      setReady(true);
    }
  }

  useEffect(()=>{load();},[]);

  async function pickFile(e){
    const f=e.target.files?.[0];
    if(!f) return;
    const text=await f.text();
    setImportForm(v=>({...v,filename:f.name,text}));
  }

  async function importCodes(e){
    e.preventDefault();
    if(!importForm.serviceId||!importForm.text.trim()) return;
    await action('/api/admin/sharing/import',importForm);
    setImportForm(v=>({...v,text:''}));
    await load();
  }

  async function issueCodes(e){
    e.preventDefault();
    const quantity=mode==='single'?1:Math.max(1,Math.min(100,Number(issueForm.quantity)||1));
    const out=await action('/api/sharing/issue',{
      serviceId:issueForm.serviceId,
      customerRef:issueForm.customerRef,
      quantity
    });
    if(out){
      setResult(out);
      setIssueForm(v=>({...v,customerRef:'',quantity:1}));
      await load();
    }
  }

  async function copy(v){await navigator.clipboard.writeText(v);}
  async function copyResult(){
    await navigator.clipboard.writeText((result?.codes||[]).map(x=>x.code).join('\n'));
  }

  const selected=data.services.find(s=>s.id===issueForm.serviceId);
  const q=mode==='single'?1:Math.max(1,Math.min(100,Number(issueForm.quantity)||1));

  if(!ready){
    return <section className="section sharingSection"><div className="panelLoadingState"><span className="panelLoadingLine"/></div></section>;
  }

  return <section className="section sharingSection">
    <div className="sectionHead sharingHead">
      <div><h2>{admin?l('إدارة الشيرنج','Sharing management'):l('إنشاء كود شيرنج','Issue sharing code')}</h2></div>
      {!admin&&<div className="sharingBalance"><span>{l('الرصيد','Balance')}</span><b>{num(data.balance)}</b><small>{balanceUnit(data.balanceConfig,lang)}</small></div>}
    </div>

    <div className="sharingGrid">
      {data.services.map((service,index)=><button
        type="button"
        className={'sharingCard '+(!admin&&issueForm.serviceId===service.id?'selected':'')}
        key={service.id}
        onClick={()=>!admin&&setIssueForm(v=>({...v,serviceId:service.id}))}
      >
        <div className="sharingCardIcon"><NavIcon name="sharing"/></div>
        <div className="sharingCardCopy">
          <span>{String(index+1).padStart(2,'0')}</span>
          <h3>{lang==='en'?service.name_en:service.name_ar}</h3>
          <small>{num(service.credit_cost)} {balanceUnit(data.balanceConfig,lang)}</small>
        </div>
        {admin&&<div className="sharingStock">
          <div><span>{l('المتاح','Available')}</span><b>{num(service.available_codes)}</b></div>
          <div><span>{l('المفعّل','Issued')}</span><b>{num(service.issued_codes)}</b></div>
        </div>}
      </button>)}
    </div>

    {admin ? <>
      <div className="sharingDivider"/>
      <form className="sharingImport" onSubmit={importCodes}>
        <div className="sharingFormHead"><h3>{l('رفع أكواد الشيرنج','Import sharing codes')}</h3></div>

        <label className="acmField">
          <span>{l('الخدمة','Service')}</span>
          <select value={importForm.serviceId} onChange={e=>{
            const serviceId=e.target.value;
            const service=data.services.find(s=>s.id===serviceId);
            setImportForm(v=>({...v,serviceId,codeCost:service?Number(service.credit_cost||0):''}));
          }} required>
            <option value="">{l('اختر الخدمة','Select service')}</option>
            {data.services.map(s=><option key={s.id} value={s.id}>{lang==='en'?s.name_en:s.name_ar}</option>)}
          </select>
        </label>

        <label className="acmField">
          <span>{l('سعر الكود / الخصم','Code price / deduction')} ({balanceUnit(data.balanceConfig,lang)})</span>
          <input
            dir="ltr"
            type="number"
            min="0"
            inputMode="numeric"
            value={importForm.codeCost}
            onChange={e=>setImportForm(v=>({...v,codeCost:e.target.value}))}
            required
          />
          <small>{data.balanceConfig?.mode==='credit'
            ? l('سيُخصم كريدت عند إصدار كود الشيرنج.','Credits will be deducted when a sharing code is issued.')
            : l('سيُخصم المبلغ بنفس العملة المفعلة.','The amount will be deducted in the active currency.')}</small>
        </label>

        <label className="sharingFilePick">
          <span>{l('ملف TXT','TXT file')}</span>
          <input type="file" accept=".txt,text/plain" onChange={pickFile}/>
          <b>{importForm.filename||'sharing-codes.txt'}</b>
        </label>

        <label className="acmField">
          <span>{l('الأكواد','Codes')}</span>
          <textarea
            rows="8"
            value={importForm.text}
            onChange={e=>setImportForm(v=>({...v,text:e.target.value}))}
            placeholder={l('كود في كل سطر','One code per line')}
          />
        </label>

        <button className="acmPrimaryBtn sharingSubmit" disabled={busy||!importForm.serviceId||importForm.codeCost===''||!importForm.text.trim()}>
          {l('رفع الأكواد','Import codes')}
        </button>
      </form>
    </> : <>
      <div className="sharingDivider"/>
      <form className="sharingIssue" onSubmit={issueCodes}>
        <div className="sharingIssueTop">
          <div>
            <span>{l('الخدمة','Service')}</span>
            <b>{selected?(lang==='en'?selected.name_en:selected.name_ar):l('اختر خدمة من الأعلى','Select a service above')}</b>
          </div>
          {selected&&<small>{num(selected.credit_cost)} {balanceUnit(data.balanceConfig,lang)}</small>}
        </div>

        <div className="sharingIssueTabs">
          <button type="button" className={mode==='single'?'active':''} onClick={()=>setMode('single')}>{l('كود واحد','Single')}</button>
          <button type="button" className={mode==='bulk'?'active':''} onClick={()=>setMode('bulk')}>{l('مجموعة أكواد','Multiple')}</button>
        </div>

        <label className="acmField">
          <span>{l('اسم العميل أو رقم الهاتف','Customer name or phone')}</span>
          <input value={issueForm.customerRef} onChange={e=>setIssueForm(v=>({...v,customerRef:e.target.value}))} placeholder={l('اسم أو رقم','Name or phone')}/>
        </label>

        {mode==='bulk'&&<label className="acmField">
          <span>{l('العدد','Quantity')}</span>
          <input dir="ltr" type="number" min="1" max="100" value={issueForm.quantity} onChange={e=>setIssueForm(v=>({...v,quantity:e.target.value}))}/>
        </label>}

        <button className="acmPrimaryBtn sharingSubmit" disabled={busy||!selected}>
          {busy?l('جارٍ الإنشاء…','Issuing…'):l('إنشاء الكود','Issue code')}
        </button>
      </form>

      {result&&<div className="sharingResult">
        <div className="sharingResultHead">
          <div>
            <span>{l('تم التفعيل','Issued')}</span>
            <b>{lang==='en'?result.order.serviceEn:result.order.serviceAr}</b>
          </div>
          <button type="button" onClick={copyResult}>{l('نسخ','Copy')}</button>
        </div>
        <div className="sharingResultCodes">
          {(result.codes||[]).map(x=><button type="button" dir="ltr" key={x.id} onClick={()=>copy(x.code)}>{x.code}</button>)}
        </div>
      </div>}
    </>}

    <div className="sharingDivider"/>
    <div className="sharingCodesHead activePocketHead">
      <div>
        <span className="sharingActiveBadge">ACTIVE</span>
        <h3>{admin?l('الأكواد المفعلة للشيرنج','Active sharing issues'):l('أكواد الشيرنج المفعلة','My active sharing codes')}</h3>
      </div>
      <small>{num(data.codes.length)}</small>
    </div>

    {data.codes.length===0 ? <div className="emptyState compact">{l('لا توجد أكواد.','No codes yet.')}</div> :
      <div className="sharingCodesList">
        {data.codes.map(code=>{
          const open=openId===code.id;
          const serviceName=lang==='en'?code.service_name_en:code.service_name_ar;
          return <article className={'sharingCodeRow '+(open?'open':'')} key={code.id}>
            <button type="button" className="sharingCodeSummary" onClick={()=>setOpenId(open?null:code.id)}>
              <div><span>{serviceName}</span><b dir="ltr">{code.code}</b></div>
              {admin&&<small>{code.reseller_name||code.reseller_username||'—'}</small>}
              <i>{open?'−':'+'}</i>
            </button>
            {open&&<div className="sharingCodeDetails sharingActiveDetails">
              <div><span>{l('الخدمة','Service')}</span><b>{serviceName}</b></div>
              <div><span>{l('العميل','Customer')}</span><b>{code.customer_ref||'—'}</b></div>
              <div><span>{l('التاريخ','Date')}</span><b>{fmt(code.issued_at,lang)}</b></div>
              <div><span>{l('العدد','Quantity')}</span><b>{num(code.quantity||1)}</b></div>
              <div><span>{l('سعر الوحدة','Unit cost')}</span><b>{num(code.unit_cost||0)} {balanceUnit(data.balanceConfig,lang)}</b></div>
              <div><span>{l('الإجمالي','Total')}</span><b>{num(code.total_cost||0)} {balanceUnit(data.balanceConfig,lang)}</b></div>
              {admin&&<div><span>{l('الموزع','Reseller')}</span><b>{code.reseller_name||code.reseller_username||'—'}</b></div>}
              {admin&&<div><span>{l('رصيد قبل','Balance before')}</span><b>{num(code.credits_before||0)} {balanceUnit(data.balanceConfig,lang)}</b></div>}
              {admin&&<div><span>{l('رصيد بعد','Balance after')}</span><b>{num(code.credits_after||0)} {balanceUnit(data.balanceConfig,lang)}</b></div>}
              {admin&&<div><span>{l('ملف المصدر','Source file')}</span><b>{code.batch_filename||'—'}</b></div>}
              <div><span>{l('رقم العملية','Order ID')}</span><b className="mono">{code.order_id||'—'}</b></div>
              <button type="button" onClick={()=>copy(code.code)}>{l('نسخ الكود','Copy code')}</button>
            </div>}
          </article>;
        })}
      </div>
    }
  </section>;
}


function ProfilePage({call}) {
  const {l}=useLanguage();
  const [form,setForm]=useState({currentPassword:'',newPassword:'',confirmPassword:''});
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function changePassword(e){
    e.preventDefault();
    setMessage('');
    if(!form.currentPassword||!form.newPassword){
      setMessage(l('أدخل كلمة المرور الحالية والجديدة.','Enter current and new password.'));
      return;
    }
    if(form.newPassword!==form.confirmPassword){
      setMessage(l('تأكيد كلمة المرور غير مطابق.','Password confirmation does not match.'));
      return;
    }
    setBusy(true);
    try{
      await call('/api/change-password',{method:'POST',body:{
        currentPassword:form.currentPassword,
        newPassword:form.newPassword
      }});
      setForm({currentPassword:'',newPassword:'',confirmPassword:''});
      setMessage(l('تم تغيير كلمة المرور بنجاح.','Password changed successfully.'));
    }catch(e){
      const code=String(e.message||e);
      setMessage(
        code.includes('CURRENT_PASSWORD_WRONG')
          ? l('كلمة المرور الحالية غير صحيحة.','Current password is incorrect.')
          : l('تعذر تغيير كلمة المرور.','Unable to change password.')
      );
    }finally{
      setBusy(false);
    }
  }

  return <section className="passwordOnlyPage">
    <section className="profileCard passwordOnlyCard">
      <div className="passwordOnlyHead">
        <div className="passwordOnlyIcon"><NavIcon name="profile"/></div>
        <div>
          <h2>{l('تغيير كلمة المرور','Change password')}</h2>
          <p>{l('البروفايل مخصص لتغيير كلمة المرور فقط.','Profile is dedicated to password changes only.')}</p>
        </div>
      </div>

      <form className="profilePasswordForm passwordOnlyForm" onSubmit={changePassword}>
        <div className="profilePasswordGrid">
          <label>
            <span>{l('كلمة المرور الحالية','Current password')}</span>
            <input type={show?'text':'password'} value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})} autoComplete="current-password" required/>
          </label>
          <label>
            <span>{l('كلمة المرور الجديدة','New password')}</span>
            <input type={show?'text':'password'} value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})} autoComplete="new-password" required/>
          </label>
          <label>
            <span>{l('تأكيد كلمة المرور','Confirm password')}</span>
            <input type={show?'text':'password'} value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} autoComplete="new-password" required/>
          </label>
        </div>
        <div className="profilePasswordActions">
          <button type="button" className="profileShowBtn" onClick={()=>setShow(v=>!v)}>{show?l('إخفاء','Hide'):l('إظهار','Show')}</button>
          <button className="primary" disabled={busy}>{busy?l('جارٍ الحفظ…','Saving…'):l('حفظ كلمة المرور','Save password')}</button>
        </div>
        {message&&<div className="profileMessage">{message}</div>}
      </form>
    </section>
  </section>;
}

function AdminOverview({data,action,busy,user}) {
  const {lang,l}=useLanguage();
  const c=data.dashboard?.counts||{};
  const cfg=data.balanceConfig||{mode:'currency',currency:'EGP'};
  const [settings,setSettings]=useState({mode:cfg.mode||'currency',currency:cfg.currency||'EGP'});

  useEffect(()=>{
    setSettings({mode:cfg.mode||'currency',currency:cfg.currency||'EGP'});
  },[cfg.mode,cfg.currency]);

  const stats=[
    {label:l('إجمالي الأكواد','Total codes'),value:c.total_codes,tone:'blue'},
    {label:l('الأكواد المتاحة','Available codes'),value:c.available,tone:'green'},
    {label:l('الأكواد المفعلة','Issued codes'),value:c.issued,tone:'violet'},
    {label:l('الموزعون','Resellers'),value:c.resellers,tone:'orange'},
    {label:l('طلبات الرصيد','Balance requests'),value:c.pending_requests,tone:'pink'},
    {label:l('أرصدة الموزعين','Reseller balances'),value:c.reseller_credits,tone:'cyan'}
  ];

  return <>
    <section className="section dashboardSummary premiumDashboard">
      <div className="dashboardHeader">
        <div>
          <h2>{l('الرئيسية','Dashboard')}</h2>
        </div>
        <div className="adminBalanceOpen">
          <span>{l('نظام الحساب','Balance system')}</span>
          <b>{balanceUnit(cfg,lang)}</b>
        </div>
      </div>

      <div className="dashboardStats premiumStats">
        {stats.map(item=><div className={'dashboardStat '+item.tone} key={item.label}>
          <span>{item.label}</span>
          <strong>{num(item.value)}</strong>
        </div>)}
      </div>
    </section>

    <section className="section balanceSettingsCard">
      <div className="sectionHead">
        <div>
          <h2>{l('نظام الرصيد والعملة','Balance & currency')}</h2>
          <p>{l('الأساسي جنيه مصري، ويمكن التحويل إلى دولار أو الرجوع لنظام الكريدت من هنا.','EGP is the default. Switch to USD or Credit mode from here.')}</p>
        </div>
        <span className="balanceModeLive">{balanceUnit(cfg,lang)}</span>
      </div>
      <form className="balanceSettingsForm" onSubmit={async e=>{
        e.preventDefault();
        await action('/api/admin/balance-config',settings);
      }}>
        <label className="acmField">
          <span>{l('النظام','Mode')}</span>
          <select value={settings.mode} onChange={e=>setSettings(v=>({...v,mode:e.target.value}))}>
            <option value="currency">{l('عملة','Currency')}</option>
            <option value="credit">{l('كريدت','Credit')}</option>
          </select>
        </label>
        <label className="acmField">
          <span>{l('العملة','Currency')}</span>
          <select disabled={settings.mode==='credit'} value={settings.currency} onChange={e=>setSettings(v=>({...v,currency:e.target.value}))}>
            <option value="EGP">{l('جنيه مصري (EGP)','Egyptian Pound (EGP)')}</option>
            <option value="USD">{l('دولار أمريكي (USD)','US Dollar (USD)')}</option>
          </select>
        </label>
        <button className="acmPrimaryBtn" disabled={busy}>{l('حفظ النظام','Save mode')}</button>
      </form>
    </section>
  </>;
}

function ResellerOverview({data,goTo}) {
  const {lang,l}=useLanguage();
  const c=data.dashboard?.counts||{};
  const user=data.dashboard?.user||{};
  const profile=data.profile||user;
  const balance=Number(user.credits||profile.credits||0);
  const recentCodes=(data.codes||[]).slice(0,4);
  const recentRequests=(data.requests||[]).slice(0,4);
  const recentActivity=(data.logs||[]).slice(0,5);

  function countryName(code){
    if(!code) return '—';
    try{
      return new Intl.DisplayNames([lang==='en'?'en':'ar'],{type:'region'}).of(String(code).toUpperCase())||code;
    }catch{return code;}
  }

  const activityLabel=(action)=>{
    const map={
      LOGIN_SUCCESS:l('تسجيل دخول','Signed in'),
      CODES_ISSUED:l('إصدار أكواد','Codes issued'),
      SHARING_CODES_ISSUED:l('إصدار كود شيرنج','Sharing code issued'),
      CREDIT_REQUEST_CREATED:l('طلب رصيد','Balance request'),
      PASSWORD_CHANGED:l('تغيير كلمة المرور','Password changed')
    };
    return map[action]||String(action||'').replaceAll('_',' ');
  };

  const stats=[
    {label:l('إجمالي الأكواد','Total codes'),value:c.issued||0,icon:'codes'},
    {label:l('أكواد السيرفر','Server codes'),value:c.main_issued||0,icon:'server'},
    {label:l('أكواد الشيرنج','Sharing codes'),value:c.sharing_issued||0,icon:'sharing'},
    {label:l('طلبات الرصيد','Balance requests'),value:c.pending_requests||0,icon:'credit'}
  ];

  const quickActions=[
    {id:'issue',label:l('إنشاء كود IPTV','Issue IPTV code'),hint:l('اختر السيرفر ثم أنشئ الكود','Choose server and issue'),icon:'issue'},
    {id:'sharing',label:l('إنشاء كود شيرنج','Issue sharing code'),hint:l('اختر نوع الشيرنج ثم أنشئ','Choose sharing service'),icon:'sharing'},
    {id:'mycodes',label:l('أكوادي','My codes'),hint:l('عرض كل الأكواد','View issued codes'),icon:'codes'},
    {id:'credit',label:l('طلب رصيد','Request balance'),hint:l('إرسال طلب للإدارة','Send request'),icon:'credit'}
  ];

  return <>
    <section className="section resellerPremiumBoard">
      <div className="resellerBoardHero">
        <div className="resellerBoardIdentity">
          <div className="resellerBoardEyebrow">
            <span>{user.accountType==='agent'?l('لوحة الوكيل','AGENT DASHBOARD'):l('لوحة الموزع','RESELLER DASHBOARD')}</span>
            <i className={profile.status==='blocked'?'blocked':'active'}>{profile.status==='blocked'?l('متوقف','DISABLED'):l('نشط','ACTIVE')}</i>
          </div>
          <h2>{user.displayName||profile.displayName||user.username||''}</h2>
          <small>@{user.username||profile.username||''}</small>
        </div>

        <div className="resellerWalletCard">
          <span>{l('الرصيد الحالي','Current balance')}</span>
          <strong>{num(balance)}</strong>
          <small>{balanceUnit(data.balanceConfig,lang)}</small>
        </div>
      </div>

      <div className="resellerBoardStats">
        {stats.map(item=><article key={item.label}>
          <div className="resellerStatIcon"><NavIcon name={item.icon}/></div>
          <div><span>{item.label}</span><b>{num(item.value)}</b></div>
        </article>)}
      </div>

      <div className="resellerQuickActions">
        {quickActions.map(item=><button type="button" key={item.id} onClick={()=>goTo?.(item.id)}>
          <span className="resellerQuickActionIcon"><NavIcon name={item.icon}/></span>
          <span className="resellerQuickActionCopy"><b>{item.label}</b><small>{item.hint}</small></span>
          <span className="resellerQuickActionArrow">‹</span>
        </button>)}
      </div>
    </section>

    <section className="resellerAccountStrip">
      <div>
        <span>{l('الحساب','Account')}</span>
        <b>{profile.status==='blocked'?l('متوقف','Disabled'):(user.accountType==='agent'?l('وكيل نشط','Active agent'):l('موزع نشط','Active reseller'))}</b>
      </div>
      <div>
        <span>{l('آخر دخول','Last login')}</span>
        <b>{profile.lastLoginAt?fmt(profile.lastLoginAt,lang):'—'}</b>
      </div>
      <div>
        <span>{l('الدولة','Country')}</span>
        <b>{countryName(profile.lastCountry)}</b>
      </div>
      <div>
        <span>{l('البريد','Email')}</span>
        <b dir="ltr">{profile.email||'—'}</b>
      </div>
    </section>

    <div className="resellerDashboardGrid">
      <section className="section resellerRecentPanel resellerRecentCodesPanel">
        <div className="sectionHead">
          <div><h2>{l('آخر الأكواد','Recent codes')}</h2></div>
          <small>{num(recentCodes.length)}</small>
        </div>
        {recentCodes.length===0 ? <div className="emptyState compact">{l('لا توجد أكواد حتى الآن.','No codes yet.')}</div> :
          <div className="resellerRecentList">
            {recentCodes.map(x=><article key={x.id}>
              <div>
                <span>{x.server_name}</span>
                <b dir="ltr">{x.code}</b>
              </div>
              <small>{fmt(x.issued_at,lang)}</small>
            </article>)}
          </div>}
      </section>

      <section className="section resellerRecentPanel">
        <div className="sectionHead">
          <div><h2>{l('طلبات الرصيد','Balance requests')}</h2></div>
          <small>{num(recentRequests.length)}</small>
        </div>
        {recentRequests.length===0 ? <div className="emptyState compact">{l('لا توجد طلبات.','No requests.')}</div> :
          <div className="resellerRequestList">
            {recentRequests.map(r=><article key={r.id}>
              <div><b>{num(r.amount)}</b><span>{balanceUnit(data.balanceConfig,lang)}</span></div>
              <span className={'badge '+r.status}>{r.status}</span>
              <small>{fmt(r.created_at,lang)}</small>
            </article>)}
          </div>}
      </section>

      <section className="section resellerRecentPanel resellerActivityPanel">
        <div className="sectionHead">
          <div><h2>{l('آخر النشاط','Recent activity')}</h2></div>
          <small>{num(recentActivity.length)}</small>
        </div>
        {recentActivity.length===0 ? <div className="emptyState compact">{l('لا يوجد نشاط حتى الآن.','No activity yet.')}</div> :
          <div className="resellerActivityList">
            {recentActivity.map((item,index)=><article key={item.id||item.created_at||index}>
              <span className="resellerActivityDot"/>
              <div>
                <b>{activityLabel(item.action)}</b>
                <small>{fmt(item.created_at,lang)}</small>
              </div>
            </article>)}
          </div>}
      </section>
    </div>
  </>;
}

function Servers({action,busy,balanceConfig}) {
  const {lang,l}=useLanguage();
  const [server,setServer]=useState({name:'',lowStockThreshold:10,creditCost:1});

  return <section className="section focusedForm">
    <div className="sectionHead"><div><h2>{l('إضافة سيرفر','Add server')}</h2></div></div>

    <form className="formGrid" onSubmit={async e=>{
      e.preventDefault();
      await action('/api/admin/servers',server);
      setServer({name:'',lowStockThreshold:10,creditCost:1});
    }}>
      <label>{l('اسم السيرفر','Server name')}</label>
      <input placeholder={l('مثال: Nova','Example: Nova')} value={server.name} onChange={e=>setServer({...server,name:e.target.value})} required/>

      <label>{l('تكلفة الكود','Code cost')} ({balanceUnit(balanceConfig,lang)})</label>
      <input type="number" min="0" value={server.creditCost} onChange={e=>setServer({...server,creditCost:e.target.value})} required/>

      <label>{l('تنبيه انخفاض المخزون','Low stock alert')}</label>
      <input type="number" min="0" value={server.lowStockThreshold} onChange={e=>setServer({...server,lowStockThreshold:e.target.value})}/>

      <button className="primary" disabled={busy}>{l('إضافة سيرفر','Add server')}</button>
    </form>
  </section>;
}

function Inventory({data}) {
  const {lang,l}=useLanguage();
  return <section className="section">
    <div className="sectionHead">
      <div><h2>{l('المخزون','Inventory')}</h2></div>
      <small>{num(data.servers.length)} {l('سيرفر','servers')}</small>
    </div>

    <div className="inventoryGrid">
      {data.servers.map(s=>{
        const p=data.packages.find(p=>p.server_id===s.id&&Number(p.active)===1);
        const low=Number(s.available_codes)<=Number(s.low_stock_threshold||0);
        return <article className={'inventoryCard '+(low?'low':'')} key={s.id}>
          <div className="inventoryCardHead">
            <div><span>{l('السيرفر','Server')}</span><b>{s.name}</b></div>
            <em>{Number(s.active)===1?l('نشط','Active'):l('متوقف','Disabled')}</em>
          </div>
          <div className="inventoryNumbers">
            <div><span>{l('المتاح','Available')}</span><strong>{num(s.available_codes)}</strong></div>
            <div><span>{l('المفعّل','Issued')}</span><strong>{num(s.issued_codes)}</strong></div>
            <div><span>{l('الإجمالي','Total')}</span><strong>{num(s.total_codes)}</strong></div>
          </div>
          <div className="inventoryFoot">
            <span>{num(p?.credit_cost||0)} {balanceUnit(data.balanceConfig,lang)}</span>
            <span>{l('تنبيه عند','Alert at')} {num(s.low_stock_threshold||0)}</span>
          </div>
        </article>
      })}
    </div>
  </section>;
}

function ImportCodes({data,action,busy,balanceConfig}) {
  const {lang,l}=useLanguage();
  const [form,setForm]=useState({serverId:'',filename:'codes.txt',text:'',codeCost:''});
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
      <div><h2>{l('رفع الأكواد','Import codes')}</h2></div>
    </div>

    <div className="importGrid">
      <form className="formGrid" onSubmit={async e=>{
        e.preventDefault();
        await action('/api/admin/import-codes',form);
        setForm({...form,text:''});
      }}>
        <label>{l('السيرفر','Server')}</label>
        <select value={form.serverId} onChange={e=>{
          const serverId=e.target.value;
          const pack=data.packages.find(p=>p.server_id===serverId&&Number(p.active)===1);
          setForm({...form,serverId,codeCost:pack?Number(pack.credit_cost||0):''});
        }} required>
          <option value="">{l('اختر السيرفر','Select server')}</option>
          {data.servers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
        </select>

        <label>{l('سعر الكود / الخصم عند الإصدار','Code price / deduction')} ({balanceUnit(balanceConfig,lang)})</label>
        <div className="importPriceField">
          <input
            dir="ltr"
            type="number"
            min="0"
            inputMode="numeric"
            value={form.codeCost}
            onChange={e=>setForm({...form,codeCost:e.target.value})}
            placeholder="0"
            required
          />
          <span>{balanceUnit(balanceConfig,lang)}</span>
        </div>
        <small className="importPriceHint">{balanceConfig?.mode==='credit'
          ? l('السعر سيُخصم كريدت من الموزع عند إصدار الكود.','This amount will be deducted as credits when the code is issued.')
          : l('السعر سيظهر ويُخصم بنفس العملة المفعلة من لوحة الأدمن.','This price will be shown and deducted in the currency enabled by admin.')}</small>

        <label className="filePick">{l('اختيار ملف TXT','Choose TXT file')}<input type="file" accept=".txt,text/plain" onChange={pickFile}/></label>
        <textarea rows="14" placeholder={l('الصق الأكواد هنا — كود في كل سطر','Paste codes here — one per line')} value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/>
        <button className="primary" disabled={busy||unique.size===0||!form.serverId||form.codeCost===''}>{l('استيراد','Import')}</button>
      </form>

      <div className="previewBox">
        <span>{l('معاينة','Preview')}</span>
        <strong>{num(unique.size)}</strong>
        <b>{l('كود فريد','unique codes')}</b>
        <div>
          <em>{num(lines.length)} {l('سطر','lines')}</em>
          <em>{num(lines.length-nonBlank.length)} {l('فارغ','blank')}</em>
          <em>{num(nonBlank.length-unique.size)} {l('مكرر','duplicates')}</em>
        </div>
      </div>
    </div>
  </section>;
}

function CodeStockManager({kind,call,balanceConfig}) {
  const {lang,l}=useLanguage();
  const isSharing=kind==='sharing';
  const [data,setData]=useState({codes:[],counts:{total:0,available:0,issued:0,disabled:0},sources:[]});
  const [filters,setFilters]=useState({sourceId:'',status:'all'});
  const [search,setSearch]=useState('');
  const [appliedSearch,setAppliedSearch]=useState('');
  const [bulkOpen,setBulkOpen]=useState(false);
  const [bulkForm,setBulkForm]=useState({sourceId:'',filename:isSharing?'sharing-codes.txt':'iptv-codes.txt',text:'',codeCost:''});
  const [selectedIds,setSelectedIds]=useState([]);
  const [confirmSelected,setConfirmSelected]=useState(false);
  const [editId,setEditId]=useState('');
  const [editValue,setEditValue]=useState('');
  const [deleteId,setDeleteId]=useState('');
  const [deleteAllOpen,setDeleteAllOpen]=useState(false);
  const [deleteScope,setDeleteScope]=useState('all');
  const [confirmText,setConfirmText]=useState('');
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const sourceName=(source)=>{
    if(isSharing) return lang==='en'?(source.name_en||source.name_ar):(source.name_ar||source.name_en);
    return source.name||'—';
  };

  const codeSourceName=(row)=>{
    if(isSharing) return lang==='en'?(row.source_name_en||row.source_name_ar):(row.source_name_ar||row.source_name_en);
    return row.source_name||'—';
  };

  const bulkLines=bulkForm.text.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  const bulkUnique=Array.from(new Set(bulkLines));
  const allVisibleSelected=data.codes.length>0&&data.codes.every(row=>selectedIds.includes(row.id));

  async function load(next=filters,q=appliedSearch){
    setReady(false);
    try{
      const params=new URLSearchParams({kind,status:next.status||'all',limit:'750'});
      if(next.sourceId) params.set('sourceId',next.sourceId);
      if(q) params.set('q',q);
      const out=await call('/api/admin/code-stock?'+params.toString());
      setData({
        codes:out.codes||[],
        counts:out.counts||{total:0,available:0,issued:0,disabled:0},
        sources:out.sources||[]
      });
      setBulkForm(v=>{
        const sourceId=v.sourceId||next.sourceId||'';
        const source=(out.sources||[]).find(s=>s.id===sourceId);
        return {...v,sourceId,codeCost:v.codeCost!==''?v.codeCost:(source?Number(source.credit_cost||0):'')};
      });
      setSelectedIds([]);
      setConfirmSelected(false);
    }catch{
      setMessage(l('تعذر تحميل الأكواد.','Unable to load codes.'));
    }finally{
      setReady(true);
    }
  }

  useEffect(()=>{load(filters,appliedSearch);},[kind,filters.sourceId,filters.status,appliedSearch]);

  async function mutate(body,success){
    setBusy(true);
    setMessage('');
    try{
      const out=await call('/api/admin/code-stock',{method:'POST',body:{kind,...body}});
      setMessage(success+(out?.deleted!==undefined?' ('+num(out.deleted)+')':''));
      await load(filters,appliedSearch);
      return out;
    }catch(e){
      const code=String(e.message||e);
      const map={
        CODE_EXISTS:l('الكود موجود بالفعل.','Code already exists.'),
        CODE_NOT_FOUND:l('الكود غير موجود.','Code not found.'),
        INVALID_CODE:l('أدخل كودًا صحيحًا.','Enter a valid code.'),
        SERVER_PACKAGE_MISMATCH:l('السيرفر لا يحتوي على باقة نشطة.','Server has no active package.'),
        SHARING_SERVICE_NOT_FOUND:l('نوع الشيرنج غير موجود.','Sharing service not found.')
      };
      setMessage(map[code]||l('لم تتم العملية: ','Request failed: ')+code);
      return null;
    }finally{
      setBusy(false);
    }
  }

  async function pickBulkFile(e){
    const file=e.target.files?.[0];
    if(!file)return;
    const text=await file.text();
    setBulkForm(v=>({...v,filename:file.name,text}));
  }

  async function importBulk(e){
    e.preventDefault();
    if(!bulkForm.sourceId||bulkUnique.length===0||bulkUnique.length>700) return;
    setBusy(true);
    setMessage('');
    try{
      const endpoint=isSharing?'/api/admin/sharing/import':'/api/admin/import-codes';
      const body=isSharing
        ? {serviceId:bulkForm.sourceId,filename:bulkForm.filename,text:bulkForm.text,codeCost:bulkForm.codeCost}
        : {serverId:bulkForm.sourceId,filename:bulkForm.filename,text:bulkForm.text,codeCost:bulkForm.codeCost};
      const out=await call(endpoint,{method:'POST',body});
      const batch=out.batch||{};
      setMessage(
        l('تمت إضافة الأكواد دفعة واحدة.','Codes added in bulk.')+
        ' '+l('المضاف: ','Added: ')+num(batch.inserted_count??bulkUnique.length)+
        ' · '+l('المكرر: ','Duplicates: ')+num(batch.duplicate_count||0)
      );
      setBulkForm(v=>({...v,text:''}));
      setBulkOpen(false);
      await load(filters,appliedSearch);
    }catch(e){
      const code=String(e.message||e);
      setMessage(code.includes('IMPORT_LIMIT_700')
        ? l('الحد الأقصى 700 كود في الدفعة الواحدة.','Maximum 700 codes per batch.')
        : l('تعذر إضافة الأكواد: ','Unable to add codes: ')+code);
    }finally{
      setBusy(false);
    }
  }

  function toggleSelected(id){
    setConfirmSelected(false);
    setSelectedIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  }

  function toggleAllVisible(){
    setConfirmSelected(false);
    if(allVisibleSelected){
      setSelectedIds([]);
    }else{
      setSelectedIds(data.codes.map(row=>row.id));
    }
  }

  async function deleteSelected(){
    if(selectedIds.length===0) return;
    setBusy(true);
    setMessage('');
    let deleted=0,failed=0;
    const ids=[...selectedIds];
    try{
      for(let i=0;i<ids.length;i+=8){
        const chunk=ids.slice(i,i+8);
        const results=await Promise.all(chunk.map(async codeId=>{
          try{
            await call('/api/admin/code-stock',{method:'POST',body:{kind,operation:'delete',codeId}});
            return true;
          }catch{return false;}
        }));
        results.forEach(ok=>ok?deleted++:failed++);
      }
      setMessage(
        l('تم حذف المحدد: ','Selected deleted: ')+num(deleted)+
        (failed?' · '+l('تعذر حذف: ','Failed: ')+num(failed):'')
      );
      setSelectedIds([]);
      setConfirmSelected(false);
      await load(filters,appliedSearch);
    }finally{
      setBusy(false);
    }
  }

  async function saveEdit(id){
    if(!editValue.trim()) return;
    const out=await mutate({operation:'update',codeId:id,code:editValue},l('تم تعديل الكود.','Code updated.'));
    if(out){setEditId('');setEditValue('');}
  }

  async function deleteOne(id){
    const out=await mutate({operation:'delete',codeId:id},l('تم حذف الكود.','Code deleted.'));
    if(out) setDeleteId('');
  }

  async function deleteAll(){
    const ok=confirmText.trim()==='حذف'||confirmText.trim().toUpperCase()==='DELETE';
    if(!ok) return;
    const out=await mutate(
      {operation:'delete_all',sourceId:filters.sourceId||'',scope:deleteScope},
      l('تم تنفيذ حذف الأكواد.','Code deletion completed.')
    );
    if(out){setDeleteAllOpen(false);setConfirmText('');}
  }

  const statusLabel=(status)=>({
    available:l('متاح','Available'),
    issued:l('مفعّل','Issued'),
    disabled:l('متوقف','Disabled')
  }[status]||status);

  return <section className="section codeStockPage">
    <div className="codeStockHead codeStockHeadCompact">
      <div>
        <span className="codeStockEyebrow">{isSharing?'SHARING':'IPTV'}</span>
        <h2>{isSharing?l('إدارة أكواد الشيرنج','Manage sharing codes'):l('إدارة أكواد IPTV','Manage IPTV codes')}</h2>
        <p>{l('إدارة جماعية: أضف ملف أو مجموعة أكواد، حدّد الكل أو جزء منها واحذف مباشرة من نفس المكان. الحذف متاح للإدارة فقط.','Bulk management: import a file or many codes, select all or part of the list, and delete from the same screen. Deletion is admin-only.')}</p>
      </div>
      <div className="codeStockHeadActions">
        <button type="button" className="codeBulkAddOpen" onClick={()=>setBulkOpen(v=>!v)}>
          {bulkOpen?l('إغلاق الإضافة','Close add'):l('إضافة أكواد','Add codes')}
        </button>
        <button type="button" className="codeDeleteAllBtn" onClick={()=>setDeleteAllOpen(v=>!v)}>
          {l('حذف الكل','Delete all')}
        </button>
      </div>
    </div>

    <div className="codeStockStats">
      <div><span>{l('الإجمالي','Total')}</span><b>{num(data.counts.total)}</b></div>
      <div><span>{l('المتاح','Available')}</span><b>{num(data.counts.available)}</b></div>
      <div><span>{l('المفعّل','Issued')}</span><b>{num(data.counts.issued)}</b></div>
      <div><span>{l('المتوقف','Disabled')}</span><b>{num(data.counts.disabled)}</b></div>
    </div>

    <div className="codeStockToolbar codeStockToolbarSticky">
      <label>
        <span>{isSharing?l('نوع الشيرنج','Sharing service'):l('السيرفر','Server')}</span>
        <select value={filters.sourceId} onChange={e=>setFilters(v=>({...v,sourceId:e.target.value}))}>
          <option value="">{isSharing?l('كل أنواع الشيرنج','All sharing services'):l('كل السيرفرات','All servers')}</option>
          {data.sources.map(s=><option key={s.id} value={s.id}>{sourceName(s)}</option>)}
        </select>
      </label>
      <label>
        <span>{l('الحالة','Status')}</span>
        <select value={filters.status} onChange={e=>setFilters(v=>({...v,status:e.target.value}))}>
          <option value="all">{l('كل الحالات','All statuses')}</option>
          <option value="available">{l('متاح','Available')}</option>
          <option value="issued">{l('مفعّل','Issued')}</option>
          <option value="disabled">{l('متوقف','Disabled')}</option>
        </select>
      </label>
      <form className="codeStockSearch" onSubmit={e=>{e.preventDefault();setAppliedSearch(search.trim());}}>
        <input dir="ltr" placeholder={l('بحث بالكود','Search code')} value={search} onChange={e=>setSearch(e.target.value)}/>
        <button type="submit">{l('بحث','Search')}</button>
        {appliedSearch&&<button type="button" className="clear" onClick={()=>{setSearch('');setAppliedSearch('');}}>{l('مسح','Clear')}</button>}
      </form>
    </div>

    {bulkOpen&&<form className="codeBulkImporter" onSubmit={importBulk}>
      <div className="codeBulkImporterHead">
        <div>
          <b>{l('إضافة جماعية','Bulk add')}</b>
          <small>{l('الصق الأكواد أو اختر ملف TXT — كود في كل سطر.','Paste codes or choose a TXT file — one code per line.')}</small>
        </div>
        <strong>{num(bulkUnique.length)} / 700</strong>
      </div>
      <select value={bulkForm.sourceId} onChange={e=>{
        const sourceId=e.target.value;
        const source=data.sources.find(s=>s.id===sourceId);
        setBulkForm(v=>({...v,sourceId,codeCost:source?Number(source.credit_cost||0):''}));
      }} required>
        <option value="">{isSharing?l('اختر نوع الشيرنج','Select sharing service'):l('اختر السيرفر','Select server')}</option>
        {data.sources.map(s=><option key={s.id} value={s.id}>{sourceName(s)}</option>)}
      </select>
      <label className="codeBulkPrice">
        <span>{l('سعر الكود / الخصم','Code price / deduction')}</span>
        <div>
          <input
            dir="ltr"
            type="number"
            min="0"
            inputMode="numeric"
            value={bulkForm.codeCost}
            onChange={e=>setBulkForm(v=>({...v,codeCost:e.target.value}))}
            required
          />
          <b>{balanceUnit(balanceConfig,lang)}</b>
        </div>
        <small>{balanceConfig?.mode==='credit'
          ? l('يظهر للموزعين كريدت','Shown to resellers as credits')
          : l('يظهر للموزعين بالعملة المفعلة','Shown to resellers in the active currency')}</small>
      </label>
      <label className="codeBulkFile">
        <span>{l('اختيار ملف TXT','Choose TXT')}</span>
        <input type="file" accept=".txt,text/plain" onChange={pickBulkFile}/>
        <b>{bulkForm.filename}</b>
      </label>
      <textarea rows="6" dir="ltr" value={bulkForm.text} onChange={e=>setBulkForm(v=>({...v,text:e.target.value}))} placeholder={l('الصق الأكواد هنا — كود في كل سطر','Paste codes here — one per line')}/>
      <button className="codeAddBtn" disabled={busy||!bulkForm.sourceId||bulkForm.codeCost===''||bulkUnique.length===0||bulkUnique.length>700}>
        {busy?l('جارٍ الإضافة…','Adding…'):l('إضافة المجموعة','Add batch')}
      </button>
      {bulkUnique.length>700&&<em>{l('قسّم الأكواد إلى دفعات، الحد 700 كود في كل مرة.','Split the codes into batches; maximum 700 per import.')}</em>}
    </form>}

    {deleteAllOpen&&<div className="codeStockDanger">
      <div>
        <b>{l('حذف جماعي كامل','Full bulk deletion')}</b>
        <span>{filters.sourceId
          ? l('سيتم تطبيق الحذف على القسم المحدد فقط.','Deletion will apply only to the selected source.')
          : l('لم تحدد قسمًا: الحذف سيشمل كل الأقسام.','No source selected: deletion will apply to all sources.')}</span>
      </div>
      <select value={deleteScope} onChange={e=>setDeleteScope(e.target.value)}>
        <option value="available">{l('حذف كل الأكواد المتاحة فقط','Delete all available codes only')}</option>
        <option value="all">{l('حذف كل الأكواد بما فيها المفعّلة','Delete every code including issued')}</option>
      </select>
      <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder={l('اكتب: حذف','Type: DELETE')}/>
      <div>
        <button type="button" className="secondary" onClick={()=>{setDeleteAllOpen(false);setConfirmText('');}}>{l('إلغاء','Cancel')}</button>
        <button type="button" className="danger" disabled={busy||!(confirmText.trim()==='حذف'||confirmText.trim().toUpperCase()==='DELETE')} onClick={deleteAll}>{l('تأكيد حذف الكل','Confirm delete all')}</button>
      </div>
    </div>}

    {message&&<div className="codeStockMessage">{message}</div>}

    <div className={'codeSelectionBar '+(selectedIds.length?'active':'')}>
      <label className="codeSelectAll">
        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}/>
        <span>{allVisibleSelected?l('إلغاء تحديد الكل','Clear all'):l('تحديد كل الظاهر','Select all visible')}</span>
      </label>
      <div className="codeSelectionCount">
        <b>{num(selectedIds.length)}</b>
        <span>{l('محدد','selected')}</span>
      </div>
      {selectedIds.length>0&&<div className="codeSelectionActions">
        {!confirmSelected ? <>
          <button type="button" className="selectionClear" onClick={()=>setSelectedIds([])}>{l('إلغاء التحديد','Clear')}</button>
          <button type="button" className="selectionDelete" onClick={()=>setConfirmSelected(true)}>{l('حذف المحدد','Delete selected')}</button>
        </> : <>
          <button type="button" className="selectionClear" onClick={()=>setConfirmSelected(false)}>{l('رجوع','Back')}</button>
          <button type="button" className="selectionDelete confirm" disabled={busy} onClick={deleteSelected}>{busy?l('جارٍ الحذف…','Deleting…'):l('تأكيد الحذف','Confirm delete')}</button>
        </>}
      </div>}
    </div>

    {!ready ? <div className="panelLoadingState"><span className="panelLoadingLine"/></div> :
    data.codes.length===0 ? <div className="emptyState compact">{l('لا توجد أكواد مطابقة.','No matching codes.')}</div> :
    <div className="codeStockList codeStockListDense">
      {data.codes.map(row=>{
        const selected=selectedIds.includes(row.id);
        return <article className={'codeStockRow '+row.status+(selected?' selected':'')} key={row.id}>
          <label className="codeRowCheck">
            <input type="checkbox" checked={selected} onChange={()=>toggleSelected(row.id)}/>
            <span/>
          </label>
          <div className="codeStockIdentity">
            <span>{codeSourceName(row)}</span>
            {editId===row.id
              ? <input dir="ltr" value={editValue} onChange={e=>setEditValue(e.target.value)} autoFocus/>
              : <b dir="ltr">{row.code}</b>}
          </div>
          <div className="codeStockMeta">
            <span className={'codeStockStatus '+row.status}>{statusLabel(row.status)}</span>
            <small>{row.reseller_name||row.reseller_username||'—'}</small>
            <small>{fmt(row.issued_at||row.created_at,lang)}</small>
          </div>
          <div className="codeStockActions">
            {editId===row.id ? <>
              <button type="button" className="save" disabled={busy||!editValue.trim()} onClick={()=>saveEdit(row.id)}>{l('حفظ','Save')}</button>
              <button type="button" onClick={()=>{setEditId('');setEditValue('');}}>{l('إلغاء','Cancel')}</button>
            </> : deleteId===row.id ? <>
              <button type="button" className="danger" disabled={busy} onClick={()=>deleteOne(row.id)}>{l('تأكيد','Confirm')}</button>
              <button type="button" onClick={()=>setDeleteId('')}>{l('إلغاء','Cancel')}</button>
            </> : <>
              <button type="button" onClick={()=>{setEditId(row.id);setEditValue(row.code);setDeleteId('');}}>{l('تعديل','Edit')}</button>
              <button type="button" className="dangerGhost" onClick={()=>{setDeleteId(row.id);setEditId('');}}>{l('حذف','Delete')}</button>
            </>}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}

function CreateReseller({action,busy,endpoint='/api/admin/resellers',balanceConfig,agentMode=false}) {
  const {lang,l}=useLanguage();
  const [form,setForm]=useState({username:'',email:'',displayName:'',password:'',credits:0});
  const [showPassword,setShowPassword]=useState(false);

  async function submit(e){
    e.preventDefault();
    await action(endpoint,form);
    setForm({username:'',email:'',displayName:'',password:'',credits:0});
    setShowPassword(false);
  }

  return <section className="acmCreateCard">
    <div className="acmCreateHead">
      <div className="acmCreateIcon"><NavIcon name="userPlus"/></div>
      <div>
        <h2>{agentMode?l('إنشاء موزع تحتي','Create sub-reseller'):l('إنشاء موزع','Create reseller')}</h2>
      </div>
    </div>

    <form className="acmCreateGrid" onSubmit={submit}>
      <label className="acmField">
        <span>{l('اسم المستخدم','Username')}</span>
        <input
          dir="ltr"
          placeholder="Username"
          value={form.username}
          onChange={e=>setForm({...form,username:e.target.value})}
          autoComplete="off"
          required
        />
      </label>

      <label className="acmField">
        <span>{l('كلمة المرور','Password')}</span>
        <div className="acmPasswordBox">
          <input
            dir="ltr"
            type={showPassword?'text':'password'}
            placeholder="Password"
            value={form.password}
            onChange={e=>setForm({...form,password:e.target.value})}
            autoComplete="new-password"
            required
          />
          <button type="button" onClick={()=>setShowPassword(v=>!v)}>
            {showPassword?l('إخفاء','Hide'):l('إظهار','Show')}
          </button>
        </div>
      </label>

      <label className="acmField">
        <span>{l('اسم الموزع','Display name')} <em>{l('اختياري','Optional')}</em></span>
        <input
          placeholder={l('اسم العرض','Display name')}
          value={form.displayName}
          onChange={e=>setForm({...form,displayName:e.target.value})}
        />
      </label>

      <label className="acmField">
        <span>{l('البريد الإلكتروني','Email')} <em>{l('اختياري','Optional')}</em></span>
        <input
          dir="ltr"
          type="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={e=>setForm({...form,email:e.target.value})}
        />
      </label>

      <label className="acmField acmStartCredit">
        <span>{l('رصيد البداية','Starting balance')} ({balanceUnit(balanceConfig,lang)})</span>
        <div className="acmCreditInput">
          <input
            dir="ltr"
            type="number"
            min="0"
            inputMode="numeric"
            value={form.credits}
            onChange={e=>setForm({...form,credits:e.target.value})}
          />
          <b>{balanceUnit(balanceConfig,lang)}</b>
        </div>
      </label>

      <div className="acmCreateActions">
        <button className="acmPrimaryBtn acmCreateBtn" disabled={busy}>
          <NavIcon name="userPlus"/>
          <span>{busy?l('جارٍ الإنشاء…','Creating…'):l('إنشاء الموزع','Create reseller')}</span>
        </button>
      </div>
    </form>
  </section>;
}

function ManageResellers({data,action,busy,admin=false,balanceConfig}) {
  const {lang,l}=useLanguage();
  const [amounts,setAmounts]=useState({});
  const [openId,setOpenId]=useState(null);

  function countryName(code){
    if(!code) return l('غير متاح','Unavailable');
    try{
      return new Intl.DisplayNames([lang==='en'?'en':'ar'],{type:'region'}).of(String(code).toUpperCase())||code;
    }catch{return code;}
  }

  async function adjustCredit(reseller,direction){
    const raw=Math.trunc(Math.abs(Number(amounts[reseller.id]||0)));
    if(!Number.isSafeInteger(raw)||raw<=0) return;
    const amount=direction==='minus'?-raw:raw;
    await action('/api/admin/credit-adjust',{
      resellerId:reseller.id,
      amount,
      note:direction==='minus'?l('خصم رصيد','Balance deduction'):l('إضافة رصيد','Balance addition')
    });
    setAmounts(v=>({...v,[reseller.id]:''}));
  }

  return <section className="section resellerManagementPage">
    <div className="resellerManagementHeader">
      <div>
        <h2>{l('إدارة الموزعين','Manage resellers')}</h2>
        <span>{num(data.resellers.length)} {l('موزع','resellers')}</span>
      </div>
      <div className="managementSummary">
        <div><span>{l('إجمالي الرصيد','Total balance')}</span><b>{num(data.resellers.reduce((sum,r)=>sum+Number(r.credits||0),0))} {balanceUnit(balanceConfig,lang)}</b></div>
        <div><span>{l('إجمالي الأكواد','Total codes')}</span><b>{num(data.resellers.reduce((sum,r)=>sum+Number(r.issued_codes||0),0))}</b></div>
      </div>
    </div>

    {data.resellers.length===0 ? <div className="emptyState compact">{l('لا يوجد موزعون.','No resellers.')}</div> :
      <div className="resellerAccordion">
        {data.resellers.map(r=>{
          const open=openId===r.id;
          const d=r.last_login_at?new Date(r.last_login_at):null;
          const lastLogin=d&&!Number.isNaN(d.getTime())
            ? d.toLocaleString(lang==='en'?'en-US':'ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
            : l('لم يسجل دخول بعد','No login yet');

          return <article className={'resellerAccordionCard '+(open?'open':'')} key={r.id}>
            <button
              type="button"
              className="resellerAccordionSummary"
              onClick={()=>setOpenId(open?null:r.id)}
              aria-expanded={open}
            >
              <div className="resellerCompactIdentity">
                <div className="resellerInitial">{(r.display_name||r.username||'R').slice(0,1).toUpperCase()}</div>
                <div>
                  <b>{r.display_name||r.username}</b>
                  <span>@{r.username}</span>
                </div>
              </div>

              <div className="resellerCompactStats">
                <div><strong>{num(r.credits)}</strong><span>{balanceUnit(balanceConfig,lang)}</span></div>
                <div><strong>{num(r.issued_codes)}</strong><span>{l('كود','codes')}</span></div>
              </div>

              <span className={'resellerStatus '+(r.status==='active'?'active':'blocked')}>
                {r.status==='active'?l('نشط','Active'):l('متوقف','Disabled')}
              </span>

              <span className="resellerAccordionToggle">{open?'−':'+'}</span>
            </button>

            {open&&<div className="resellerAccordionDetails">
              <div className="resellerDetailGrid">
                <div><span>{l('الدولة','Country')}</span><b>{countryName(r.last_country)}</b></div>
                <div><span>{l('IP آخر دخول','Last login IP')}</span><b className="mono resellerIp">{r.last_login_ip||'—'}</b></div>
                <div><span>{l('آخر دخول','Last login')}</span><b>{lastLogin}</b></div>
                <div><span>Email</span><b>{r.email||'—'}</b></div>
                <div><span>{l('الرصيد الحالي','Current balance')}</span><b>{num(r.credits)} {balanceUnit(balanceConfig,lang)}</b></div>
                <div><span>{l('إجمالي الأكواد','Total codes')}</span><b>{num(r.issued_codes)}</b></div>
                <div><span>{l('نوع الحساب','Account type')}</span><b>{r.account_type==='agent'?l('وكيل','Agent'):l('موزع','Reseller')}</b></div>
                <div><span>{l('تابع لـ','Parent')}</span><b>{r.parent_name||r.parent_username||l('الإدارة','Administration')}</b></div>
              </div>

              {admin&&<div className="resellerRolePocket">
                <div>
                  <span>{l('تعديل الصلاحية','Change role')}</span>
                  <small>{l('حوّل الحساب مباشرة إلى موزع أو وكيل أو أدمن كامل.','Promote this account to reseller, agent, or full administrator.')}</small>
                </div>
                <select
                  value={r.account_type||'reseller'}
                  disabled={busy}
                  onChange={e=>action('/api/admin/user-role',{userId:r.id,accountType:e.target.value})}
                >
                  <option value="reseller">{l('موزع','Reseller')}</option>
                  <option value="agent">{l('وكيل — يقدر ينشئ موزعين تحته','Agent — can create sub-resellers')}</option>
                  <option value="admin">{l('أدمن — صلاحيات كاملة','Admin — full access')}</option>
                </select>
              </div>}

              {admin&&<div className="resellerCreditPocket">
                <div className="resellerCreditField">
                  <span>{l('تعديل الرصيد','Adjust balance')}</span>
                  <div className="creditMiniInput">
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="0"
                      value={amounts[r.id]??''}
                      onChange={e=>setAmounts(v=>({...v,[r.id]:e.target.value}))}
                    />
                    <small>{balanceUnit(balanceConfig,lang)}</small>
                  </div>
                </div>

                <div className="creditActionBtns">
                  <button
                    type="button"
                    className="creditAddBtn"
                    disabled={busy||Number(amounts[r.id]||0)<=0}
                    onClick={()=>adjustCredit(r,'plus')}
                  ><span>+</span> {l('إضافة','Add')}</button>
                  <button
                    type="button"
                    className="creditMinusBtn"
                    disabled={busy||Number(amounts[r.id]||0)<=0}
                    onClick={()=>adjustCredit(r,'minus')}
                  ><span>−</span> {l('خصم','Deduct')}</button>
                </div>
              </div>}
            </div>}
          </article>;
        })}
      </div>
    }
  </section>;
}

function Codes({codes,admin=false}) {
  const {lang,l}=useLanguage();
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
      <div><h2>{admin?l('كل الأكواد المفعلة','Issued codes'):l('أكوادي','My codes')}</h2></div>
      {codes.length>0&&<button className="secondary" onClick={download}>{l('تنزيل TXT','Download TXT')}</button>}
    </div>

    {codes.length===0 ? <div className="emptyState compact">{l('لا توجد أكواد.','No codes.')}</div> :
      <div className="codesAccordion">
        {codes.map(c=>{
          const isOpen=openId===c.id;
          const d=c.issued_at?new Date(c.issued_at):null;
          const dateText=d&&!Number.isNaN(d.getTime())?d.toLocaleDateString(lang==='en'?'en-US':'ar-EG',{year:'numeric',month:'2-digit',day:'2-digit'}):'—';
          const timeText=d&&!Number.isNaN(d.getTime())?d.toLocaleTimeString(lang==='en'?'en-US':'ar-EG',{hour:'2-digit',minute:'2-digit'}):'—';

          return <article className={'codeAccordionCard '+(isOpen?'open':'')} key={c.id}>
            <button
              type="button"
              className="codeAccordionSummary"
              onClick={()=>setOpenId(isOpen?null:c.id)}
              aria-expanded={isOpen}
            >
              <div className="codeAccordionServer">
                <span>{l('السيرفر','Server')}</span>
                <b>{c.server_name}</b>
              </div>

              <div className={'codeAccordionCode mono '+(admin?'adminUsedCode':'')}>{c.code}</div>

              <span className="codeAccordionStatus">{l('مفعّل','Issued')}</span>
              <span className="codeAccordionToggle">{isOpen?'−':'+'}</span>
            </button>

            {isOpen&&<div className="codeAccordionDetails">
              <div className="codeDetailGrid">
                {admin&&<div><span>{l('الموزع','Reseller')}</span><b>{c.reseller_name||c.reseller_username||'—'}</b></div>}
                <div><span>{l('العميل','Customer')}</span><b>{c.customer_ref||'—'}</b></div>
                <div><span>{l('التاريخ','Date')}</span><b>{dateText}</b></div>
                <div><span>{l('الوقت','Time')}</span><b>{timeText}</b></div>
                <div><span>{l('المدة','Duration')}</span><b>{l('سنوي','Annual')}</b></div>
              </div>

              <button type="button" className="copyCodeBtn" onClick={()=>copy(c.code)}>{l('نسخ الكود','Copy code')}</button>
            </div>}
          </article>
        })}
      </div>
    }
  </section>;
}
function Issue({data,action,busy}) {
  const {lang,l}=useLanguage();
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

  return <section className="acmIssueCard">
    <div className="acmIssueHead">
      <div>
        <h2>{l('إنشاء كود IPTV','Issue IPTV code')}</h2>
      </div>
      <div className="acmBalancePill">
        <span>{l('الرصيد','Balance')}</span>
        <div dir="ltr"><strong>{num(balance)}</strong><small>{balanceUnit(data.balanceConfig,lang)}</small></div>
      </div>
    </div>

    <div className="acmIssueTabs">
      <button type="button" className={mode==='single'?'active':''} onClick={()=>setMode('single')}>{l('كود واحد','Single code')}</button>
      <button type="button" className={mode==='bulk'?'active':''} onClick={()=>setMode('bulk')}>{l('مجموعة أكواد','Multiple codes')}</button>
    </div>

    <form className="acmIssueForm" onSubmit={submit}>
      <label className="acmField">
        <span>{l('السيرفر','Server')}</span>
        <select value={form.serverId} onChange={e=>{setForm({...form,serverId:e.target.value});setResult(null);}} required>
          <option value="">{l('اختر السيرفر','Select server')}</option>
          {data.servers.filter(s=>Number(s.active)===1).map(s=>
            <option value={s.id} key={s.id}>{s.name} — {num(s.credit_cost)} {balanceUnit(data.balanceConfig,lang)}</option>
          )}
        </select>
      </label>

      <label className="acmField">
        <span>{l('اسم العميل أو رقم الهاتف','Customer name or phone')}</span>
        <input value={form.customerRef} onChange={e=>setForm({...form,customerRef:e.target.value})} placeholder={l('اسم أو رقم','Name or phone')}/>
      </label>

      {mode==='bulk'&&<label className="acmField">
        <span>{l('عدد الأكواد','Number of codes')}</span>
        <input dir="ltr" type="number" min="1" max="100" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
      </label>}

      <div className="acmIssueStats">
        <div><span>{l('العدد','Quantity')}</span><b dir="ltr">{q}</b></div>
        <div><span>{l('التكلفة','Cost')}</span><b dir="ltr">{num(total)} {balanceUnit(data.balanceConfig,lang)}</b></div>
        <div><span>{l('بعد الإنشاء','After issue')}</span><b dir="ltr">{num(Math.max(0,balance-total))} {balanceUnit(data.balanceConfig,lang)}</b></div>
      </div>

      <button className="acmPrimaryBtn acmActivateBtn" disabled={busy||!selected}>
        {busy?l('جارٍ الإنشاء…','Issuing…'):l('إنشاء الكود','Issue code')}
      </button>
    </form>

    {result&&<div className="acmIssueResult">
      <div className="acmResultTop">
        <div>
          <b>{result.order.server}</b>
          <span>{l('تم التفعيل','Issued')}</span>
        </div>
        <div className="acmResultBtns">
          <button type="button" onClick={copyAll}>{l('نسخ','Copy')}</button>
          {result.codes.length>1&&<button type="button" onClick={download}>TXT</button>}
        </div>
      </div>

      <div className="acmResultCodes">
        {result.codes.map(x=>
          <button dir="ltr" key={x.id} onClick={()=>navigator.clipboard.writeText(x.code)}>{x.code}</button>
        )}
      </div>
    </div>}
  </section>;
}

function AdminCredit({data,action,busy}) {
  const {lang,l}=useLanguage();
  return <section className="section">
    <div className="sectionHead"><div><h2>{l('طلبات الرصيد','Balance requests')}</h2></div></div>
    <Table><thead><tr><th>{l('الموزع','Reseller')}</th><th>{l('الكمية','Amount')}</th><th>{l('الملاحظة','Note')}</th><th>{l('الحالة','Status')}</th><th>{l('التاريخ','Date')}</th><th>{l('قرار','Action')}</th></tr></thead>
    <tbody>{data.requests.map(r=><tr key={r.id}><td>{r.display_name||r.username}</td><td>{num(r.amount)} {balanceUnit(data.balanceConfig,lang)}</td><td>{r.note||'—'}</td><td><span className={'badge '+r.status}>{r.status}</span></td><td>{fmt(r.created_at,lang)}</td><td>{r.status==='pending'?<div className="inlineBtns"><button disabled={busy} onClick={()=>action('/api/admin/credit-requests/resolve',{requestId:r.id,decision:'approved'})}>{l('قبول','Approve')}</button><button disabled={busy} onClick={()=>action('/api/admin/credit-requests/resolve',{requestId:r.id,decision:'rejected'})}>{l('رفض','Reject')}</button></div>:'—'}</td></tr>)}</tbody></Table>
  </section>;
}

function RequestCredit({data,action,busy}) {
  const {lang,l}=useLanguage();
  const [form,setForm]=useState({amount:10,note:''});
  return <div className="twoCol">
    <section className="section">
      <div className="sectionHead"><div><h2>{l('طلب رصيد','Request balance')}</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/credit-requests',form);setForm({amount:10,note:''});}}>
        <label>{l('المبلغ','Amount')} ({balanceUnit(data.balanceConfig,lang)})</label>
        <input type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/>
        <textarea rows="5" placeholder={l('ملاحظة','Note')} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        <button className="primary" disabled={busy}>{l('إرسال الطلب','Send request')}</button>
      </form>
    </section>
    <section className="section">
      <div className="sectionHead"><div><h2>{l('طلباتي','My requests')}</h2></div></div>
      <div className="list">{data.requests.map(r=><div className="listRow" key={r.id}><b>{r.amount} {balanceUnit(data.balanceConfig,lang)}</b><span className={'badge '+r.status}>{r.status}</span><small>{fmt(r.created_at,lang)}</small></div>)}</div>
    </section>
  </div>;
}

function Apps({data,action,busy,admin}) {
  const {l}=useLanguage();
  const [form,setForm]=useState({name:'',platform:'android',version:'',description:'',imageUrl:'',downloadUrl:'',visibility:'all'});

  return <div className={admin?'twoCol appsLayout':'appsSingle'}>
    {admin&&<section className="section">
      <div className="sectionHead"><div><h2>{l('إضافة تطبيق أو سوفت وير','Add app or software')}</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{
        e.preventDefault();
        await action('/api/admin/apps',form);
        setForm({...form,name:'',version:'',description:'',imageUrl:'',downloadUrl:''});
      }}>
        <label>{l('الاسم','Name')}</label>
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>

        <label>{l('النوع','Type')}</label>
        <select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}>
          <option value="android">Android</option>
          <option value="windows">Windows</option>
          <option value="receiver">Receiver Software</option>
          <option value="other">Other</option>
        </select>

        <label>Version</label>
        <input value={form.version} onChange={e=>setForm({...form,version:e.target.value})}/>

        <label>{l('رابط الصورة','Image URL')}</label>
        <input type="url" placeholder="https://..." value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})}/>
        {form.imageUrl&&<div className="appPosterPreview"><img src={form.imageUrl} alt="" onError={e=>{e.currentTarget.style.display='none';}}/></div>}

        <label>{l('رابط التحميل','Download URL')}</label>
        <input type="url" placeholder="https://..." value={form.downloadUrl} onChange={e=>setForm({...form,downloadUrl:e.target.value})} required/>

        <label>{l('الوصف','Description')}</label>
        <textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>

        <label>{l('الظهور','Visibility')}</label>
        <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
          <option value="all">{l('للجميع','Everyone')}</option>
          <option value="reseller">{l('للموزعين','Resellers')}</option>
          <option value="admin">{l('للإدارة','Admin')}</option>
        </select>

        <button className="primary" disabled={busy}>{l('إضافة','Add')}</button>
      </form>
    </section>}

    <section className="section">
      <div className="sectionHead"><div><h2>{l('التطبيقات والسوفت وير','Apps & software')}</h2></div></div>
      {data.apps.length===0 ? <div className="emptyState compact">{l('لا توجد عناصر.','No items.')}</div> :
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
              <a className="downloadAction" href={a.download_url} target="_blank" rel="noreferrer">{l('تحميل','Download')}</a>
            </div>
          </article>)}
        </div>}
    </section>
  </div>;
}

function Logs({logs,admin}) {
  const {lang,l}=useLanguage();
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState('all');
  const [openId,setOpenId]=useState(null);

  const actionMeta={
    LOGIN_SUCCESS:[l('تسجيل دخول','Login'),'session'],
    LOGOUT:[l('تسجيل خروج','Logout'),'session'],
    CREDIT_REQUEST_CREATED:[l('طلب رصيد','Balance request'),'credit'],
    CREDIT_REQUEST_APPROVED:[l('قبول طلب رصيد','Balance approved'),'credit'],
    CREDIT_REQUEST_REJECTED:[l('رفض طلب رصيد','Balance rejected'),'credit'],
    CREDIT_ADJUSTED:[l('تعديل رصيد','Balance adjusted'),'credit'],
    RESELLER_CREATED:[l('إنشاء موزع','Reseller created'),'account'],
    ADMIN_PARTNER_CREATED:[l('إنشاء شريك أدمن','Admin partner created'),'account'],
    CODES_IMPORTED:[l('رفع أكواد','Codes imported'),'codes'],
    CODES_ISSUED:[l('تفعيل أكواد','Codes issued'),'codes'],
    SHARING_CODES_IMPORTED:[l('رفع أكواد شيرنج','Sharing codes imported'),'codes'],
    SHARING_SERVICE_CREATED:[l('إضافة قسم شيرنج','Sharing service added'),'system'],
    SHARING_SERVICE_UPDATED:[l('تعديل قسم شيرنج','Sharing service updated'),'system'],
    SHARING_SERVICE_ARCHIVED:[l('حذف/أرشفة قسم شيرنج','Sharing service archived'),'system'],
    SHARING_SERVICE_DELETED:[l('حذف قسم شيرنج','Sharing service deleted'),'system'],
    SHARING_CODES_ISSUED:[l('تفعيل شيرنج','Sharing codes issued'),'codes'],
    IPTV_CODE_ADDED:[l('إضافة كود IPTV','IPTV code added'),'codes'],
    IPTV_CODE_UPDATED:[l('تعديل كود IPTV','IPTV code updated'),'codes'],
    IPTV_CODE_DELETED:[l('حذف كود IPTV','IPTV code deleted'),'codes'],
    IPTV_CODES_DELETED_ALL:[l('حذف جماعي لأكواد IPTV','IPTV codes bulk deleted'),'codes'],
    SHARING_CODE_ADDED:[l('إضافة كود شيرنج','Sharing code added'),'codes'],
    SHARING_CODE_UPDATED:[l('تعديل كود شيرنج','Sharing code updated'),'codes'],
    SHARING_CODE_DELETED:[l('حذف كود شيرنج','Sharing code deleted'),'codes'],
    SHARING_CODES_DELETED_ALL:[l('حذف جماعي لأكواد الشيرنج','Sharing codes bulk deleted'),'codes'],
    SERVER_CREATED:[l('إضافة سيرفر','Server added'),'system'],
    PACKAGE_CREATED:[l('إضافة باقة','Package added'),'system'],
    APP_ADDED:[l('إضافة تطبيق','App added'),'system'],
    ADMIN_PASSWORD_CHANGED:[l('تغيير كلمة المرور','Password changed'),'account']
  };
  const entityNames={
    session:l('جلسة','Session'),
    credit_request:l('طلب رصيد','Balance request'),
    user:l('حساب','Account'),
    code_batch:l('دفعة أكواد','Code batch'),
    issue_order:l('تفعيل أكواد','Code issue'),
    sharing_batch:l('دفعة شيرنج','Sharing batch'),
    sharing_order:l('تفعيل شيرنج','Sharing issue'),
    server:l('سيرفر','Server'),
    package:l('باقة','Package'),
    app:l('تطبيق','App')
  };
  const detailNames={
    amount:l('الرصيد','Balance'),
    before:l('قبل','Before'),
    after:l('بعد','After'),
    quantity:l('العدد','Quantity'),
    totalCost:l('الإجمالي','Total'),
    customerRef:l('العميل','Customer'),
    filename:l('الملف','File'),
    inserted:l('تمت الإضافة','Inserted'),
    duplicateCount:l('المكرر','Duplicates'),
    displayName:l('الاسم','Name'),
    username:'Username',
    initialCredits:l('رصيد البداية','Starting balance'),
    name:l('الاسم','Name'),
    platform:l('النوع','Type'),
    visibility:l('الظهور','Visibility'),
    service:l('الخدمة','Service')
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
      <div><h2>{admin?l('السجل الكامل','Activity log'):l('السجل','Activity')}</h2></div>
      <small>{num(filtered.length)} {l('عملية','events')}</small>
    </div>

    <div className="logToolbar">
      <input placeholder={l('بحث','Search')} value={query} onChange={e=>setQuery(e.target.value)}/>
      <select value={kind} onChange={e=>setKind(e.target.value)}>
        <option value="all">{l('كل العمليات','All')}</option>
        <option value="codes">{l('الأكواد','Codes')}</option>
        <option value="credit">{l('الرصيد','Balance')}</option>
        <option value="account">{l('الحسابات','Accounts')}</option>
        <option value="session">{l('الدخول والخروج','Sessions')}</option>
        <option value="system">{l('النظام','System')}</option>
      </select>
    </div>

    <div className="professionalLogs">
      {filtered.length===0 ? <div className="emptyState compact">{l('لا توجد نتائج.','No results.')}</div> :
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
                <small>{admin?(log.actor_name||log.actor_username||'SYSTEM'):l('حسابي','My account')} · {fmt(log.created_at,lang)}</small>
              </div>
              <span className="proLogEntity">{entityNames[log.entity_type]||log.entity_type||l('عملية','Event')}</span>
              <span className="proLogToggle">{open?'−':'+'}</span>
            </button>

            {open&&<div className="proLogDetails">
              {admin&&<div><span>{l('المستخدم','User')}</span><b>{log.actor_name||log.actor_username||'SYSTEM'}</b></div>}
              <div><span>{l('النوع','Type')}</span><b>{entityNames[log.entity_type]||log.entity_type||'—'}</b></div>
              <div><span>{l('التاريخ','Date')}</span><b>{fmt(log.created_at,lang)}</b></div>
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
  const {l}=useLanguage();
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  async function submit(e){
    e.preventDefault();
    setError('');
    if(newPassword.length<12){ setError(l('كلمة المرور الجديدة يجب أن تكون 12 حرفًا على الأقل.','New password must be at least 12 characters.')); return; }
    if(newPassword!==confirm){ setError(l('تأكيد كلمة المرور غير مطابق.','Password confirmation does not match.')); return; }
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
      setError(code.includes('CURRENT_PASSWORD_WRONG')?l('كلمة المرور الحالية غير صحيحة.','Current password is incorrect.'):l('تعذر تغيير كلمة المرور.','Unable to change password.'));
    }finally{setBusy(false);}
  }

  return <div className="authPage">
    <header className="authTopbar"><Logo compact/><LanguageSwitcher compact/></header>
    <main className="authMain">
      <form className="authCard authPasswordCard" onSubmit={submit}>
        <div className="authCardHead">
          <h1>{l('تغيير كلمة المرور','Change password')}</h1>
        </div>
        <div className="authForm">
          <label><span>{l('كلمة المرور الحالية','Current password')}</span><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label>
          <label><span>{l('كلمة المرور الجديدة','New password')}</span><input type="password" minLength="12" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></label>
          <label><span>{l('تأكيد كلمة المرور','Confirm password')}</span><input type="password" minLength="12" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>
          {error&&<div className="authError">{error}</div>}
          <button className="primary authSubmit" disabled={busy}>{busy?l('جارٍ الحفظ','Saving…'):l('حفظ كلمة المرور','Save password')}</button>
        </div>
      </form>
    </main>
  </div>;
}

function App() {
  const [lang,setLangState]=useState(()=>{
    try{return localStorage.getItem('acm_language')==='en'?'en':'ar';}catch{return 'ar';}
  });
  const setLang=(value)=>{
    const next=value==='en'?'en':'ar';
    setLangState(next);
    try{localStorage.setItem('acm_language',next);}catch{}
  };
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
  useEffect(()=>{
    document.documentElement.lang=lang==='en'?'en':'ar';
    document.documentElement.dir=lang==='en'?'ltr':'rtl';
    document.body.dir=lang==='en'?'ltr':'rtl';
  },[lang]);

  const content=loading ? <div className="bootGate" aria-label={lang==='en'?'Loading':'جارٍ التحميل'}/>
    : !user ? <Login onAuth={(u,c)=>{setUser(u);setCsrf(c);}}/>
    : user.mustChangePassword ? <ForcePasswordChange csrf={csrf} onDone={()=>setUser({...user,mustChangePassword:false})}/>
    : <Panel user={user} csrf={csrf} onLogout={()=>{setUser(null);setCsrf('');}}/>;

  return <LanguageContext.Provider value={{lang,setLang}}>
    {content}
  </LanguageContext.Provider>;
}
createRoot(document.getElementById('root')).render(<App/>);
