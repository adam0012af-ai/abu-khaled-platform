import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const fmt = (v,lang='ar') => v ? new Date(v).toLocaleString(lang==='en'?'en-US':'ar-EG') : '—';
const num = (v) => Number(v || 0).toLocaleString('en-US');

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
  const isOwner = isAdmin && String(user.username||'').toLowerCase()==='owner';
  const adminNav = [
    {id:'overview',label:l('الرئيسية','Dashboard'),icon:'home'},
    {id:'servers',label:l('إضافة سيرفر','Add server'),icon:'server'},
    {id:'inventory',label:l('المخزون','Inventory'),icon:'inventory'},
    {id:'import',label:l('رفع الأكواد','Import codes'),icon:'upload'},
    {id:'resellers',label:l('الموزعون','Resellers'),icon:'users',children:[
      {id:'reseller-create',label:l('إنشاء موزع','Create reseller'),icon:'userPlus'},
      {id:'reseller-manage',label:l('إدارة الموزعين','Manage resellers'),icon:'manageUsers'}
    ]},
    {id:'issued',label:l('الأكواد المفعلة','Issued codes'),icon:'codes'},
    {id:'credit',label:l('طلبات الكريدت','Credit requests'),icon:'credit'},
    {id:'apps',label:l('التطبيقات والسوفت وير','Apps & software'),icon:'apps'},
    {id:'sharing',label:l('الشيرنج','Sharing'),icon:'sharing'},
    {id:'partners',label:l('الشركاء','Administrators'),icon:'users'},
    {id:'logs',label:l('السجل الكامل','Activity log'),icon:'logs'},
    {id:'profile',label:l('البروفايل','Profile'),icon:'profile'}
  ];
  const resellerNav = [
    {id:'overview',label:l('الرئيسية','Dashboard'),icon:'home'},
    {id:'issue',label:l('إنشاء الأكواد','Issue codes'),icon:'issue'},
    {id:'mycodes',label:l('أكوادي','My codes'),icon:'codes'},
    {id:'credit',label:l('طلب كريدت','Request credit'),icon:'credit'},
    {id:'apps',label:l('التطبيقات والسوفت وير','Apps & software'),icon:'apps'},
    {id:'sharing',label:l('الشيرنج','Sharing'),icon:'sharing'},
    {id:'logs',label:l('السجل','Activity'),icon:'logs'},
    {id:'profile',label:l('البروفايل','Profile'),icon:'profile'}
  ];
  const navItems = isAdmin ? adminNav : resellerNav;
  const allowedTabs = useMemo(()=>navItems.flatMap(item=>item.children?[item.id,...item.children.map(x=>x.id)]:[item.id]).filter(id=>id!=='resellers'),[isAdmin]);
  const initialTab = useMemo(()=>tabFromHash(user.role,allowedTabs),[user.role,allowedTabs]);
  const [tab,setTab] = useState(initialTab);
  const [menuOpen,setMenuOpen] = useState(false);
  const [resellerPocketOpen,setResellerPocketOpen] = useState(()=>['reseller-create','reseller-manage'].includes(initialTab));
  const flatNavItems = useMemo(()=>navItems.flatMap(item=>item.children||[item]),[navItems]);
  const currentLabel = flatNavItems.find(item=>item.id===tab)?.label || l('الرئيسية','Dashboard');
  const emptyData={ dashboard:null, profile:null, servers:[], packages:[], resellers:[], codes:[], requests:[], apps:[], logs:[] };
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
      if(['reseller-create','reseller-manage'].includes(next)) setResellerPocketOpen(true);
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
        INVALID_APP:l('تحقق من الروابط.','Check the links.')
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
            <span>{isAdmin?(isOwner?l('لوحة المالك','OWNER PANEL'):l('شريك أدمن','PARTNER ADMIN')):l('لوحة الموزع','RESELLER PANEL')}</span>
            <b>{user.displayName||user.username}</b>
            {!isAdmin&&<small>{num(data.dashboard?.user?.credits ?? user.credits)} CREDIT</small>}
          </div>
          <span className="sidebarOnlineDot" title="Online"/>
        </div>

        <div className="sidebarSectionTitle">{l('القائمة','MENU')}</div>

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
            </button>;
          })}
        </nav>

        <div className="sidebarFooter">
          <small>Developed by TTV4K</small>
        </div>
      </aside>

      {menuOpen && <button className="sidebarBackdrop" onClick={()=>setMenuOpen(false)} aria-label={l('إغلاق القائمة','Close menu')}/>}

      <main className="contentArea">
        <header className="contentHeader">
          <div className="contentHeaderMeta">
            <span>ACTIVE CODE MULTI</span>
            <b>{currentLabel}</b>
          </div>
          <div className="contentHeaderActions">
            <button className="sidebarOpen" onClick={()=>setMenuOpen(true)} aria-label={l('فتح القائمة','Open menu')}>
              <span className="hamburgerLines" aria-hidden="true"><i/><i/><i/></span>
            </button>
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
            {tab==='overview' && isAdmin && <AdminOverview data={data}/>}
            {tab==='overview' && !isAdmin && <ResellerOverview data={data} goTo={goTo}/>}
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
            {tab==='sharing' && <Sharing admin={isAdmin} call={call} action={action} busy={busy}/>} 
            {tab==='partners' && isAdmin && <AdminPartners call={call} action={action} busy={busy}/>}
            {tab==='logs' && <Logs logs={data.logs} admin={isAdmin}/>} 
            {tab==='profile' && <ProfilePage profile={data.profile||user} user={user} call={call} logout={logout}/>}
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

function Sharing({admin,call,action,busy}){
  const {lang,l}=useLanguage();
  const [data,setData]=useState({services:[],codes:[],balance:0});
  const [ready,setReady]=useState(false);
  const [importForm,setImportForm]=useState({serviceId:'',filename:'sharing-codes.txt',text:''});
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
        balance:Number(out.balance||0)
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
      <div><h2>{l('الشيرنج','Sharing')}</h2></div>
      {!admin&&<div className="sharingBalance"><span>{l('الرصيد','Balance')}</span><b>{num(data.balance)}</b><small>Credit</small></div>}
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
          <small>{num(service.credit_cost)} CREDIT</small>
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
          <select value={importForm.serviceId} onChange={e=>setImportForm(v=>({...v,serviceId:e.target.value}))} required>
            <option value="">{l('اختر الخدمة','Select service')}</option>
            {data.services.map(s=><option key={s.id} value={s.id}>{lang==='en'?s.name_en:s.name_ar}</option>)}
          </select>
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

        <button className="acmPrimaryBtn sharingSubmit" disabled={busy||!importForm.serviceId||!importForm.text.trim()}>
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
          {selected&&<small>{num(selected.credit_cost)} Credit</small>}
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
          {busy?l('جارٍ التفعيل…','Issuing…'):l('تفعيل','Issue')}
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
    <div className="sharingCodesHead">
      <h3>{admin?l('الأكواد المفعلة','Issued sharing codes'):l('أكواد الشيرنج الخاصة بي','My sharing codes')}</h3>
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
            {open&&<div className="sharingCodeDetails">
              <div><span>{l('العميل','Customer')}</span><b>{code.customer_ref||'—'}</b></div>
              <div><span>{l('التاريخ','Date')}</span><b>{fmt(code.issued_at,lang)}</b></div>
              <button type="button" onClick={()=>copy(code.code)}>{l('نسخ الكود','Copy code')}</button>
            </div>}
          </article>;
        })}
      </div>
    }
  </section>;
}


function ProfilePage({profile,user,call,logout}) {
  const {lang,l}=useLanguage();
  const [form,setForm]=useState({currentPassword:'',newPassword:'',confirmPassword:''});
  const [show,setShow]=useState(false);
  const [passwordOpen,setPasswordOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const p=profile||user||{};
  const country=p.lastCountry||p.last_country||'—';
  const lastLogin=p.lastLoginAt||p.last_login_at||null;
  const initial=(p.displayName||p.display_name||p.username||'U').slice(0,1).toUpperCase();

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
      setMessage(l('تم تغيير كلمة المرور.','Password changed.'));
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

  return <section className="profilePage">
    <div className="profileHero">
      <div className="profileAvatarLarge">{initial}</div>
      <div className="profileIdentity">
        <h2>{p.displayName||p.display_name||p.username}</h2>
        <span className="mono">@{p.username}</span>
        <div className="profileBadges">
          <span>{user.role==='admin'?l('إدارة','Admin'):l('موزع','Reseller')}</span>
          <span className="online">{l('نشط','Active')}</span>
        </div>
      </div>
      {user.role==='reseller'&&<div className="profileBalance">
        <span>{l('الرصيد','Balance')}</span>
        <strong>{num(p.credits)}</strong>
        <small>CREDIT</small>
      </div>}
    </div>

    <div className="profileGrid">
      <section className="profileCard">
        <div className="profileCardHead">
          <h3>{l('بيانات الحساب','Account')}</h3>
        </div>
        <div className="profileInfoGrid">
          <div><span>{l('اسم المستخدم','Username')}</span><b className="mono">{p.username||'—'}</b></div>
          <div><span>{l('البريد الإلكتروني','Email')}</span><b>{p.email||'—'}</b></div>
          <div><span>{l('الدولة','Country')}</span><b>{country}</b></div>
          <div><span>{l('آخر IP','Last IP')}</span><b className="mono">{p.lastLoginIp||p.last_login_ip||'—'}</b></div>
          <div><span>{l('آخر دخول','Last login')}</span><b>{lastLogin?fmt(lastLogin,lang):'—'}</b></div>
          <div><span>{l('الحالة','Status')}</span><b>{l('نشط','Active')}</b></div>
        </div>
      </section>

      <section className={'profileCard profileSecurity '+(passwordOpen?'open':'')}>
        <button type="button" className="profileSecurityHead" onClick={()=>setPasswordOpen(v=>!v)}>
          <span className="securityGlyph">⌁</span>
          <span className="securityCopy">
            <b>{l('الأمان وكلمة المرور','Security & password')}</b>
            <small>{l('تغيير كلمة المرور','Change password')}</small>
          </span>
          <span className="securityAction">{passwordOpen?'−':'+'}</span>
        </button>

        {passwordOpen&&<form className="profilePasswordForm" onSubmit={changePassword}>
          <div className="profilePasswordGrid">
            <label>
              <span>{l('كلمة المرور الحالية','Current password')}</span>
              <input type={show?'text':'password'} value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})} autoComplete="current-password"/>
            </label>
            <label>
              <span>{l('كلمة المرور الجديدة','New password')}</span>
              <input type={show?'text':'password'} value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})} autoComplete="new-password"/>
            </label>
            <label>
              <span>{l('تأكيد كلمة المرور','Confirm password')}</span>
              <input type={show?'text':'password'} value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} autoComplete="new-password"/>
            </label>
          </div>
          <div className="profilePasswordActions">
            <button type="button" className="profileShowBtn" onClick={()=>setShow(v=>!v)}>{show?l('إخفاء','Hide'):l('إظهار','Show')}</button>
            <button className="primary" disabled={busy}>{busy?l('جارٍ الحفظ…','Saving…'):l('حفظ','Save')}</button>
          </div>
          {message&&<div className="profileMessage">{message}</div>}
        </form>}
      </section>
    </div>

    <section className="profileDangerCard">
      <div>
        <h3>{l('الحساب','Account')}</h3>
      </div>
      <button type="button" className="profileLogoutBtn" onClick={logout}>
        <span>↪</span>
        {l('تسجيل الخروج','Sign out')}
      </button>
    </section>
  </section>;
}

function AdminOverview({data}) {
  const {l}=useLanguage();
  const c=data.dashboard?.counts||{};
  const stats=[
    {label:l('إجمالي الأكواد','Total codes'),value:c.total_codes,tone:'blue'},
    {label:l('الأكواد المتاحة','Available codes'),value:c.available,tone:'green'},
    {label:l('الأكواد المفعلة','Issued codes'),value:c.issued,tone:'violet'},
    {label:l('الموزعون','Resellers'),value:c.resellers,tone:'orange'},
    {label:l('طلبات الكريدت','Credit requests'),value:c.pending_requests,tone:'pink'},
    {label:l('رصيد الموزعين','Reseller credit'),value:c.reseller_credits,tone:'cyan'}
  ];

  return <section className="section dashboardSummary premiumDashboard">
    <div className="dashboardHeader">
      <div>
        <h2>{l('الرئيسية','Dashboard')}</h2>
      </div>
      <div className="adminBalanceOpen">
        <span>{l('رصيد الإدارة','Admin balance')}</span>
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
      CREDIT_REQUEST_CREATED:l('طلب رصيد','Credit request'),
      PASSWORD_CHANGED:l('تغيير كلمة المرور','Password changed')
    };
    return map[action]||String(action||'').replaceAll('_',' ');
  };

  const stats=[
    {label:l('إجمالي الأكواد','Total codes'),value:c.issued||0,icon:'codes'},
    {label:l('أكواد السيرفر','Server codes'),value:c.main_issued||0,icon:'server'},
    {label:l('أكواد الشيرنج','Sharing codes'),value:c.sharing_issued||0,icon:'sharing'},
    {label:l('طلبات الرصيد','Credit requests'),value:c.pending_requests||0,icon:'credit'}
  ];

  const quickActions=[
    {id:'issue',label:l('إنشاء كود','Issue code'),hint:l('سيرفرات الأكواد','Server codes'),icon:'issue'},
    {id:'sharing',label:l('إنشاء شيرنج','Issue sharing'),hint:l('خدمات الشيرنج','Sharing services'),icon:'sharing'},
    {id:'mycodes',label:l('أكوادي','My codes'),hint:l('عرض كل الأكواد','View issued codes'),icon:'codes'},
    {id:'credit',label:l('طلب رصيد','Request credit'),hint:l('إرسال طلب للإدارة','Send request'),icon:'credit'}
  ];

  return <>
    <section className="section resellerPremiumBoard">
      <div className="resellerBoardHero">
        <div className="resellerBoardIdentity">
          <div className="resellerBoardEyebrow">
            <span>{l('لوحة الموزع','RESELLER DASHBOARD')}</span>
            <i className={profile.status==='blocked'?'blocked':'active'}>{profile.status==='blocked'?l('متوقف','DISABLED'):l('نشط','ACTIVE')}</i>
          </div>
          <h2>{user.displayName||profile.displayName||user.username||''}</h2>
          <small>@{user.username||profile.username||''}</small>
        </div>

        <div className="resellerWalletCard">
          <span>{l('الرصيد الحالي','Current balance')}</span>
          <strong>{num(balance)}</strong>
          <small>CREDIT</small>
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
        <b>{profile.status==='blocked'?l('متوقف','Disabled'):l('موزع نشط','Active reseller')}</b>
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
          <div><h2>{l('طلبات الرصيد','Credit requests')}</h2></div>
          <small>{num(recentRequests.length)}</small>
        </div>
        {recentRequests.length===0 ? <div className="emptyState compact">{l('لا توجد طلبات.','No requests.')}</div> :
          <div className="resellerRequestList">
            {recentRequests.map(r=><article key={r.id}>
              <div><b>{num(r.amount)}</b><span>CREDIT</span></div>
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

function Servers({action,busy}) {
  const {l}=useLanguage();
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

      <label>{l('تكلفة الكود بالكريدت','Code credit cost')}</label>
      <input type="number" min="0" value={server.creditCost} onChange={e=>setServer({...server,creditCost:e.target.value})} required/>

      <label>{l('تنبيه انخفاض المخزون','Low stock alert')}</label>
      <input type="number" min="0" value={server.lowStockThreshold} onChange={e=>setServer({...server,lowStockThreshold:e.target.value})}/>

      <button className="primary" disabled={busy}>{l('إضافة سيرفر','Add server')}</button>
    </form>
  </section>;
}

function Inventory({data}) {
  const {l}=useLanguage();
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
            <span>{num(p?.credit_cost||0)} Credit</span>
            <span>{l('تنبيه عند','Alert at')} {num(s.low_stock_threshold||0)}</span>
          </div>
        </article>
      })}
    </div>
  </section>;
}

function ImportCodes({data,action,busy}) {
  const {l}=useLanguage();
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
      <div><h2>{l('رفع الأكواد','Import codes')}</h2></div>
    </div>

    <div className="importGrid">
      <form className="formGrid" onSubmit={async e=>{
        e.preventDefault();
        await action('/api/admin/import-codes',form);
        setForm({...form,text:''});
      }}>
        <label>{l('السيرفر','Server')}</label>
        <select value={form.serverId} onChange={e=>setForm({...form,serverId:e.target.value})} required>
          <option value="">{l('اختر السيرفر','Select server')}</option>
          {data.servers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
        </select>

        <label className="filePick">{l('اختيار ملف TXT','Choose TXT file')}<input type="file" accept=".txt,text/plain" onChange={pickFile}/></label>
        <textarea rows="14" placeholder={l('الصق الأكواد هنا — كود في كل سطر','Paste codes here — one per line')} value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/>
        <button className="primary" disabled={busy||unique.size===0||!form.serverId}>{l('استيراد','Import')}</button>
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
function CreateReseller({action,busy}) {
  const {l}=useLanguage();
  const [form,setForm]=useState({username:'',email:'',displayName:'',password:'',credits:0});
  const [showPassword,setShowPassword]=useState(false);

  async function submit(e){
    e.preventDefault();
    await action('/api/admin/resellers',form);
    setForm({username:'',email:'',displayName:'',password:'',credits:0});
    setShowPassword(false);
  }

  return <section className="acmCreateCard">
    <div className="acmCreateHead">
      <div className="acmCreateIcon"><NavIcon name="userPlus"/></div>
      <div>
        <h2>{l('إنشاء موزع','Create reseller')}</h2>
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
        <span>{l('رصيد البداية','Starting credit')}</span>
        <div className="acmCreditInput">
          <input
            dir="ltr"
            type="number"
            min="0"
            inputMode="numeric"
            value={form.credits}
            onChange={e=>setForm({...form,credits:e.target.value})}
          />
          <b>Credit</b>
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

function ManageResellers({data,action,busy}) {
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
      note:direction==='minus'?l('خصم رصيد','Credit deduction'):l('إضافة رصيد','Credit addition')
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
        <div><span>{l('إجمالي الرصيد','Total credit')}</span><b>{num(data.resellers.reduce((sum,r)=>sum+Number(r.credits||0),0))}</b></div>
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
                <div><strong>{num(r.credits)}</strong><span>Credit</span></div>
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
                <div><span>{l('الرصيد الحالي','Current credit')}</span><b>{num(r.credits)} Credit</b></div>
                <div><span>{l('إجمالي الأكواد','Total codes')}</span><b>{num(r.issued_codes)}</b></div>
              </div>

              <div className="resellerCreditPocket">
                <div className="resellerCreditField">
                  <span>{l('تعديل الرصيد','Adjust credit')}</span>
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
              </div>
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
  const {l}=useLanguage();
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
        <h2>{l('تفعيل كود','Issue code')}</h2>
      </div>
      <div className="acmBalancePill">
        <span>{l('الرصيد','Balance')}</span>
        <div dir="ltr"><strong>{num(balance)}</strong><small>Credit</small></div>
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
            <option value={s.id} key={s.id}>{s.name} — {num(s.credit_cost)} Credit</option>
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
        <div><span>{l('التكلفة','Cost')}</span><b dir="ltr">{num(total)} Credit</b></div>
        <div><span>{l('بعد التفعيل','After issue')}</span><b dir="ltr">{num(Math.max(0,balance-total))} Credit</b></div>
      </div>

      <button className="acmPrimaryBtn acmActivateBtn" disabled={busy||!selected}>
        {busy?l('جارٍ التفعيل…','Issuing…'):l('تفعيل','Issue')}
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
    <div className="sectionHead"><div><h2>{l('طلبات الكريدت','Credit requests')}</h2></div></div>
    <Table><thead><tr><th>{l('الموزع','Reseller')}</th><th>{l('الكمية','Amount')}</th><th>{l('الملاحظة','Note')}</th><th>{l('الحالة','Status')}</th><th>{l('التاريخ','Date')}</th><th>{l('قرار','Action')}</th></tr></thead>
    <tbody>{data.requests.map(r=><tr key={r.id}><td>{r.display_name||r.username}</td><td>{r.amount}</td><td>{r.note||'—'}</td><td><span className={'badge '+r.status}>{r.status}</span></td><td>{fmt(r.created_at,lang)}</td><td>{r.status==='pending'?<div className="inlineBtns"><button disabled={busy} onClick={()=>action('/api/admin/credit-requests/resolve',{requestId:r.id,decision:'approved'})}>{l('قبول','Approve')}</button><button disabled={busy} onClick={()=>action('/api/admin/credit-requests/resolve',{requestId:r.id,decision:'rejected'})}>{l('رفض','Reject')}</button></div>:'—'}</td></tr>)}</tbody></Table>
  </section>;
}

function RequestCredit({data,action,busy}) {
  const {lang,l}=useLanguage();
  const [form,setForm]=useState({amount:10,note:''});
  return <div className="twoCol">
    <section className="section">
      <div className="sectionHead"><div><h2>{l('طلب رصيد','Request credit')}</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/credit-requests',form);setForm({amount:10,note:''});}}>
        <input type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/>
        <textarea rows="5" placeholder={l('ملاحظة','Note')} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        <button className="primary" disabled={busy}>{l('إرسال الطلب','Send request')}</button>
      </form>
    </section>
    <section className="section">
      <div className="sectionHead"><div><h2>{l('طلباتي','My requests')}</h2></div></div>
      <div className="list">{data.requests.map(r=><div className="listRow" key={r.id}><b>{r.amount} Credit</b><span className={'badge '+r.status}>{r.status}</span><small>{fmt(r.created_at,lang)}</small></div>)}</div>
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
    CREDIT_REQUEST_CREATED:[l('طلب رصيد','Credit request'),'credit'],
    CREDIT_REQUEST_APPROVED:[l('قبول طلب رصيد','Credit approved'),'credit'],
    CREDIT_REQUEST_REJECTED:[l('رفض طلب رصيد','Credit rejected'),'credit'],
    CREDIT_ADJUSTED:[l('تعديل رصيد','Credit adjusted'),'credit'],
    RESELLER_CREATED:[l('إنشاء موزع','Reseller created'),'account'],
    ADMIN_PARTNER_CREATED:[l('إنشاء شريك أدمن','Admin partner created'),'account'],
    CODES_IMPORTED:[l('رفع أكواد','Codes imported'),'codes'],
    CODES_ISSUED:[l('تفعيل أكواد','Codes issued'),'codes'],
    SHARING_CODES_IMPORTED:[l('رفع أكواد شيرنج','Sharing codes imported'),'codes'],
    SHARING_CODES_ISSUED:[l('تفعيل شيرنج','Sharing codes issued'),'codes'],
    SERVER_CREATED:[l('إضافة سيرفر','Server added'),'system'],
    PACKAGE_CREATED:[l('إضافة باقة','Package added'),'system'],
    APP_ADDED:[l('إضافة تطبيق','App added'),'system'],
    ADMIN_PASSWORD_CHANGED:[l('تغيير كلمة المرور','Password changed'),'account']
  };
  const entityNames={
    session:l('جلسة','Session'),
    credit_request:l('طلب رصيد','Credit request'),
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
    amount:l('الرصيد','Credit'),
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
    initialCredits:l('رصيد البداية','Starting credit'),
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
        <option value="credit">{l('الرصيد','Credit')}</option>
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
