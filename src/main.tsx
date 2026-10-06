import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{supabase}from"./supabase";
import AutomationDashboard from"./AutomationDashboard";
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

const partnerStores:PartnerStore[]=[];

const coupons:Coupon[]=[
  {
    id:"noon-iphone16pm-256-desert",
    title:"Apple iPhone 16 Pro Max 256GB Desert Titanium - Middle East Version",
    store_id:"noon",
    store_name:"نون",
    store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=128",
    country:"السعودية",
    category:"إلكترونيات",
    discount_label:"خصم 17%",
    coupon_code:"",
    affiliate_link:"https://www.noon.com/saudi-en/iphone-16-pro-max-256gb-desert-titanium-5g-with-facetime-middle-east-version/N70105592V/p/",
    description:"منتج حقيقي معروض على نون السعودية. السعر والخصم قابلان للتغير حسب المتجر والمخزون.",
    verified:true,
    featured:true,
    expires:"السعر متغير",
    original_price:"5,699 ر.س",
    deal_price:"4,709 ر.س",
    gallery:[
      "https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-hero-geo-240909_inline.jpg.large.jpg"
    ],
    highlights:["سعة 256GB","شاشة Super Retina XDR مقاس 6.9 بوصة","شريحة A18 Pro وإصدار الشرق الأوسط"]
  },
  {
    id:"samsung-s25-ultra-256-black",
    title:"Samsung Galaxy S25 Ultra 256GB 12GB Titanium Black",
    store_id:"samsung",
    store_name:"Samsung",
    store_logo:"https://www.google.com/s2/favicons?domain=samsung.com&sz=128",
    country:"السعودية",
    category:"إلكترونيات",
    discount_label:"خصم 31%",
    coupon_code:"",
    affiliate_link:"https://www.samsung.com/sa_en/smartphones/galaxy-s25-ultra/buy/?modelCode=SM-S938BZKIMEA",
    description:"منتج حقيقي من متجر Samsung السعودية الرسمي، بسعة 256GB وذاكرة 12GB.",
    verified:true,
    featured:true,
    expires:"حسب توفر المتجر",
    original_price:"5,099 ر.س",
    deal_price:"3,499 ر.س",
    gallery:[
      "https://images.samsung.com/sa_en/smartphones/galaxy-s25-ultra/buy/kv_global_PC_v2.jpg?imbypass=true"
    ],
    highlights:["سعة 256GB وRAM 12GB","كاميرا رئيسية 200MP","شاشة 6.9 بوصة مع S Pen"]
  },
  {
    id:"noon-redmi-note15-5g-256",
    title:"Xiaomi Redmi Note 15 5G 8GB RAM 256GB Glacier Blue",
    store_id:"noon",
    store_name:"نون",
    store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=128",
    country:"السعودية",
    category:"إلكترونيات",
    discount_label:"خصم 7%",
    coupon_code:"",
    affiliate_link:"https://www.noon.com/saudi-en/product/N70262990V/p/",
    description:"منتج حقيقي على نون السعودية. بيانات المواصفات من Xiaomi والسعر يتغير حسب نون.",
    verified:true,
    featured:true,
    expires:"السعر متغير",
    original_price:"1,099 ر.س",
    deal_price:"1,017 ر.س",
    gallery:[
      "https://i02.appmifile.com/870_operator_sg/13/01/2026/ffb4d5d717ef678ea5a7bebc2ec0a69e.png"
    ],
    highlights:["8GB RAM و256GB","Snapdragon 6 Gen 3","شاشة AMOLED 6.77 بوصة 120Hz"]
  },
  {
    id:"noon-galaxy-a36-128-black",
    title:"Samsung Galaxy A36 5G 6GB RAM 128GB Awesome Black",
    store_id:"noon",
    store_name:"نون",
    store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=128",
    country:"السعودية",
    category:"إلكترونيات",
    discount_label:"خصم 24%",
    coupon_code:"",
    affiliate_link:"https://supermall.noon.com/saudi-en/~samsung/galaxy-a36-5g-dual-sim-awesome-black-6gb-ram-128gb-middle-east-version/N70357593V/p/?store=STD2DU",
    description:"منتج حقيقي من نون السعودية، إصدار الشرق الأوسط مع ضمان مُصنّع حسب صفحة المتجر.",
    verified:true,
    expires:"السعر متغير",
    original_price:"1,299 ر.س",
    deal_price:"979 ر.س",
    gallery:[
      "https://f.nooncdn.com/p/pzsku/Z3EC309197ADF6CC17CC0Z/45/_/1778052211/26683d40-6b1f-4e30-b39d-c960baa2569e.jpg",
      "https://f.nooncdn.com/p/pzsku/Z3EC309197ADF6CC17CC0Z/45/_/1778052211/a531419f-dd43-4441-9949-41939aa40308.jpg"
    ],
    highlights:["شاشة AMOLED 6.7 بوصة","بطارية 5000mAh","دعم 5G وتحديثات أمان ممتدة"]
  }
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

function isAutomationDocument(){
  return window.location.hash==="#automation";
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
  const[catalogCoupons,setCatalogCoupons]=useState<Coupon[]>(coupons);
  const[galleryIndex,setGalleryIndex]=useState(0);
  const t=L[lang];
  const catalogStores=useMemo(()=>{
    const map=new Map<string,PartnerStore>();
    for(const item of catalogCoupons){
      if(!item.store_id||!item.store_name)continue;
      if(!map.has(item.store_id))map.set(item.store_id,{id:item.store_id,name:item.store_name,logo:item.store_logo});
    }
    return [...map.values()];
  },[catalogCoupons]);

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
  useEffect(()=>{
    let alive=true;
    supabase
      .from("affiliate_offers")
      .select("id,title,store_id,store_name,store_logo,country,category,discount_label,coupon_code,affiliate_link,description,verified,featured,expires,original_price,deal_price,gallery,highlights")
      .eq("active",true)
      .order("featured",{ascending:false})
      .order("updated_at",{ascending:false})
      .then(({data,error})=>{
        if(!alive||error||!data?.length)return;
        const live=data.map((row:any):Coupon=>({
          id:String(row.id),
          title:String(row.title||""),
          store_id:String(row.store_id||""),
          store_name:String(row.store_name||""),
          store_logo:String(row.store_logo||""),
          country:String(row.country||""),
          category:String(row.category||""),
          discount_label:String(row.discount_label||""),
          coupon_code:String(row.coupon_code||""),
          affiliate_link:String(row.affiliate_link||""),
          description:String(row.description||""),
          verified:Boolean(row.verified),
          featured:Boolean(row.featured),
          expires:row.expires?String(row.expires):undefined,
          original_price:String(row.original_price||""),
          deal_price:String(row.deal_price||""),
          gallery:Array.isArray(row.gallery)?row.gallery.filter((x:any)=>typeof x==="string"):[],
          highlights:Array.isArray(row.highlights)?row.highlights.filter((x:any)=>typeof x==="string"):[],
        })).filter((x:Coupon)=>x.title&&x.affiliate_link);
        if(live.length)setCatalogCoupons(live);
      });
    return()=>{alive=false};
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
    let list=catalogCoupons.filter(c=>
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
  },[catalogCoupons,country,storeFilter,searchTerm,dealChip]);

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
  const recordAffiliateClick=(coupon:Coupon)=>{
    let destinationDomain="unknown";
    try{destinationDomain=new URL(coupon.affiliate_link).hostname}catch{}
    void supabase.functions.invoke("affiliate-click",{
      body:{
        coupon_id:coupon.id,
        store_id:coupon.store_id,
        destination_domain:destinationDomain,
        source:"web"
      }
    });
  };

  const selectStore=(storeId:string)=>{
    setStoreFilter(storeId);
    document.getElementById("coupons")?.scrollIntoView({behavior:"smooth"});
  };

  const finishSwipe=(endX:number)=>{if(touchX===null)return;const dx=endX-touchX;if(Math.abs(dx)>42)setBanner(v=>(v+(dx<0?1:heroSlides.length-1))%heroSlides.length);setTouchX(null)};

  return <div dir={t.dir}>
    <div className="topbar"><b>عروض موثوقة</b><span>منصة لاكتشاف الكوبونات والصفقات من المتاجر المعروفة</span><small>تحديثات يومية</small></div>

    <header>
      <a className="brand">أبو خالد</a>
      <nav><a>{t.home}</a><a href="#stores">{t.stores}</a><a href="#coupons">{t.coupons}</a></nav>
      <div className="actions">
        <div className="langWrap"><button className="lang" onClick={()=>setLangOpen(!langOpen)}>{t.flag}<span>{t.name}</span>⌄</button>{langOpen&&<div className="langMenu">{langs.map(x=><button key={x} onClick={()=>chooseLang(x)}>{L[x].flag} {L[x].name}</button>)}</div>}</div>
        {user?<button className="authHeader iconButton" aria-label="الحساب" onClick={()=>setMenu(true)}>{(user.user_metadata?.avatar_url||user.user_metadata?.picture)?<img className="headerAvatar" src={user.user_metadata.avatar_url||user.user_metadata.picture} alt="" referrerPolicy="no-referrer"/>:<svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>}<span>حسابي</span></button>:<button className="authHeader iconButton" aria-label="تسجيل الدخول" onClick={()=>setAuthOpen(true)}><svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg><span>دخول</span></button>}
        <button className="hamb iconButton" aria-label="القائمة" onClick={()=>setMenu(true)}><svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </header>

    {menu&&<><div className="drawerBackdrop" onClick={()=>setMenu(false)}/><aside className="sideDrawer"><div className="drawerHead"><div><b>أبو خالد</b><small>COUPONS & DEALS</small></div><button className="drawerClose" aria-label="إغلاق القائمة" onClick={()=>setMenu(false)}>×</button></div>{user&&<div className="accountCard"><b>{user.user_metadata?.full_name||"حسابي"}</b><small>{user.email}</small><button onClick={logout}>تسجيل الخروج</button></div>}<div className="drawerNav"><a onClick={()=>setMenu(false)}><span className="drawerNavIcon">⌂</span><span>{t.home}</span><i>›</i></a><a href="#stores" onClick={()=>setMenu(false)}><span className="drawerNavIcon">◎</span><span>{t.stores}</span><i>›</i></a><a href="#coupons" onClick={()=>setMenu(false)}><span className="drawerNavIcon">%</span><span>{t.coupons}</span><i>›</i></a>{user&&<a href="#automation" onClick={()=>window.setTimeout(()=>window.location.reload(),20)}><span className="drawerNavIcon">⚙</span><span>لوحة الأتمتة</span><i>›</i></a>}</div><div className="drawerSettings"><div className="drawerSettingHead"><label>{t.country}</label><small>{country}</small></div><div className="countryChoices">{countries.map(x=><button key={x} className={country===x?"active":""} onClick={()=>setCountry(x)}>{x}</button>)}</div><div className="drawerSettingHead"><label>{t.language}</label><small>{t.flag} {t.name}</small></div><div className="languageSelectWrap"><span>{t.flag}</span><select value={lang} aria-label={t.language} onChange={e=>chooseLang(e.target.value as Lang)}>{langs.map(x=><option key={x} value={x}>{L[x].flag} {L[x].name}</option>)}</select><i>⌄</i></div></div></aside></>}

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
        <h1>اكتشف أفضل العروض والكوبونات</h1>
        <p>نرتب لك العروض المميزة من المتاجر المعروفة لتصل إلى الكود المناسب بسرعة ووضوح.</p>
        <form className="couponSearch" onSubmit={e=>{e.preventDefault();document.getElementById("coupons")?.scrollIntoView({behavior:"smooth"})}}><span>⌕</span><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={t.search}/><button>{t.searchBtn}</button></form>
      </section>

      <section id="stores" className="couponSection storesSection modernStores">
        <div className="couponSectionHead"><div><span>STORES</span><h2>المتاجر</h2></div><small>اختر متجراً لعرض كوبوناته</small></div>
        <div className="storeGrid modernStoreSlider">
          <button className={storeFilter==="الكل"?"active storeAllCard":"storeAllCard"} onClick={()=>setStoreFilter("الكل")}><span className="storeLogoWrap storeAllLogo">✦</span><b>الكل</b></button>
          {catalogStores.map(store=><button key={store.id} className={storeFilter===store.id?"active":""} onClick={()=>selectStore(store.id)}><span className="storeLogoWrap"><img src={store.logo} alt={store.name}/></span><b>{store.name}</b></button>)}
        </div>
      </section>

      <section className="dealChipsWrap" aria-label="تصنيفات سريعة">
        <div className="dealChips">
          <button className={dealChip==="best"?"active":""} onClick={()=>setDealChip("best")}>الأفضل</button>
          <button className={dealChip==="discount"?"active":""} onClick={()=>setDealChip("discount")}>أقوى خصم</button>
          <button className={dealChip==="tech"?"active":""} onClick={()=>setDealChip("tech")}>تقنية</button>
          <button className={dealChip==="fashion"?"active":""} onClick={()=>setDealChip("fashion")}>أزياء</button>
          <button className={dealChip==="home"?"active":""} onClick={()=>setDealChip("home")}>المنزل</button>
        </div>
        {(storeFilter!=="الكل"||country!=="الكل"||searchTerm)&&<button className="clearDealFilters" onClick={()=>{setStoreFilter("الكل");setCountry("الكل");setSearchTerm("");setDealChip("best")}}>مسح التحديد</button>}
      </section>

      <section id="coupons" className="couponSection modernDealsSection">
        <div className="couponSectionHead"><div><span>CURATED DEALS</span><h2>صفقات وكوبونات مختارة</h2></div><small>{visibleCoupons.length} عرض متاح</small></div>
        {visibleCoupons.length?<div className="couponGrid modernVoucherGrid">{visibleCoupons.map(coupon=><article className="couponCard modernVoucherCard" key={coupon.id} onClick={()=>openQuickView(coupon)}>
          <div className="couponCardTop">
            <div className="couponStore">
              <span><img src={coupon.store_logo} alt={coupon.store_name}/></span>
              <div><b>{coupon.store_name}</b><small>{coupon.country}</small></div>
            </div>
          </div>
          <div className="couponDiscount modernDiscount">{coupon.discount_label}</div>
          <h3>{coupon.title}</h3>
          <p className="voucherDescription">{coupon.description}</p>
          {coupon.coupon_code?<div className="voucherCodeBox" onClick={e=>e.stopPropagation()}>
            <div><small>كود الخصم</small><strong>{coupon.coupon_code}</strong></div>
            <button className={copied===coupon.id?"copied":""} onClick={()=>copyCouponOnly(coupon)}>{copied===coupon.id?"تم النسخ ✓":"نسخ الكود"}</button>
          </div>:<div className="voucherPriceBox"><div><small>السعر الحالي</small><strong>{coupon.deal_price}</strong></div>{coupon.original_price&&<del>{coupon.original_price}</del>}</div>}
          <button className="voucherPreviewBtn" onClick={e=>{e.stopPropagation();openQuickView(coupon)}}>عرض التفاصيل <span>↗</span></button>
        </article>)}</div>:<div className="emptyDeals">لا توجد عروض مطابقة لهذا الاختيار الآن.</div>}
      </section>

      <section className="couponTrust">
        <div><i>✓</i><span><b>كوبونات موثقة</b><small>نرتب العروض ونوضح مصدرها ومتجرها</small></span></div>
        <div><i>↗</i><span><b>تحويل مباشر للمتجر</b><small>لا نقوم بتحصيل المدفوعات داخل المنصة</small></span></div>
        <div><i>◎</i><span><b>مقارنة أسهل</b><small>فلترة حسب المتجر والدولة والقسم</small></span></div>
      </section>
    </main>

    {quickView&&<div className="quickViewBack" onClick={()=>setQuickView(null)}><section className="quickViewModal" role="dialog" aria-modal="true" aria-label={quickView.title} onClick={e=>e.stopPropagation()}><button className="quickViewClose" aria-label="إغلاق المعاينة" onClick={()=>setQuickView(null)}>×</button><div className="quickGallery"><div className={"quickMainImage "+(!quickView.gallery.length?"quickImageFallback":"")}>{quickView.gallery.length?<img src={quickView.gallery[Math.min(galleryIndex,quickView.gallery.length-1)]} alt={quickView.title}/>:<div className="quickFallbackInner"><img src={quickView.store_logo} alt={quickView.store_name}/><b>{quickView.store_name}</b><span>صورة المنتج ستُحدَّث من المصدر عند توفرها</span></div>}{quickView.discount_label&&<span className="quickSaveBadge">وفر {quickView.discount_label.replace("خصم ","")}</span>}</div>{quickView.gallery.length>1&&<div className="quickThumbs">{quickView.gallery.map((img,i)=><button key={img} className={galleryIndex===i?"active":""} onClick={()=>setGalleryIndex(i)}><img src={img} alt=""/></button>)}</div>}</div><div className="quickContent"><div className="quickStore"><span><img src={quickView.store_logo} alt={quickView.store_name}/></span><div><b>{quickView.store_name}</b><small>متجر موثوق ✓</small></div></div><h2>{quickView.title}</h2><div className="quickPrice"><strong>{quickView.deal_price}</strong><del>{quickView.original_price}</del><span>{quickView.discount_label}</span></div><div className="quickHighlights"><b>مميزات الصفقة</b><ul>{quickView.highlights.map(x=><li key={x}>{x}</li>)}</ul></div>{quickView.coupon_code&&<div className="smartCouponBox"><div><span>كود الخصم</span><strong>{quickView.coupon_code}</strong></div><button className={copied===quickView.id?"copied":""} onClick={()=>copyCouponOnly(quickView)}>{copied===quickView.id?"تم النسخ ✓":"نسخ الكود"}</button><small>سيتم تطبيق الخصم تلقائياً عند لصقه في صفحة الدفع بالمتجر.</small></div>}<a className="quickPrimaryCta" href={quickView.affiliate_link} target="_blank" rel="sponsored noopener noreferrer" onClick={()=>recordAffiliateClick(quickView)}>متابعة الشراء من {quickView.store_name} <span>↗</span></a><small className="quickDisclosure">سيتم فتح المتجر في نافذة جديدة. قد يكون الرابط رابط تسويق بالعمولة وقد نحصل على عمولة من عملية شراء مؤهلة دون تكلفة إضافية عليك.</small></div></section></div>}

    {copied&&<div className="copyToast" role="status">✓ تم نسخ الكود!</div>}

    {authOpen&&<div className="modalBack authBack" onClick={()=>setAuthOpen(false)}><section className="authExperience" onClick={e=>e.stopPropagation()}><button className="authClose" onClick={()=>setAuthOpen(false)}>×</button><aside className="authStory"><div className="authBrand"><i>%</i><b>ABU <em>KHALED</em></b><small>منصة كوبونات وعروض</small></div><div className="authStoryCopy"><h2>اكتشف العروض<br/><em>بشكل أذكى</em></h2><div className="benefit"><i>%</i><div><b>كوبونات حصرية</b><small>أكواد خصم مرتبة حسب المتجر</small></div></div><div className="benefit"><i>◎</i><div><b>متاجر متعددة</b><small>قارن بين العروض في مكان واحد</small></div></div><div className="benefit"><i>↗</i><div><b>انتقال مباشر</b><small>إتمام الشراء داخل المتجر الرسمي</small></div></div></div><small className="authStoryFoot">منصة واحدة للمقارنة والتوفير</small></aside><div className="authPanel"><small>ABU KHALED · SECURE ACCOUNT</small><h2>{authMode==="login"?"مرحبًا بعودتك":"أنشئ حسابك"}</h2><p>{authMode==="login"?"سجل الدخول إلى حسابك":"ابدأ تجربة عروض مخصصة وآمنة"}</p><div className="authTabs"><button className={authMode==="login"?"active":""} onClick={()=>{setAuthMode("login");setAuthMsg("")}}>تسجيل الدخول</button><button className={authMode==="signup"?"active":""} onClick={()=>{setAuthMode("signup");setAuthMsg("")}}>حساب جديد</button></div>{authMode==="signup"&&<label className="authField"><span>👤</span><input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="الاسم الكامل"/></label>}<label className="authField"><span>✉</span><input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="البريد الإلكتروني"/></label><label className="authField"><span>▣</span><input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="كلمة المرور"/></label>{authMode==="login"&&<div className="authHelpers"><span>تسجيل دخول آمن</span><button onClick={resetPassword}>نسيت كلمة المرور؟</button></div>}{authMsg&&<div className="authMsg">{authMsg}</div>}<button className="authSubmit" disabled={authBusy} onClick={submitAuth}>{authBusy?"جاري التنفيذ...":authMode==="login"?"تسجيل الدخول  ←":"إنشاء الحساب  ←"}</button><div className="authDivider"><span>أو</span></div><div className="socialDemo"><button className="googleLogin" disabled={authBusy} onClick={googleLogin}>G&nbsp;&nbsp; المتابعة باستخدام Google</button><button disabled>●&nbsp;&nbsp; Apple</button></div><div className="authSwitch"><span>{authMode==="login"?"ليس لديك حساب؟":"لديك حساب بالفعل؟"}</span><button onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMsg("")}}>{authMode==="login"?"إنشاء حساب جديد":"تسجيل الدخول"}</button></div><div className="authSecure">🔒 الحساب مؤمّن عبر Supabase Auth.</div></div></section></div>}

    <footer className="siteFooter couponFooter"><div className="footerTop"><div className="footerIdentity"><b>أبو خالد</b><p>منصة ذكية لتجميع الكوبونات والعروض ومقارنة الصفقات من المتاجر.</p><small>TTV4K — Abo Adam</small></div><div className="footerLinks"><b>روابط سريعة</b><a href="#stores">المتاجر</a><a href="#coupons">الكوبونات</a><a href="#privacy">سياسة الخصوصية</a><a href="#terms">الشروط والأحكام</a></div><div className="footerPayments"><b>الشفافية</b><p className="transparencyText">نوفر لك أفضل العروض الموثوقة بروابط تسوق آمنة ومباشرة من المتاجر الرسمية.</p><small>قد تحتوي بعض الروابط على روابط تسويق بالعمولة. عند إتمام شراء مؤهل قد نحصل على عمولة دون أي تكلفة إضافية عليك.</small></div></div><div className="footerBottom"><span>© 2026 أبو خالد. جميع الحقوق محفوظة.</span><span>كوبونات • عروض • روابط مباشرة</span></div></footer>
  </div>
}

createRoot(document.getElementById("root")!).render(isOAuthCallbackDocument()?<OAuthCallbackBridge/>:isAutomationDocument()?<AutomationDashboard/>:<App/>);