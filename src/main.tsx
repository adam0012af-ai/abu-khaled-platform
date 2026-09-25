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
    ['overview','الرئيسية'],['servers','السيرفرات والباقات'],['import','رفع الأكواد'],
    ['resellers','الموزعون'],['issued','الأكواد المفعلة'],['credit','طلبات الكريدت'],
    ['apps','التطبيقات والسوفت وير'],['logs','السجل الكامل']
  ];
  const resellerTabs = [
    ['issue','إنشاء كود'],['mycodes','أكوادي'],['credit','طلب كريدت'],
    ['apps','التطبيقات والسوفت وير'],['logs','السجل']
  ];
  const tabs = isAdmin ? adminTabs : resellerTabs;
  const [tab,setTab] = useState(tabs[0][0]);
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
      const next = { ...data, dashboard:dash, servers:servers.servers||[], packages:servers.packages||[], apps:apps.apps||[], logs:logs.logs||[], requests:requests.requests||[] };
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
        INSUFFICIENT_STOCK:'المخزون غير كافٍ.',
        SERVER_PACKAGE_MISMATCH:'الباكدج لا تتبع السيرفر المحدد.',
        ISSUE_CONFLICT_RETRY:'حدث تعارض لحظي أثناء الصرف. أعد المحاولة.',
        ACCOUNT_EXISTS:'اسم المستخدم أو البريد الإلكتروني مستخدم من قبل.',
        IMPORT_LIMIT_700:'الحد الحالي 700 كود في كل عملية رفع. للملفات الأكبر يتم تقسيمها على أكثر من دفعة.',
        NEGATIVE_BALANCE_NOT_ALLOWED:'لا يمكن أن يصبح الرصيد بالسالب.'
      };
      setNotice(map[e.message] || 'لم تتم العملية: '+e.message);
      throw e;
    } finally { setBusy(false); }
  }

  async function logout() {
    try { await call('/api/logout',{method:'POST',body:{}}); } catch {}
    onLogout();
  }

  return (
    <div className="appShell">
      <aside>
        <Logo compact/>
        <div className="userMini"><span>{user.displayName}</span><b>{isAdmin?'ADMIN':'RESELLER'}</b>{!isAdmin && <em>{num(data.dashboard?.user?.credits ?? user.credits)} CREDIT</em>}</div>
        <nav>{tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}>{label}</button>)}</nav>
        <button className="logout" onClick={logout}>تسجيل الخروج</button>
      </aside>
      <main className="panelMain">
        <header className="panelHeader">
          <div><span>ACTIVE CODE MULTI</span><h1>{tabs.find(x=>x[0]===tab)?.[1]}</h1></div>
          <div className="live"><i/> LIVE SYNC</div>
        </header>
        {notice && <div className="notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
        {tab==='overview' && isAdmin && <AdminOverview data={data}/>}
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
      </main>
    </div>
  );
}

function AdminOverview({data}) {
  const c=data.dashboard?.counts||{};
  return <>
    <div className="statsGrid">
      <Stat label="إجمالي الأكواد" value={c.total_codes}/>
      <Stat label="الأكواد المتاحة" value={c.available}/>
      <Stat label="الأكواد المفعلة" value={c.issued}/>
      <Stat label="الموزعون" value={c.resellers}/>
      <Stat label="الباقات النشطة" value={c.active_packages}/>
      <Stat label="إجمالي رصيد الموزعين" value={c.reseller_credits} sub="CREDIT"/>
      <Stat label="طلبات الكريدت" value={c.pending_requests}/>
    </div>

    <div className="demoBanner">
      <div>
        <span>TEST INVENTORY</span>
        <strong>مخزون تجريبي جاهز للاختبار</strong>
        <p>تم تجهيز 200 كود تجريبي لكل سيرفر على باقة 12 Months بتكلفة 1 Credit. الأكواد التجريبية تحمل كلمة DEMO بوضوح.</p>
      </div>
      <b>1,000 DEMO CODES</b>
    </div>

    <section className="section">
      <div className="sectionHead">
        <div><span>LIVE INVENTORY</span><h2>حالة السيرفرات والباقات</h2></div>
        <small>تحديث تلقائي كل 30 ثانية</small>
      </div>
      <div className="serverGrid">{data.servers.map(s=>{
        const low=Number(s.available_codes)<=Number(s.low_stock_threshold);
        const packs=data.packages.filter(p=>p.server_id===s.id);
        return <div className={'serverCard '+(low?'low':'')} key={s.id}>
          <div className="serverTop"><b>{s.name}</b><span>{Number(s.active)===1?'ACTIVE':'OFF'}</span></div>
          <strong>{num(s.available_codes)}</strong><small>كود متاح</small>
          <div className="meter"><i style={{width:Math.min(100,(Number(s.available_codes)/(Math.max(1,Number(s.total_codes))))*100)+'%'}}/></div>
          <div className="serverFoot"><span>الإجمالي {num(s.total_codes)}</span><span>المفعّل {num(s.issued_codes)}</span></div>
          <div className="packageMini">
            {packs.map(p=><div key={p.id}><span>{p.name}</span><b>{num(p.available_codes)} متاح</b><em>{num(p.credit_cost)} Credit</em></div>)}
          </div>
          {low && <em className="stockAlert">مخزون منخفض</em>}
        </div>
      })}</div>
    </section>

    <div className="twoCol dashboardBottom">
      <section className="section">
        <div className="sectionHead"><div><span>RESELLERS</span><h2>آخر حسابات الموزعين</h2></div></div>
        {data.resellers.length===0 ? <div className="emptyState mini">لا يوجد موزعون بعد. أنشئ أول موزع من قسم الموزعين.</div> :
        <div className="list">{data.resellers.slice(0,6).map(r=><div className="listRow" key={r.id}><b>{r.display_name}</b><span>{r.username}</span><small>{num(r.credits)} Credit</small></div>)}</div>}
      </section>
      <section className="section">
        <div className="sectionHead"><div><span>RECENT ACTIVITY</span><h2>آخر العمليات</h2></div></div>
        {data.logs.length===0 ? <div className="emptyState mini">لا توجد عمليات مسجلة بعد.</div> :
        <div className="list">{data.logs.slice(0,6).map((l,i)=><div className="listRow logMini" key={l.id||i}><b>{l.action}</b><span>{l.actor_name||l.actor_username||'SYSTEM'}</span><small>{fmt(l.created_at)}</small></div>)}</div>}
      </section>
    </div>
  </>;
}
function Servers({data,action,busy}) {
  const [server,setServer]=useState({name:'',lowStockThreshold:10});
  const [pack,setPack]=useState({serverId:'',name:'',durationLabel:'',creditCost:1});
  return <div className="twoCol">
    <section className="section">
      <div className="sectionHead"><div><span>SERVER POCKETS</span><h2>السيرفرات</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/admin/servers',server);setServer({name:'',lowStockThreshold:10});}}>
        <input placeholder="اسم السيرفر" value={server.name} onChange={e=>setServer({...server,name:e.target.value})} required/>
        <input type="number" min="0" placeholder="تنبيه المخزون" value={server.lowStockThreshold} onChange={e=>setServer({...server,lowStockThreshold:e.target.value})}/>
        <button className="primary" disabled={busy}>إضافة سيرفر</button>
      </form>
      <div className="list">{data.servers.map(s=><div className="listRow" key={s.id}><b>{s.name}</b><span>{num(s.available_codes)} متاح</span><small>{num(s.issued_codes)} مفعّل</small></div>)}</div>
    </section>
    <section className="section">
      <div className="sectionHead"><div><span>PACKAGES</span><h2>الباقات ونقاط الخصم</h2></div></div>
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/admin/packages',pack);setPack({...pack,name:'',durationLabel:''});}}>
        <select value={pack.serverId} onChange={e=>setPack({...pack,serverId:e.target.value})} required><option value="">اختر السيرفر</option>{data.servers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input placeholder="اسم الباقة - سنة" value={pack.name} onChange={e=>setPack({...pack,name:e.target.value})} required/>
        <input placeholder="المدة - 12 Month" value={pack.durationLabel} onChange={e=>setPack({...pack,durationLabel:e.target.value})}/>
        <input type="number" min="0" placeholder="تكلفة النقاط" value={pack.creditCost} onChange={e=>setPack({...pack,creditCost:e.target.value})} required/>
        <button className="primary" disabled={busy}>إضافة باكدج</button>
      </form>
      <div className="list">{data.packages.map(p=><div className="listRow" key={p.id}><b>{data.servers.find(s=>s.id===p.server_id)?.name} / {p.name}</b><span>{num(p.credit_cost)} نقطة</span><small>{num(p.available_codes)} متاح</small></div>)}</div>
    </section>
  </div>;
}

function ImportCodes({data,action,busy}) {
  const [form,setForm]=useState({serverId:'',packageId:'',filename:'codes.txt',text:''});
  const packages=data.packages.filter(p=>p.server_id===form.serverId);
  const lines=form.text.replace(/\r/g,'').split('\n');
  const nonBlank=lines.map(x=>x.trim()).filter(Boolean);
  const unique=new Set(nonBlank);
  async function pickFile(e){const f=e.target.files?.[0];if(!f)return;setForm({...form,filename:f.name,text:await f.text()});}
  return <section className="section">
    <div className="sectionHead"><div><span>TXT STOCK IMPORT</span><h2>رفع مخزون الأكواد</h2></div><small>الكود لن ينتقل أبداً بين السيرفرات</small></div>
    <div className="importGrid">
      <form className="formGrid" onSubmit={async e=>{e.preventDefault();await action('/api/admin/import-codes',form);setForm({...form,text:''});}}>
        <select value={form.serverId} onChange={e=>setForm({...form,serverId:e.target.value,packageId:''})} required><option value="">اختر السيرفر</option>{data.servers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select>
        <select value={form.packageId} onChange={e=>setForm({...form,packageId:e.target.value})} required><option value="">اختر الباكدج</option>{packages.map(p=><option value={p.id} key={p.id}>{p.name} — {p.credit_cost} نقطة</option>)}</select>
        <label className="filePick">اختيار ملف TXT<input type="file" accept=".txt,text/plain" onChange={pickFile}/></label>
        <textarea rows="14" placeholder="أو الصق الأكواد هنا — كود واحد في كل سطر" value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/>
        <button className="primary" disabled={busy||unique.size===0}>استيراد المخزون</button>
      </form>
      <div className="previewBox"><span>معاينة قبل الرفع</span><strong>{num(unique.size)}</strong><b>كود فريد</b><div><em>{num(lines.length)} سطر</em><em>{num(lines.length-nonBlank.length)} فارغ</em><em>{num(nonBlank.length-unique.size)} مكرر داخل الملف</em></div><p>المكرر الموجود مسبقاً في نفس السيرفر والباكدج يتم تجاهله تلقائياً وتسجيله في الدفعة.</p></div>
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
        <input placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required/>
        <input type="email" placeholder="Email - اختياري" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <input placeholder="اسم الموزع" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} required/>
        <input type="password" minLength="10" placeholder="Password - 10+ chars" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/>
        <input type="number" min="0" placeholder="رصيد البداية" value={form.credits} onChange={e=>setForm({...form,credits:e.target.value})}/>
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
  const [form,setForm]=useState({serverId:'',packageId:'',customerRef:'',quantity:1});
  const [mode,setMode]=useState('single');
  const [result,setResult]=useState(null);
  const packs=data.packages.filter(p=>p.server_id===form.serverId&&Number(p.active)===1);
  const selected=packs.find(p=>p.id===form.packageId);
  const q=mode==='single'?1:Math.max(1,Math.min(100,Number(form.quantity)||1));
  const total=selected?Number(selected.credit_cost)*q:0;
  async function submit(e){e.preventDefault();const out=await action('/api/issue',{...form,quantity:q});setResult(out);}
  async function copyAll(){await navigator.clipboard.writeText((result?.codes||[]).map(x=>x.code).join('\n'));}
  function download(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([(result?.codes||[]).map(x=>x.code).join('\n')],{type:'text/plain'}));a.download=(result?.order?.server||'codes')+'-'+Date.now()+'.txt';a.click();URL.revokeObjectURL(a.href);}
  return <div className="issueLayout">
    <section className="section issueCard">
      <div className="sectionHead"><div><span>ONE PLACE TO ISSUE</span><h2>إنشاء كود</h2></div></div>
      <div className="modeSwitch"><button className={mode==='single'?'active':''} onClick={()=>setMode('single')}>كود واحد</button><button className={mode==='bulk'?'active':''} onClick={()=>setMode('bulk')}>مجموعة أكواد</button></div>
      <form className="formGrid" onSubmit={submit}>
        <label>السيرفر</label>
        <select value={form.serverId} onChange={e=>setForm({...form,serverId:e.target.value,packageId:''})} required><option value="">اختر السيرفر</option>{data.servers.filter(s=>Number(s.active)===1).map(s=><option value={s.id} key={s.id}>{s.name} — {s.available_codes} متاح</option>)}</select>
        <label>الباكدج</label>
        <select value={form.packageId} onChange={e=>setForm({...form,packageId:e.target.value})} required><option value="">اختر الباكدج</option>{packs.map(p=><option value={p.id} key={p.id}>{p.name} — {p.credit_cost} نقطة — {p.available_codes} متاح</option>)}</select>
        <label>اسم العميل أو رقم الهاتف</label>
        <input value={form.customerRef} onChange={e=>setForm({...form,customerRef:e.target.value})} placeholder="مثال: 010... أو Ahmed"/>
        {mode==='bulk'&&<><label>عدد الأكواد</label><input type="number" min="1" max="100" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></>}
        <div className="costBox"><div><span>العدد</span><b>{q}</b></div><div><span>تكلفة الكود</span><b>{selected?.credit_cost||0}</b></div><div><span>الإجمالي</span><b>{total} نقطة</b></div><div><span>رصيدك</span><b>{data.dashboard?.user?.credits||0}</b></div></div>
        <button className="primary wide" disabled={busy||!selected}>{busy?'جاري الصرف…':'تفعيل واستخراج'}</button>
      </form>
    </section>
    <section className="section resultCard">
      <div className="sectionHead"><div><span>RESULT</span><h2>الكود الناتج</h2></div></div>
      {!result?<div className="emptyState">لم يتم إنشاء كود في هذه الجلسة بعد.</div>:<>
        <div className="resultMeta"><b>{result.order.server}</b><span>{result.order.package}</span><em>{result.order.creditsBefore} → {result.order.creditsAfter} نقطة</em></div>
        <div className="issuedList">{result.codes.map(x=><button key={x.id} className="issuedCode mono" onClick={()=>navigator.clipboard.writeText(x.code)}>{x.code}</button>)}</div>
        <div className="rowBtns"><button className="secondary" onClick={copyAll}>نسخ الكل</button><button className="secondary" onClick={download}>تنزيل TXT</button></div>
      </>}
    </section>
  </div>;
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
  return <section className="section">
    <div className="sectionHead"><div><span>AUDIT TRAIL</span><h2>{admin?'السجل المتكامل':'سجل حسابي'}</h2></div></div>
    <Table><thead><tr>{admin&&<th>المستخدم</th>}<th>الحدث</th><th>النوع</th><th>التفاصيل</th><th>الوقت</th></tr></thead>
    <tbody>{logs.map(l=><tr key={l.id||l.created_at+l.action}>{admin&&<td>{l.actor_name||l.actor_username||'SYSTEM'}</td>}<td><span className="event">{l.action}</span></td><td>{l.entity_type||'—'}</td><td className="logDetails">{l.details_json||'{}'}</td><td>{fmt(l.created_at)}</td></tr>)}</tbody></Table>
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
