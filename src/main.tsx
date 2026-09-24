import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{supabase}from"./supabase";
import"./style.css";

type Lang="ar"|"tr"|"en"|"fr"|"de";

type PartnerStore={
  id:string;
  name:string;
  logo:string;
};

type Coupon={
  id:string;
  title:string;
  store_id:string;
  store_name:string;
  store_logo:string;
  country:string;
  category:string;
  discount_label:string;
  coupon_code:string;
  affiliate_link:string;
  description:string;
  verified:boolean;
  featured?:boolean;
  expires?:string;
  original_price:string;
  deal_price:string;
  gallery:string[];
  highlights:string[];
};

const L:{[k in Lang]:any}={
  ar:{flag:"🇸🇦",name:"العربية",dir:"rtl",home:"الرئيسية",stores:"المتاجر",coupons:"الكوبونات",language:"اللغة",country:"الدولة",search:"ابحث عن متجر أو كوبون...",searchBtn:"بحث"},
  tr:{flag:"🇹🇷",name:"Türkçe",dir:"ltr",home:"Ana Sayfa",stores:"Mağazalar",coupons:"Kuponlar",language:"Dil",country:"Ülke",search:"Mağaza veya kupon ara...",searchBtn:"Ara"},
  en:{flag:"🇬🇧",name:"English",dir:"ltr",home:"Home",stores:"Stores",coupons:"Coupons",language:"Language",country:"Country",search:"Search store or coupon...",searchBtn:"Search"},
  fr:{flag:"🇫🇷",name:"Français",dir:"ltr",home:"Accueil",stores:"Boutiques",coupons:"Coupons",language:"Langue",country:"Pays",search:"Rechercher une boutique ou un coupon...",searchBtn:"Rechercher"},
  de:{flag:"🇩🇪",name:"Deutsch",dir:"ltr",home:"Startseite",stores:"Shops",coupons:"Gutscheine",language:"Sprache",country:"Land",search:"Shop oder Gutschein suchen...",searchBtn:"Suchen"}
};

const langs=(Object.keys(L) as Lang[]);
const countries=["الكل","مصر","السعودية","الإمارات","تركيا"];
const categories=["الكل","إلكترونيات","أزياء","عطور وجمال","منزل"];

const partnerStores:PartnerStore[]=[
  {id:"amazon",name:"Amazon",logo:"https://www.google.com/s2/favicons?domain=amazon.com&sz=128"},
  {id:"noon",name:"نون",logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=128"},
  {id:"shein",name:"SHEIN",logo:"https://www.google.com/s2/favicons?domain=shein.com&sz=128"},
  {id:"aliexpress",name:"AliExpress",logo:"https://www.google.com/s2/favicons?domain=aliexpress.com&sz=128"},
  {id:"namshi",name:"نمشي",logo:"https://www.google.com/s2/favicons?domain=namshi.com&sz=128"}
];

const coupons:Coupon[]=[
  {id:"amazon-tech-25",title:"خصم على مختارات الإلكترونيات والأجهزة الذكية",store_id:"amazon",store_name:"Amazon",store_logo:"https://www.google.com/s2/favicons?domain=amazon.com&sz=128",country:"السعودية",category:"إلكترونيات",discount_label:"خصم 25%",coupon_code:"TECH25",affiliate_link:"https://www.amazon.com/?tag=abu-khaled-demo-20",description:"خصم تجريبي على منتجات مختارة من قسم الإلكترونيات.",verified:true,featured:true,expires:"لفترة محدودة",original_price:"399 ر.س",deal_price:"299 ر.س",gallery:["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=92"],highlights:["منتجات إلكترونية مختارة من المتجر الرسمي","خصم يصل إلى 25% على المنتجات المؤهلة","إمكانية استخدام الكود أثناء إتمام الطلب"]},
  {id:"noon-save-20",title:"كوبون توفير على آلاف المنتجات المختارة",store_id:"noon",store_name:"نون",store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=128",country:"مصر",category:"إلكترونيات",discount_label:"خصم 20%",coupon_code:"SAVE20",affiliate_link:"https://www.noon.com/egypt-en/?utm_source=abu_khaled_demo",description:"استخدم الكود على المنتجات المؤهلة وفق شروط المتجر.",verified:true,featured:true,expires:"اليوم",original_price:"2,499 ج.م",deal_price:"1,999 ج.م",gallery:["https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=92"],highlights:["عرض على آلاف المنتجات المؤهلة","الشراء والدفع يتمان داخل نون","الكود متاح لفترة محدودة"]},
  {id:"shein-style-15",title:"خصم إضافي على الأزياء والموضة",store_id:"shein",store_name:"SHEIN",store_logo:"https://www.google.com/s2/favicons?domain=shein.com&sz=128",country:"الإمارات",category:"أزياء",discount_label:"خصم 15%",coupon_code:"STYLE15",affiliate_link:"https://www.shein.com/?url_from=abu_khaled_demo",description:"كوبون تجريبي للموضة والإكسسوارات المختارة.",verified:true,featured:true,expires:"هذا الأسبوع",original_price:"320 د.إ",deal_price:"272 د.إ",gallery:["https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=92"],highlights:["خصم إضافي على تشكيلات الموضة المؤهلة","يطبق الكود عند صفحة الدفع","إتمام الطلب مباشرة على متجر SHEIN"]},
  {id:"ali-big-30",title:"تخفيضات موسمية على منتجات مختارة",store_id:"aliexpress",store_name:"AliExpress",store_logo:"https://www.google.com/s2/favicons?domain=aliexpress.com&sz=128",country:"مصر",category:"إلكترونيات",discount_label:"حتى 30%",coupon_code:"ALI30",affiliate_link:"https://www.aliexpress.com/?aff_fcid=abu_khaled_demo",description:"صفقات موسمية وتجريبية على فئات متعددة.",verified:true,featured:true,expires:"لفترة محدودة",original_price:"1,000 ج.م",deal_price:"700 ج.م",gallery:["https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=92"],highlights:["تخفيضات موسمية على فئات متعددة","العرض يختلف حسب المنتج المؤهل","الشراء يتم من AliExpress مباشرة"]},
  {id:"namshi-fashion-20",title:"خصم على السنيكرز والملابس المختارة",store_id:"namshi",store_name:"نمشي",store_logo:"https://www.google.com/s2/favicons?domain=namshi.com&sz=128",country:"السعودية",category:"أزياء",discount_label:"خصم 20%",coupon_code:"NM20",affiliate_link:"https://www.namshi.com/saudi-en/?utm_source=abu_khaled_demo",description:"كوبون تجريبي على مختارات الموضة والأحذية.",verified:true,featured:true,expires:"قريباً",original_price:"450 ر.س",deal_price:"360 ر.س",gallery:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=92"],highlights:["عروض على السنيكرز والملابس المختارة","خصم يصل إلى 20% حسب المنتج","الدفع والشحن من خلال نمشي"]},
  {id:"amazon-beauty-18",title:"عروض على العطور ومنتجات العناية",store_id:"amazon",store_name:"Amazon",store_logo:"https://www.google.com/s2/favicons?domain=amazon.com&sz=128",country:"الإمارات",category:"عطور وجمال",discount_label:"خصم 18%",coupon_code:"BEAUTY18",affiliate_link:"https://www.amazon.ae/?tag=abu-khaled-demo-21",description:"خصم تجريبي على منتجات الجمال والعطور المؤهلة.",verified:true,featured:true,expires:"هذا الأسبوع",original_price:"280 د.إ",deal_price:"230 د.إ",gallery:["https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=92"],highlights:["عروض على العطور ومنتجات العناية","خصم على المنتجات المؤهلة فقط","إتمام الشراء من Amazon الإمارات"]},
  {id:"noon-home-12",title:"خصم على المنزل والمطبخ",store_id:"noon",store_name:"نون",store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=128",country:"السعودية",category:"منزل",discount_label:"خصم 12%",coupon_code:"HOME12",affiliate_link:"https://www.noon.com/saudi-en/?utm_source=abu_khaled_demo",description:"عروض مختارة على مستلزمات المنزل والأجهزة الصغيرة.",verified:true,expires:"لفترة محدودة",original_price:"699 ر.س",deal_price:"615 ر.س",gallery:["https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=92"],highlights:["خصم على المنزل والمطبخ","يشمل منتجات مختارة وفق شروط المتجر","الطلب والشحن من خلال نون"]},
  {id:"shein-new-10",title:"خصم للطلبات الجديدة على الموضة",store_id:"shein",store_name:"SHEIN",store_logo:"https://www.google.com/s2/favicons?domain=shein.com&sz=128",country:"السعودية",category:"أزياء",discount_label:"خصم 10%",coupon_code:"NEW10",affiliate_link:"https://www.shein.com/?url_from=abu_khaled_demo",description:"كوبون تجريبي للطلبات المؤهلة للمستخدمين الجدد.",verified:true,expires:"قريباً",original_price:"300 ر.س",deal_price:"270 ر.س",gallery:["https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=92"],highlights:["خصم مخصص للطلبات المؤهلة","مناسب للمستخدمين الجدد حسب الشروط","الشراء يتم من SHEIN مباشرة"]},
  {id:"ali-home-22",title:"خصم على الإكسسوارات المنزلية",store_id:"aliexpress",store_name:"AliExpress",store_logo:"https://www.google.com/s2/favicons?domain=aliexpress.com&sz=128",country:"تركيا",category:"منزل",discount_label:"خصم 22%",coupon_code:"HOME22",affiliate_link:"https://www.aliexpress.com/?aff_fcid=abu_khaled_demo",description:"عروض تجريبية على إكسسوارات الديكور والمنزل.",verified:true,expires:"هذا الشهر",original_price:"1,250 ₺",deal_price:"975 ₺",gallery:["https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=92"],highlights:["خصم على إكسسوارات الديكور والمنزل","قد تختلف قيمة الخصم حسب المنتج","الدفع يتم على AliExpress"]},
  {id:"namshi-extra-15",title:"خصم إضافي على تشكيلات مختارة",store_id:"namshi",store_name:"نمشي",store_logo:"https://www.google.com/s2/favicons?domain=namshi.com&sz=128",country:"الإمارات",category:"أزياء",discount_label:"خصم 15%",coupon_code:"EXTRA15",affiliate_link:"https://www.namshi.com/uae-en/?utm_source=abu_khaled_demo",description:"كود تجريبي لعروض إضافية على منتجات مختارة.",verified:true,expires:"هذا الأسبوع",original_price:"400 د.إ",deal_price:"340 د.إ",gallery:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=92","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=92"],highlights:["خصم إضافي على تشكيلات مختارة","الكود يطبق على المنتجات المؤهلة","إتمام الطلب من متجر نمشي الرسمي"]}
];

const heroSlides=[
  ["أقوى الكوبونات في مكان واحد","اكتشف الأكواد والعروض من أشهر المتاجر وانتقل مباشرة إلى المتجر لإتمام الشراء.","https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1800&q=92","استكشف الكوبونات"],
  ["قارن العروض قبل أن تشتري","ابحث حسب المتجر أو الدولة أو القسم واعثر على أعلى نسبة خصم بسرعة.","https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1800&q=92","قارن الآن"],
  ["صفقات موثوقة وروابط مباشرة","نرتب لك أفضل العروض ونرسل لك إلى صفحات المتاجر الرسمية بروابط آمنة.","https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1800&q=92","شاهد المتاجر"]
];

function OAuthCallbackBridge(){
  useEffect(()=>{
    let finished=false;
    let alive=true;

    const goHome=(session:any)=>{
      if(finished||!alive||!session?.user)return;
      finished=true;
      window.location.replace(window.location.origin+"/");
    };

    supabase.auth.getSession().then(({data})=>{
      if(data.session)goHome(data.session);
    });

    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(session?.user)goHome(session);
    });

    const timeout=window.setTimeout(()=>{
      if(!finished&&alive)window.location.replace(window.location.origin+"/");
    },6000);

    return()=>{
      alive=false;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  },[]);

  return <div className="oauthCallbackBlank" aria-hidden="true"/>;
}

function isOAuthCallbackDocument(){
  const url=new URL(window.location.href);
  return url.searchParams.has("code")||
    url.searchParams.has("error")||
    window.location.hash.includes("access_token");
}

function App(){
  const[user,setUser]=useState<any>(null);
  const[authOpen,setAuthOpen]=useState(false);
  const[authMode,setAuthMode]=useState<"login"|"signup">("login");
  const[authEmail,setAuthEmail]=useState("");
  const[authPassword,setAuthPassword]=useState("");
  const[authName,setAuthName]=useState("");
  const[authMsg,setAuthMsg]=useState("");
  const[authBusy,setAuthBusy]=useState(false);
  const[menu,setMenu]=useState(false);
  const[langOpen,setLangOpen]=useState(false);
  const[lang,setLang]=useState<Lang>("ar");
  const[country,setCountry]=useState("الكل");
  const[storeFilter,setStoreFilter]=useState("الكل");
  const[searchTerm,setSearchTerm]=useState("");
  const[dealChip,setDealChip]=useState<"best"|"discount"|"tech"|"fashion"|"home">("best");
  const[banner,setBanner]=useState(0);
  const[touchX,setTouchX]=useState<number|null>(null);
  const[copied,setCopied]=useState("");
  const[quickView,setQuickView]=useState<Coupon|null>(null);
  const[galleryIndex,setGalleryIndex]=useState(0);
  const t=L[lang];

  useEffect(()=>{
    let alive=true;

    const applySession=(session:any)=>{
      if(!alive)return;
      if(session?.user){
        setUser(session.user);
        setAuthOpen(false);
        setAuthBusy(false);
        setAuthMsg("");
      }else{
        setUser(null);
      }
    };

    supabase.auth.getSession().then(({data,error})=>{
      if(!alive)return;
      if(error){
        setAuthMsg(error.message);
        setAuthBusy(false);
        return;
      }
      applySession(data.session);
    });

    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      applySession(session);
    });

    return()=>{
      alive=false;
      subscription.unsubscribe();
    };
  },[]);
  useEffect(()=>{const id=window.setInterval(()=>setBanner(v=>(v+1)%heroSlides.length),5000);return()=>window.clearInterval(id)},[]);

  const submitAuth=async()=>{setAuthBusy(true);setAuthMsg("");if(!authEmail||authPassword.length<6){setAuthMsg("أدخل بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل.");setAuthBusy(false);return}const result=authMode==="signup"?await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{full_name:authName}}}):await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});if(result.error)setAuthMsg(result.error.message);else{setAuthMsg(authMode==="signup"&&!result.data.session?"تم إنشاء الحساب. راجع بريدك لتأكيد الحساب.":"تم تسجيل الدخول بنجاح.");if(result.data.session)setTimeout(()=>setAuthOpen(false),500)}setAuthBusy(false)};
  const resetPassword=async()=>{if(!authEmail){setAuthMsg("اكتب بريدك الإلكتروني أولًا.");return}const{error}=await supabase.auth.resetPasswordForEmail(authEmail,{redirectTo:window.location.origin});setAuthMsg(error?error.message:"تم إرسال رابط استعادة كلمة المرور إلى بريدك.")};
  const logout=async()=>{await supabase.auth.signOut();setMenu(false)};
  const googleLogin=async()=>{
    setAuthBusy(true);
    setAuthMsg("");

    const redirectTo=`${window.location.origin}/`;
    const{error}=await supabase.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo,queryParams:{prompt:"select_account"}}
    });

    if(error){
      setAuthMsg(error.message);
      setAuthBusy(false);
    }
  };
  const chooseLang=(x:Lang)=>{setLang(x);setLangOpen(false)};

  const visibleCoupons=useMemo(()=>{
    const q=searchTerm.trim().toLowerCase();
    let list=coupons.filter(c=>
      (country==="الكل"||c.country===country)&&
      (storeFilter==="الكل"||c.store_id===storeFilter)&&
      (!q||c.title.toLowerCase().includes(q)||c.store_name.toLowerCase().includes(q)||c.coupon_code.toLowerCase().includes(q))
    );

    if(dealChip==="tech")list=list.filter(c=>c.category==="إلكترونيات");
    if(dealChip==="fashion")list=list.filter(c=>c.category==="أزياء");
    if(dealChip==="home")list=list.filter(c=>c.category==="منزل");

    if(dealChip==="discount"){
      list=[...list].sort((a,b)=>Number(b.discount_label.replace(/\D/g,""))-Number(a.discount_label.replace(/\D/g,"")));
    }else{
      list=[...list].sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured)));
    }

    return list;
  },[country,storeFilter,searchTerm,dealChip]);

  const copyCode=(code:string)=>{
    const fallback=()=>{const ta=document.createElement("textarea");ta.value=code;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()};
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).catch(fallback);else fallback();
  };

  const copyCouponOnly=(coupon:Coupon)=>{
    copyCode(coupon.coupon_code);
    setCopied(coupon.id);
    window.setTimeout(()=>setCopied(v=>v===coupon.id?"":v),1800);
  };
  const openQuickView=(coupon:Coupon)=>{setQuickView(coupon);setGalleryIndex(0)};

  const selectStore=(storeId:string)=>{
    setStoreFilter(storeId);
    document.getElementById("coupons")?.scrollIntoView({behavior:"smooth"});
  };

  const finishSwipe=(endX:number)=>{if(touchX===null)return;const dx=endX-touchX;if(Math.abs(dx)>42)setBanner(v=>(v+(dx<0?1:heroSlides.length-1))%heroSlides.length);setTouchX(null)};

  return <div dir={t.dir}>
    <div className="topbar"><b>DEMO</b><span>منصة كوبونات وعروض ذكية من المتاجر الرسمية</span><small>TTV4K · Abo Adam</small></div>

    <header>
      <a className="brand">أبو خالد</a>
      <nav><a>{t.home}</a><a href="#stores">{t.stores}</a><a href="#coupons">{t.coupons}</a></nav>
      <div className="actions">
        <div className="langWrap"><button className="lang" onClick={()=>setLangOpen(!langOpen)}>{t.flag}<span>{t.name}</span>⌄</button>{langOpen&&<div className="langMenu">{langs.map(x=><button key={x} onClick={()=>chooseLang(x)}>{L[x].flag} {L[x].name}</button>)}</div>}</div>
        {user?<button className="authHeader iconButton" aria-label="الحساب" onClick={()=>setMenu(true)}>{(user.user_metadata?.avatar_url||user.user_metadata?.picture)?<img className="headerAvatar" src={user.user_metadata.avatar_url||user.user_metadata.picture} alt="" referrerPolicy="no-referrer"/>:<svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>}<span>حسابي</span></button>:<button className="authHeader iconButton" aria-label="تسجيل الدخول" onClick={()=>setAuthOpen(true)}><svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg><span>دخول</span></button>}
        <button className="hamb iconButton" aria-label="القائمة" onClick={()=>setMenu(true)}><svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </header>

    {menu&&<><div className="drawerBackdrop" onClick={()=>setMenu(false)}/><aside className="sideDrawer"><div className="drawerHead"><div><b>أبو خالد</b><small><span>DEMO</span> · COUPONS HUB</small></div><button className="drawerClose" aria-label="إغلاق القائمة" onClick={()=>setMenu(false)}>×</button></div>{user&&<div className="accountCard"><b>{user.user_metadata?.full_name||"حسابي"}</b><small>{user.email}</small><button onClick={logout}>تسجيل الخروج</button></div>}<div className="drawerNav"><a onClick={()=>setMenu(false)}><span className="drawerNavIcon">⌂</span><span>{t.home}</span><i>›</i></a><a href="#stores" onClick={()=>setMenu(false)}><span className="drawerNavIcon">◎</span><span>{t.stores}</span><i>›</i></a><a href="#coupons" onClick={()=>setMenu(false)}><span className="drawerNavIcon">%</span><span>{t.coupons}</span><i>›</i></a></div><div className="drawerSettings"><div className="drawerSettingHead"><label>{t.country}</label><small>{country}</small></div><div className="countryChoices">{countries.map(x=><button key={x} className={country===x?"active":""} onClick={()=>setCountry(x)}>{x}</button>)}</div><div className="drawerSettingHead"><label>{t.language}</label><small>{t.flag} {t.name}</small></div><div className="languageSelectWrap"><span>{t.flag}</span><select value={lang} aria-label={t.language} onChange={e=>chooseLang(e.target.value as Lang)}>{langs.map(x=><option key={x} value={x}>{L[x].flag} {L[x].name}</option>)}</select><i>⌄</i></div></div></aside></>}

    <main>
      <section className="promoBanner couponHero" onTouchStart={e=>setTouchX(e.touches[0].clientX)} onTouchEnd={e=>finishSwipe(e.changedTouches[0].clientX)}>
        <img key={heroSlides[banner][2]} src={heroSlides[banner][2]} alt={heroSlides[banner][0]}/>
        <div className="promoShade"/>
        <div className="promoText"><small>ABU KHALED · COUPONS & DEALS</small><h2>{heroSlides[banner][0]}</h2><p>{heroSlides[banner][1]}</p><button onClick={()=>document.getElementById("coupons")?.scrollIntoView({behavior:"smooth"})}>{heroSlides[banner][3]}</button></div>
        <button className="promoPrev" aria-label="السابق" onClick={()=>setBanner((banner+heroSlides.length-1)%heroSlides.length)}>‹</button>
        <button className="promoNext" aria-label="التالي" onClick={()=>setBanner((banner+1)%heroSlides.length)}>›</button>
        <div className="promoDots">{heroSlides.map((_,i)=><button key={i} className={banner===i?"active":""} onClick={()=>setBanner(i)}><span/></button>)}</div>
      </section>

      <section className="couponIntro">
        <span className="pill">منصة عروض وكوبونات ذكية</span>
        <h1>أفضل الكوبونات.<br/><em>من المتاجر التي تثق بها.</em></h1>
        <p>نبحث ونجمع ونرتب العروض لتصل إلى الكود المناسب بسرعة، ثم نحولك مباشرة إلى المتجر الرسمي لإتمام الشراء.</p>
        <form className="couponSearch" onSubmit={e=>{e.preventDefault();document.getElementById("coupons")?.scrollIntoView({behavior:"smooth"})}}><span>⌕</span><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={t.search}/><button>{t.searchBtn}</button></form>
        <div className="couponStats"><span><b>{coupons.length}+</b> كوبونات وعروض</span><span><b>{partnerStores.length}</b> متاجر شريكة</span><span><b>{countries.length-1}</b> دول</span></div>
      </section>

      <section id="stores" className="couponSection storesSection modernStores">
        <div className="couponSectionHead"><div><span>PARTNER STORES</span><h2>متاجر تستحق المتابعة</h2></div><small>اختَر متجراً وشاهد عروضه الفعالة فوراً</small></div>
        <div className="storeGrid modernStoreSlider">
          <button className={storeFilter==="الكل"?"active storeAllCard":"storeAllCard"} onClick={()=>setStoreFilter("الكل")}><span className="storeLogoWrap storeAllLogo">✦</span><b>كل المتاجر</b><small>{coupons.length} عروض فعالة</small></button>
          {partnerStores.map(store=><button key={store.id} className={storeFilter===store.id?"active":""} onClick={()=>selectStore(store.id)}><span className="storeLogoWrap"><img src={store.logo} alt={store.name}/></span><b>{store.name}</b><small>{coupons.filter(c=>c.store_id===store.id).length} عروض فعالة</small></button>)}
        </div>
      </section>

      <section className="dealChipsWrap" aria-label="تصنيفات سريعة">
        <div className="dealChips">
          <button className={dealChip==="best"?"active":""} onClick={()=>setDealChip("best")}>🔥 الأفضل</button>
          <button className={dealChip==="discount"?"active":""} onClick={()=>setDealChip("discount")}>⚡ أقوى خصم</button>
          <button className={dealChip==="tech"?"active":""} onClick={()=>setDealChip("tech")}>📱 تقنية</button>
          <button className={dealChip==="fashion"?"active":""} onClick={()=>setDealChip("fashion")}>👗 أزياء</button>
          <button className={dealChip==="home"?"active":""} onClick={()=>setDealChip("home")}>🏠 المنزل</button>
        </div>
        {(storeFilter!=="الكل"||country!=="الكل"||searchTerm)&&<button className="clearDealFilters" onClick={()=>{setStoreFilter("الكل");setCountry("الكل");setSearchTerm("");setDealChip("best")}}>مسح التحديد</button>}
      </section>

      <section id="coupons" className="couponSection modernDealsSection">
        <div className="couponSectionHead"><div><span>CURATED DEALS</span><h2>صفقات وكوبونات مختارة</h2></div><small>{visibleCoupons.length} عرض متاح</small></div>
        {visibleCoupons.length?<div className="couponGrid modernVoucherGrid">{visibleCoupons.map(coupon=><article className="couponCard modernVoucherCard" key={coupon.id} onClick={()=>openQuickView(coupon)}>
          <div className="voucherGlow"/>
          <div className="couponCardTop">
            <div className="couponStore"><span><img src={coupon.store_logo} alt={coupon.store_name}/></span><div><b>{coupon.store_name}</b><small className="liveToday">نشط اليوم ✓</small></div></div>
            <span className="voucherCountry">{coupon.country}</span>
          </div>
          <div className="couponDiscount modernDiscount">{coupon.discount_label}</div>
          <h3>{coupon.title}</h3>
          <p>{coupon.description}</p>
          <div className="voucherMetaLine"><span>{coupon.category}</span><span>{coupon.expires||"لفترة محدودة"}</span></div>
          <div className="voucherCodeBox" onClick={e=>e.stopPropagation()}>
            <div><small>كود الخصم</small><strong>{coupon.coupon_code}</strong></div>
            <button className={copied===coupon.id?"copied":""} onClick={()=>copyCouponOnly(coupon)}>{copied===coupon.id?"تم النسخ ✓":"نسخ الكود"}</button>
          </div>
          <button className="voucherPreviewBtn" onClick={e=>{e.stopPropagation();openQuickView(coupon)}}>عرض التفاصيل <span>↗</span></button>
        </article>)}</div>:<div className="emptyDeals">لا توجد عروض مطابقة لهذا الاختيار الآن.</div>}
      </section>

      <section className="couponTrust">
        <div><i>✓</i><span><b>كوبونات موثقة</b><small>نرتب العروض ونوضح مصدرها ومتجرها</small></span></div>
        <div><i>↗</i><span><b>تحويل مباشر للمتجر</b><small>لا نقوم بتحصيل المدفوعات داخل المنصة</small></span></div>
        <div><i>◎</i><span><b>مقارنة أسهل</b><small>فلترة حسب المتجر والدولة والقسم</small></span></div>
      </section>
    </main>

    {quickView&&<div className="quickViewBack" onClick={()=>setQuickView(null)}><section className="quickViewModal" role="dialog" aria-modal="true" aria-label={quickView.title} onClick={e=>e.stopPropagation()}><button className="quickViewClose" aria-label="إغلاق المعاينة" onClick={()=>setQuickView(null)}>×</button><div className="quickGallery"><div className="quickMainImage"><img src={quickView.gallery[galleryIndex]} alt={quickView.title}/><span className="quickSaveBadge">وفر {quickView.discount_label.replace("خصم ","")}</span></div><div className="quickThumbs">{quickView.gallery.map((img,i)=><button key={img} className={galleryIndex===i?"active":""} onClick={()=>setGalleryIndex(i)}><img src={img} alt=""/></button>)}</div></div><div className="quickContent"><div className="quickStore"><span><img src={quickView.store_logo} alt={quickView.store_name}/></span><div><b>{quickView.store_name}</b><small>متجر موثوق ✓</small></div></div><h2>{quickView.title}</h2><div className="quickPrice"><strong>{quickView.deal_price}</strong><del>{quickView.original_price}</del><span>{quickView.discount_label}</span></div><div className="quickHighlights"><b>مميزات الصفقة</b><ul>{quickView.highlights.map(x=><li key={x}>{x}</li>)}</ul></div>{quickView.coupon_code&&<div className="smartCouponBox"><div><span>كود الخصم</span><strong>{quickView.coupon_code}</strong></div><button className={copied===quickView.id?"copied":""} onClick={()=>copyCouponOnly(quickView)}>{copied===quickView.id?"تم النسخ ✓":"نسخ الكود"}</button><small>سيتم تطبيق الخصم تلقائياً عند لصقه في صفحة الدفع بالمتجر.</small></div>}<a className="quickPrimaryCta" href={quickView.affiliate_link} target="_blank" rel="noopener noreferrer">متابعة الشراء من {quickView.store_name} <span>↗</span></a><small className="quickDisclosure">سيتم فتح المتجر الرسمي في نافذة جديدة. قد يحتوي الرابط على إحالة تسويقية دون تكلفة إضافية عليك.</small></div></section></div>}

    {copied&&<div className="copyToast" role="status">✓ تم نسخ الكود!</div>}

    {authOpen&&<div className="modalBack authBack" onClick={()=>setAuthOpen(false)}><section className="authExperience" onClick={e=>e.stopPropagation()}><button className="authClose" onClick={()=>setAuthOpen(false)}>×</button><aside className="authStory"><div className="authBrand"><i>%</i><b>ABU <em>KHALED</em></b><small>منصة كوبونات وعروض</small></div><div className="authStoryCopy"><h2>اكتشف العروض<br/><em>بشكل أذكى</em></h2><div className="benefit"><i>%</i><div><b>كوبونات حصرية</b><small>أكواد خصم مرتبة حسب المتجر</small></div></div><div className="benefit"><i>◎</i><div><b>متاجر متعددة</b><small>قارن بين العروض في مكان واحد</small></div></div><div className="benefit"><i>↗</i><div><b>انتقال مباشر</b><small>إتمام الشراء داخل المتجر الرسمي</small></div></div></div><small className="authStoryFoot">منصة واحدة للمقارنة والتوفير</small></aside><div className="authPanel"><small>ABU KHALED · SECURE ACCOUNT</small><h2>{authMode==="login"?"مرحبًا بعودتك":"أنشئ حسابك"}</h2><p>{authMode==="login"?"سجل الدخول إلى حسابك":"ابدأ تجربة عروض مخصصة وآمنة"}</p><div className="authTabs"><button className={authMode==="login"?"active":""} onClick={()=>{setAuthMode("login");setAuthMsg("")}}>تسجيل الدخول</button><button className={authMode==="signup"?"active":""} onClick={()=>{setAuthMode("signup");setAuthMsg("")}}>حساب جديد</button></div>{authMode==="signup"&&<label className="authField"><span>👤</span><input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="الاسم الكامل"/></label>}<label className="authField"><span>✉</span><input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="البريد الإلكتروني"/></label><label className="authField"><span>▣</span><input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="كلمة المرور"/></label>{authMode==="login"&&<div className="authHelpers"><span>تسجيل دخول آمن</span><button onClick={resetPassword}>نسيت كلمة المرور؟</button></div>}{authMsg&&<div className="authMsg">{authMsg}</div>}<button className="authSubmit" disabled={authBusy} onClick={submitAuth}>{authBusy?"جاري التنفيذ...":authMode==="login"?"تسجيل الدخول  ←":"إنشاء الحساب  ←"}</button><div className="authDivider"><span>أو</span></div><div className="socialDemo"><button className="googleLogin" disabled={authBusy} onClick={googleLogin}>G&nbsp;&nbsp; المتابعة باستخدام Google</button><button disabled>●&nbsp;&nbsp; Apple</button></div><div className="authSwitch"><span>{authMode==="login"?"ليس لديك حساب؟":"لديك حساب بالفعل؟"}</span><button onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMsg("")}}>{authMode==="login"?"إنشاء حساب جديد":"تسجيل الدخول"}</button></div><div className="authSecure">🔒 الحساب مؤمّن عبر Supabase Auth.</div></div></section></div>}

    <footer className="siteFooter couponFooter"><div className="footerTop"><div className="footerIdentity"><b>أبو خالد</b><p>منصة ذكية لتجميع الكوبونات والعروض ومقارنة الصفقات من المتاجر الشريكة.</p><small>DEMO · TTV4K — Abo Adam</small></div><div className="footerLinks"><b>روابط سريعة</b><a href="#stores">المتاجر</a><a href="#coupons">الكوبونات</a><a href="#privacy">سياسة الخصوصية</a><a href="#terms">الشروط والأحكام</a></div><div className="footerPayments"><b>الشفافية</b><p className="transparencyText">نوفر لك أفضل العروض الموثوقة بروابط تسوق آمنة ومباشرة من المتاجر الرسمية.</p><small>قد تحتوي بعض الروابط على إحالات تسويقية وقد نحصل على عمولة عند إتمام شراء مؤهل، دون تكلفة إضافية عليك.</small></div></div><div className="footerBottom"><span>© 2026 متجر أبو خالد. جميع الحقوق محفوظة.</span><span>كوبونات • عروض • روابط مباشرة</span></div></footer>
  </div>
}

createRoot(document.getElementById("root")!).render(isOAuthCallbackDocument()?<OAuthCallbackBridge/>:<App/>);