import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{supabase}from"./supabase";
import"./style.css";

type Lang="ar"|"tr"|"en"|"fr"|"de";
type DealProduct={
  id:string;
  name:string;
  image:string;
  category:string;
  store_name:string;
  store_logo:string;
  affiliate_link:string;
  coupon_code?:string;
  original_price:number;
  deal_price:number;
  discount_rate:number;
  status:string;
  rating:number;
  description:string;
  is_new?:boolean;
  featured?:boolean;
};

const L:{[k in Lang]:any}={
  ar:{flag:"🇸🇦",name:"العربية",dir:"rtl",hero:"اكتشف. قارن.",hero2:"وفّر بذكاء.",desc:"منصة ذكية تجمع لك العروض والكوبونات وتقارن الصفقات من المتاجر الرسمية في مكان واحد.",search:"ابحث عن منتج أو متجر...",go:"ابحث",home:"الرئيسية",cats:"الأقسام",offers:"العروض والكوبونات",cur:"العملة",language:"اللغة"},
  tr:{flag:"🇹🇷",name:"Türkçe",dir:"ltr",hero:"Keşfet. Karşılaştır.",hero2:"Akıllıca tasarruf et.",desc:"Resmî mağazalardan fırsatları, kuponları ve fiyatları tek yerde karşılaştır.",search:"Ürün veya mağaza ara...",go:"Ara",home:"Ana Sayfa",cats:"Kategoriler",offers:"Fırsatlar ve Kuponlar",cur:"Para Birimi",language:"Dil"},
  en:{flag:"🇬🇧",name:"English",dir:"ltr",hero:"Discover. Compare.",hero2:"Save smarter.",desc:"Compare deals, coupons and prices from official stores in one smart hub.",search:"Search product or store...",go:"Search",home:"Home",cats:"Categories",offers:"Deals & Coupons",cur:"Currency",language:"Language"},
  fr:{flag:"🇫🇷",name:"Français",dir:"ltr",hero:"Découvrez. Comparez.",hero2:"Économisez mieux.",desc:"Comparez offres, coupons et prix des boutiques officielles en un seul endroit.",search:"Rechercher un produit ou une boutique...",go:"Rechercher",home:"Accueil",cats:"Catégories",offers:"Offres & Coupons",cur:"Devise",language:"Langue"},
  de:{flag:"🇩🇪",name:"Deutsch",dir:"ltr",hero:"Entdecken. Vergleichen.",hero2:"Clever sparen.",desc:"Vergleiche Angebote, Gutscheine und Preise offizieller Shops an einem Ort.",search:"Produkt oder Shop suchen...",go:"Suchen",home:"Startseite",cats:"Kategorien",offers:"Angebote & Gutscheine",cur:"Währung",language:"Sprache"}
};
const langs=(Object.keys(L) as Lang[]);
const categories=[["الكل","✦"],["إلكترونيات","⌁"],["أزياء وسنيكرز","♢"],["عطور","✧"],["إكسسوارات منزلية","⌂"]];

const products:DealProduct[]=[
  {id:"airpulse-pro",name:"سماعات AirPulse Pro",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=90",category:"إلكترونيات",store_name:"Amazon",store_logo:"https://www.google.com/s2/favicons?domain=amazon.com&sz=64",affiliate_link:"https://www.amazon.com.tr/s?k=bluetooth+headphones&tag=abukhaleddemo-21",coupon_code:"AK20",original_price:1899,deal_price:1499,discount_rate:21,status:"الأكثر طلباً",rating:4.9,description:"سماعات لاسلكية بصوت نقي وعزل مريح للاستخدام اليومي.",featured:true},
  {id:"nova-smart",name:"ساعة Nova Smart",image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=90",category:"إلكترونيات",store_name:"نون",store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=64",affiliate_link:"https://www.noon.com/saudi-en/search?q=smart%20watch&utm_source=abu_khaled_demo",coupon_code:"NOON15",original_price:3390,deal_price:2790,discount_rate:18,status:"عرض موثوق",rating:4.8,description:"ساعة ذكية بتصميم أنيق ومتابعة يومية للنشاط والتنبيهات.",featured:true},
  {id:"studio-mini",name:"سماعة Studio Mini",image:"https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=90",category:"إلكترونيات",store_name:"AliExpress",store_logo:"https://www.google.com/s2/favicons?domain=aliexpress.com&sz=64",affiliate_link:"https://www.aliexpress.com/wholesale?SearchText=wireless+headphones&aff_fcid=abu_khaled_demo",original_price:2290,deal_price:1890,discount_rate:17,status:"اختيار مميز",rating:4.7,description:"تصميم مدمج وصوت غني مع راحة مناسبة للجلسات الطويلة.",featured:true},
  {id:"urban-flex",name:"Sneaker Urban Flex",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=90",category:"أزياء وسنيكرز",store_name:"نمشي",store_logo:"https://www.google.com/s2/favicons?domain=namshi.com&sz=64",affiliate_link:"https://www.namshi.com/saudi-en/search/?q=sneakers&utm_source=abu_khaled_demo",coupon_code:"STYLE10",original_price:2790,deal_price:2190,discount_rate:22,status:"الأكثر طلباً",rating:4.9,description:"سنيكرز عصري بخامات مريحة وتصميم يومي متعدد الاستخدامات.",featured:true},
  {id:"atelier-carry",name:"حقيبة Atelier Carry",image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=90",category:"أزياء وسنيكرز",store_name:"نون",store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=64",affiliate_link:"https://www.noon.com/saudi-en/search?q=handbag&utm_source=abu_khaled_demo",original_price:2490,deal_price:1980,discount_rate:20,status:"مختار",rating:4.7,description:"حقيبة أنيقة بتفاصيل هادئة ومساحة عملية للاستخدام اليومي.",featured:true},
  {id:"signature-noir",name:"عطر Signature Noir",image:"https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=90",category:"عطور",store_name:"Amazon",store_logo:"https://www.google.com/s2/favicons?domain=amazon.com&sz=64",affiliate_link:"https://www.amazon.com.tr/s?k=perfume&tag=abukhaleddemo-21",coupon_code:"SCENT12",original_price:1650,deal_price:1250,discount_rate:24,status:"الأكثر طلباً",rating:4.9,description:"تركيبة عطرية دافئة بطابع فاخر وثبات مناسب للمساء.",featured:true},
  {id:"velvet-bloom",name:"عطر Velvet Bloom",image:"https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=90",category:"عطور",store_name:"AliExpress",store_logo:"https://www.google.com/s2/favicons?domain=aliexpress.com&sz=64",affiliate_link:"https://www.aliexpress.com/wholesale?SearchText=perfume&aff_fcid=abu_khaled_demo",original_price:1890,deal_price:1490,discount_rate:21,status:"عرض موسمي",rating:4.8,description:"نفحات ناعمة ومنعشة بتوازن أنيق للاستخدام اليومي.",featured:true},
  {id:"barista",name:"ماكينة قهوة Barista",image:"https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=90",category:"إكسسوارات منزلية",store_name:"نون",store_logo:"https://www.google.com/s2/favicons?domain=noon.com&sz=64",affiliate_link:"https://www.noon.com/saudi-en/search?q=coffee%20machine&utm_source=abu_khaled_demo",coupon_code:"HOME8",original_price:4250,deal_price:3490,discount_rate:18,status:"صفقة اليوم",rating:4.9,description:"ماكينة قهوة بتصميم مدمج لتحضير مشروبات يومية بسهولة.",featured:true},

  {id:"slate-keys",name:"لوحة مفاتيح Slate Keys",image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=90",category:"إلكترونيات",store_name:"Amazon",store_logo:"https://www.google.com/s2/favicons?domain=amazon.com&sz=64",affiliate_link:"https://www.amazon.com.tr/s?k=wireless+keyboard&tag=abukhaleddemo-21",original_price:1990,deal_price:1690,discount_rate:15,status:"وصل حديثاً",rating:4.8,description:"لوحة مفاتيح لاسلكية بتصميم نحيف وتجربة كتابة هادئة.",is_new:true},
  {id:"metro-mini",name:"حقيبة Metro Mini",image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=90",category:"أزياء وسنيكرز",store_name:"نمشي",store_logo:"https://www.google.com/s2/favicons?domain=namshi.com&sz=64",affiliate_link:"https://www.namshi.com/saudi-en/search/?q=bag&utm_source=abu_khaled_demo",coupon_code:"NEW12",original_price:2090,deal_price:1740,discount_rate:17,status:"وصل حديثاً",rating:4.7,description:"حقيبة يومية مدمجة بخطوط نظيفة ومساحات عملية.",is_new:true},
  {id:"amber-edition",name:"عطر Amber Edition",image:"https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=90",category:"عطور",store_name:"Amazon",store_logo:"https://www.google.com/s2/favicons?domain=amazon.com&sz=64",affiliate_link:"https://www.amazon.com.tr/s?k=amber+perfume&tag=abukhaleddemo-21",coupon_code:"AMBER15",original_price:1990,deal_price:1590,discount_rate:20,status:"وصل حديثاً",rating:4.9,description:"عطر بطابع دافئ ولمسة خشبية راقية للاستخدام اليومي.",is_new:true},
  {id:"nordic-stone",name:"مزهرية Nordic Stone",image:"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=90",category:"إكسسوارات منزلية",store_name:"AliExpress",store_logo:"https://www.google.com/s2/favicons?domain=aliexpress.com&sz=64",affiliate_link:"https://www.aliexpress.com/wholesale?SearchText=home+decor+vase&aff_fcid=abu_khaled_demo",original_price:1390,deal_price:1090,discount_rate:22,status:"وصل حديثاً",rating:4.6,description:"قطعة ديكور بسيطة بملمس حجري تناسب المساحات العصرية.",is_new:true}
];

const banners=[
  ["صفقات تقنية من المتاجر الرسمية","قارن أسعار الإلكترونيات واكتشف أفضل الخصومات من شركائنا.","https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1800&q=92","استكشف صفقات التقنية","إلكترونيات"],
  ["عروض الموضة في مكان واحد","وفر وقت البحث وقارن عروض السنيكرز والحقائب بين المتاجر.","https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=92","قارن عروض الموضة","أزياء وسنيكرز"],
  ["كوبونات وعروض عطور مختارة","خصومات موسمية وروابط مباشرة للشراء من المتاجر الشريكة.","https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1800&q=92","شاهد عروض العطور","عطور"]
];

function StoreBadge({product}:{product:DealProduct}){
  return <span className="storeBadge"><img src={product.store_logo} alt="" loading="lazy"/><b>{product.store_name}</b></span>
}

function DealCard({product,onOpen,onToggleWishlist,isWish,formatMoney,onCopy,copied}:{product:DealProduct,onOpen:()=>void,onToggleWishlist:()=>void,isWish:boolean,formatMoney:(v:number)=>string,onCopy:(code:string)=>void,copied:string}){
  return <article className="deal flagshipProduct affiliateCard" onClick={onOpen}>
    <div className="dealImg">
      <img src={product.image} alt={product.name} loading="lazy"/>
      <StoreBadge product={product}/>
      <button className={"wishlistBtn "+(isWish?"active":"")} aria-label="المفضلة" onClick={e=>{e.stopPropagation();onToggleWishlist()}}>{isWish?"♥":"♡"}</button>
    </div>
    <div className="dealBody">
      <div className="dealMeta"><span>{product.category}</span><span>★ {product.rating}</span></div>
      <h3>{product.name}</h3>
      <div className="prices affiliatePrices"><strong>{formatMoney(product.deal_price)}</strong><del>{formatMoney(product.original_price)}</del><span className="priceBadge">خصم {product.discount_rate}%</span></div>
      {product.coupon_code&&<button className="couponBtn" onClick={e=>{e.stopPropagation();onCopy(product.coupon_code!)}}>{copied===product.coupon_code?"✓ تم النسخ":"نسخ الكوبون "+product.coupon_code}</button>}
      <a className="affiliateCta" href={product.affiliate_link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>اذهب إلى العرض <span>↗</span></a>
    </div>
  </article>
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
  const[banner,setBanner]=useState(0);
  const[touchX,setTouchX]=useState<number|null>(null);
  const[activeCategory,setActiveCategory]=useState("الكل");
  const[storeFilter,setStoreFilter]=useState("الكل");
  const[sortFilter,setSortFilter]=useState("featured");
  const[searchTerm,setSearchTerm]=useState("");
  const[wishlist,setWishlist]=useState<string[]>([]);
  const[product,setProduct]=useState<DealProduct|null>(null);
  const[copiedCoupon,setCopiedCoupon]=useState("");
  const[lang,setLang]=useState<Lang>("ar");
  const[currency,setCurrency]=useState("TRY ₺");
  const[currencyManual,setCurrencyManual]=useState(false);
  const[fxRates,setFxRates]=useState<Record<string,number>>({TRY:1,USD:.024,EUR:.0205,SAR:.09,EGP:1.18});
  const t=L[lang];

  useEffect(()=>{let alive=true;const enforceViewport=()=>{let meta=document.querySelector('meta[name="viewport"]') as HTMLMetaElement|null;if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta)}meta.content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"};const cleanAuthUrl=()=>{const url=new URL(window.location.href);if(url.searchParams.has("code")||url.searchParams.has("error")||url.hash){window.history.replaceState({},document.title,window.location.pathname)}};const applyAuthenticatedSession=(session:any)=>{if(!alive||!session?.user)return;enforceViewport();setUser(session.user);setAuthOpen(false);setAuthBusy(false);setAuthMsg("");cleanAuthUrl()};supabase.auth.getSession().then(({data,error})=>{if(!alive)return;if(error){setAuthMsg(error.message);setAuthBusy(false);return}if(data.session)applyAuthenticatedSession(data.session);else setUser(null)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(!alive)return;if(session?.user)applyAuthenticatedSession(session);else setUser(null)});return()=>{alive=false;subscription.unsubscribe()}},[]);
  useEffect(()=>{const id=window.setInterval(()=>setBanner(v=>(v+1)%banners.length),5000);return()=>window.clearInterval(id)},[]);
  useEffect(()=>{let cancelled=false;fetch("https://open.er-api.com/v6/latest/TRY").then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(cancelled||!data?.rates)return;setFxRates(v=>({...v,TRY:1,USD:Number(data.rates.USD)||v.USD,EUR:Number(data.rates.EUR)||v.EUR,SAR:Number(data.rates.SAR)||v.SAR,EGP:Number(data.rates.EGP)||v.EGP}))}).catch(()=>{});return()=>{cancelled=true}},[]);

  const submitAuth=async()=>{setAuthBusy(true);setAuthMsg("");if(!authEmail||authPassword.length<6){setAuthMsg("أدخل بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل.");setAuthBusy(false);return}const result=authMode==="signup"?await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{full_name:authName}}}):await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});if(result.error)setAuthMsg(result.error.message);else{setAuthMsg(authMode==="signup"&&!result.data.session?"تم إنشاء الحساب. راجع بريدك لتأكيد الحساب.":"تم تسجيل الدخول بنجاح.");if(result.data.session)setTimeout(()=>setAuthOpen(false),500)}setAuthBusy(false)};
  const resetPassword=async()=>{if(!authEmail){setAuthMsg("اكتب بريدك الإلكتروني أولًا.");return}const{error}=await supabase.auth.resetPasswordForEmail(authEmail,{redirectTo:window.location.origin});setAuthMsg(error?error.message:"تم إرسال رابط استعادة كلمة المرور إلى بريدك.")};
  const logout=async()=>{await supabase.auth.signOut();setMenu(false)};
  const googleLogin=async()=>{setAuthBusy(true);setAuthMsg("");const redirectTo=`${window.location.origin}/`;const{error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo,queryParams:{prompt:"select_account"}}});if(error){setAuthMsg(error.message);setAuthBusy(false)}};

  const autoCurrency=(x:Lang)=>x==="tr"?"TRY ₺":x==="ar"?"SAR ﷼":"EUR €";
  const choose=(x:Lang)=>{setLang(x);if(!currencyManual)setCurrency(autoCurrency(x));setLangOpen(false)};
  const chooseCurrency=(x:string)=>{setCurrency(x);setCurrencyManual(true)};
  const currencyCode=currency.split(" ")[0];
  const currencySymbol:Record<string,string>={TRY:"₺",SAR:"﷼",EGP:"£",EUR:"€",USD:"$"};
  const formatMoney=(value:number)=>{const amount=value*(fxRates[currencyCode]||1);const decimals=currencyCode==="TRY"||currencyCode==="EGP"?0:2;return new Intl.NumberFormat(lang==="ar"?"ar-EG":"en-US",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(amount)+" "+(currencySymbol[currencyCode]||currencyCode)};

  const stores=useMemo(()=>["الكل",...Array.from(new Set(products.map(p=>p.store_name)))],[]);
  const filteredProducts=useMemo(()=>{
    const q=searchTerm.trim().toLowerCase();
    let list=products.filter(p=>(activeCategory==="الكل"||p.category===activeCategory)&&(storeFilter==="الكل"||p.store_name===storeFilter)&&(!q||p.name.toLowerCase().includes(q)||p.store_name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)));
    if(sortFilter==="discount")list=[...list].sort((a,b)=>b.discount_rate-a.discount_rate);
    if(sortFilter==="price")list=[...list].sort((a,b)=>a.deal_price-b.deal_price);
    return list;
  },[activeCategory,storeFilter,searchTerm,sortFilter]);
  const featuredDeals=filteredProducts.filter(p=>p.featured).slice(0,8);
  const newArrivals=filteredProducts.filter(p=>p.is_new).slice(0,8);
  const toggleWishlist=(id:string)=>setWishlist(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  const finishSwipe=(endX:number)=>{if(touchX===null)return;const dx=endX-touchX;if(Math.abs(dx)>42)setBanner(v=>(v+(dx<0?1:banners.length-1))%banners.length);setTouchX(null)};
  const copyCoupon=async(code:string)=>{try{await navigator.clipboard.writeText(code)}catch{const ta=document.createElement("textarea");ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}setCopiedCoupon(code);window.setTimeout(()=>setCopiedCoupon(v=>v===code?"":v),1800)};

  return <div dir={t.dir}>
    <div className="topbar"><b>DEMO</b><span>{lang==="ar"?"عروض موثوقة • مقارنة ذكية • روابط مباشرة":"Trusted deals · Smart comparison"}</span><small>TTV4K · Abo Adam</small></div>
    <header>
      <a className="brand">أبو خالد</a>
      <nav><a>{t.home}</a><a href="#categories">{t.cats}</a><a href="#deals">{t.offers}</a></nav>
      <div className="actions">
        <button className="country">◈ <span>{currency}</span></button>
        <div className="langWrap"><button className="lang" onClick={()=>setLangOpen(!langOpen)}>{t.flag}<span>{t.name}</span>⌄</button>{langOpen&&<div className="langMenu">{langs.map(x=><button key={x} onClick={()=>choose(x)}>{L[x].flag} {L[x].name}</button>)}</div>}</div>
        {user?<button className="authHeader iconButton" aria-label="الحساب" onClick={()=>setMenu(true)}>{(user.user_metadata?.avatar_url||user.user_metadata?.picture)?<img className="headerAvatar" src={user.user_metadata.avatar_url||user.user_metadata.picture} alt="" referrerPolicy="no-referrer"/>:<svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>}<span>حسابي</span></button>:<button className="authHeader iconButton" aria-label="تسجيل الدخول" onClick={()=>setAuthOpen(true)}><svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg><span>دخول</span></button>}
        <button className="savedBtn iconButton" aria-label="العروض المحفوظة" onClick={()=>document.getElementById("deals")?.scrollIntoView({behavior:"smooth"})}><svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg><b>{wishlist.length}</b></button>
        <button className="hamb iconButton" aria-label="القائمة" onClick={()=>setMenu(true)}><svg className="headerIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </header>

    {menu&&<><div className="drawerBackdrop" onClick={()=>setMenu(false)}/><aside className="sideDrawer"><div className="drawerHead"><div><b>أبو خالد</b><small><span>DEMO</span> · SMART DEALS</small></div><button className="drawerClose" aria-label="إغلاق القائمة" onClick={()=>setMenu(false)}>×</button></div>{user&&<div className="accountCard"><b>{user.user_metadata?.full_name||"حسابي"}</b><small>{user.email}</small><button onClick={logout}>تسجيل الخروج</button></div>}<div className="drawerNav"><a onClick={()=>setMenu(false)}><span className="drawerNavIcon">⌂</span><span>{t.home}</span><i>›</i></a><a href="#categories" onClick={()=>setMenu(false)}><span className="drawerNavIcon">▦</span><span>{t.cats}</span><i>›</i></a><a href="#deals" onClick={()=>setMenu(false)}><span className="drawerNavIcon">◇</span><span>{t.offers}</span><i>›</i></a></div><div className="drawerSettings"><div className="drawerSettingHead"><label>{t.cur}</label>{currencyManual&&<small>اختيار يدوي</small>}</div><div className="currencyChoices">{["TRY ₺","SAR ﷼","EGP £","EUR €","USD $"].map(x=><button key={x} className={currency===x?"active":""} onClick={()=>chooseCurrency(x)}>{x}</button>)}</div><div className="drawerSettingHead"><label>{t.language}</label><small>{t.flag} {t.name}</small></div><div className="languageSelectWrap"><span>{t.flag}</span><select value={lang} aria-label={t.language} onChange={e=>choose(e.target.value as Lang)}>{langs.map(x=><option key={x} value={x}>{L[x].flag} {L[x].name}</option>)}</select><i>⌄</i></div></div></aside></>}

    <main>
      <section className="promoBanner flagshipSlider" onTouchStart={e=>setTouchX(e.touches[0].clientX)} onTouchEnd={e=>finishSwipe(e.changedTouches[0].clientX)}>
        <img key={banners[banner][2]} src={banners[banner][2]} alt={banners[banner][0]}/><div className="promoShade"/>
        <div className="promoText"><small>ABU KHALED · SMART DEALS HUB</small><h2>{banners[banner][0]}</h2><p>{banners[banner][1]}</p><button onClick={()=>{setActiveCategory(banners[banner][4]);document.getElementById("deals")?.scrollIntoView({behavior:"smooth"})}}>{banners[banner][3]}</button></div>
        <button className="promoPrev" aria-label="السابق" onClick={()=>setBanner((banner+banners.length-1)%banners.length)}>‹</button><button className="promoNext" aria-label="التالي" onClick={()=>setBanner((banner+1)%banners.length)}>›</button>
        <div className="promoDots">{banners.map((_,i)=><button key={i} aria-label={"بنر "+(i+1)} className={banner===i?"active":""} onClick={()=>setBanner(i)}><span/></button>)}</div>
      </section>

      <section className="hero affiliateHero"><div className="heroCopy"><span className="pill">مقارنة ذكية • كوبونات • متاجر رسمية</span><h1>{t.hero}<br/><em>{t.hero2}</em></h1><p>{t.desc}</p><form className="search" onSubmit={e=>{e.preventDefault();document.getElementById("deals")?.scrollIntoView({behavior:"smooth"})}}><span>⌕</span><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={t.search}/><button>{t.go}</button></form><div className="proof"><span><b>{products.length}</b> عرض</span><span><b>{stores.length-1}</b> متاجر شريكة</span><span><b>5</b> عملات</span></div></div><div className="spotlight affiliateSpotlight"><div className="spotTop"><span>SMART MATCH</span><i>● LIVE</i></div><div className="spotIcon">↗</div><h2>من المقارنة إلى المتجر مباشرة</h2><p>نساعدك في اكتشاف الصفقة، نسخ الكوبون، ثم الانتقال بأمان إلى المتجر الرسمي لإتمام الشراء.</p></div></section>

      <section id="categories" className="categoryStripSection"><div className="heading compactHeading"><div><span>DISCOVER</span><h2>تصفّح حسب القسم</h2></div></div><div className="categoryPills">{categories.map(([name,icon])=><button key={name} className={activeCategory===name?"active":""} onClick={()=>setActiveCategory(name)}><i>{icon}</i><span>{name}</span></button>)}</div></section>

      <section className="dealFilterBar" aria-label="فلترة العروض"><label className="filterSearch"><span>⌕</span><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="ابحث عن منتج أو متجر"/></label><label><span>المتجر</span><select value={storeFilter} onChange={e=>setStoreFilter(e.target.value)}>{stores.map(store=><option key={store}>{store}</option>)}</select></label><label><span>الترتيب</span><select value={sortFilter} onChange={e=>setSortFilter(e.target.value)}><option value="featured">الأكثر ملاءمة</option><option value="discount">أعلى نسبة خصم</option><option value="price">الأقل سعراً</option></select></label><button onClick={()=>{setSearchTerm("");setStoreFilter("الكل");setActiveCategory("الكل");setSortFilter("featured")}}>إعادة الضبط</button></section>

      <section id="deals" className="block productSection"><div className="heading"><div><span>SMART DEALS</span><h2>أفضل الصفقات المتاحة</h2></div><small>{filteredProducts.length} نتيجة</small></div>{featuredDeals.length?<div className="deals flagshipGrid">{featuredDeals.map(p=><DealCard key={p.id} product={p} onOpen={()=>setProduct(p)} onToggleWishlist={()=>toggleWishlist(p.id)} isWish={wishlist.includes(p.id)} formatMoney={formatMoney} onCopy={copyCoupon} copied={copiedCoupon}/>)}</div>:<div className="emptyDeals">لا توجد عروض مطابقة للفلاتر الحالية.</div>}</section>

      {newArrivals.length>0&&<section className="block productSection arrivalsSection"><div className="heading"><div><span>FRESH DEALS</span><h2>عروض أضيفت حديثاً</h2></div><small>تحديثات جديدة</small></div><div className="deals flagshipGrid arrivalsGrid">{newArrivals.map(p=><DealCard key={p.id} product={p} onOpen={()=>setProduct(p)} onToggleWishlist={()=>toggleWishlist(p.id)} isWish={wishlist.includes(p.id)} formatMoney={formatMoney} onCopy={copyCoupon} copied={copiedCoupon}/>)}</div></section>}

      <section className="trustStrip affiliateTrust" aria-label="مزايا المنصة"><div><i>◎</i><span><b>مقارنة في مكان واحد</b><small>عروض من أكثر من متجر شريك</small></span></div><div><i>⌁</i><span><b>روابط مباشرة وآمنة</b><small>الشراء يتم من المتجر الرسمي</small></span></div><div><i>✦</i><span><b>كوبونات جاهزة</b><small>نسخ الكود بنقرة واحدة عند توفره</small></span></div></section>
    </main>

    {product&&<div className="modalBack" onClick={()=>setProduct(null)}><section className="productModal affiliateModal" onClick={e=>e.stopPropagation()}><button className="modalClose" onClick={()=>setProduct(null)}>×</button><div className="affiliateModalImage"><img src={product.image} alt={product.name}/><StoreBadge product={product}/></div><div className="productInfo"><small>SMART DEAL · {product.store_name}</small><h2>{product.name}</h2><div className="rating">★★★★★ <span>{product.rating} تقييم</span></div><div className="modalPrice"><strong>{formatMoney(product.deal_price)}</strong><del>{formatMoney(product.original_price)}</del><b>خصم {product.discount_rate}%</b></div><p>{product.description}</p><div className="affiliateFacts"><span>المتجر الشريك <b>{product.store_name}</b></span><span>القسم <b>{product.category}</b></span><span>الحالة <b>{product.status}</b></span></div>{product.coupon_code&&<button className="modalCoupon" onClick={()=>copyCoupon(product.coupon_code!)}>{copiedCoupon===product.coupon_code?"✓ تم النسخ!":"نسخ الكوبون "+product.coupon_code}</button>}<a className="modalAffiliateCta" href={product.affiliate_link} target="_blank" rel="noopener noreferrer">شراء من {product.store_name} <span>↗</span></a><small className="affiliateNotice">سيتم فتح موقع المتجر في تبويب جديد. قد نحصل على عمولة من بعض عمليات الشراء دون تكلفة إضافية عليك.</small></div></section></div>}

    {copiedCoupon&&<div className="copyToast" role="status">✓ تم نسخ الكوبون</div>}

    {authOpen&&<div className="modalBack authBack" onClick={()=>setAuthOpen(false)}><section className="authExperience" onClick={e=>e.stopPropagation()}><button className="authClose" onClick={()=>setAuthOpen(false)}>×</button><aside className="authStory"><div className="authBrand"><i>▢</i><b>ABU <em>KHALED</em></b><small>منصة صفقات ذكية</small></div><div className="authStoryCopy"><h2>احفظ أفضل<br/><em>العروض لك</em></h2><div className="benefit"><i>♡</i><div><b>قائمة المفضلة</b><small>احفظ الصفقات التي تهمك</small></div></div><div className="benefit"><i>%</i><div><b>كوبونات مختارة</b><small>اعثر على الأكواد المتاحة بسرعة</small></div></div><div className="benefit"><i>↗</i><div><b>روابط مباشرة</b><small>انتقل إلى المتجر الرسمي لإتمام الشراء</small></div></div></div><small className="authStoryFoot">منصة واحدة للمقارنة والتوفير</small></aside><div className="authPanel"><small>ABU KHALED · SECURE ACCOUNT</small><h2>{authMode==="login"?"مرحبًا بعودتك":"أنشئ حسابك"}</h2><p>{authMode==="login"?"سجل الدخول إلى حسابك":"ابدأ تجربة عروض مخصصة وآمنة"}</p><div className="authTabs"><button className={authMode==="login"?"active":""} onClick={()=>{setAuthMode("login");setAuthMsg("")}}>تسجيل الدخول</button><button className={authMode==="signup"?"active":""} onClick={()=>{setAuthMode("signup");setAuthMsg("")}}>حساب جديد</button></div>{authMode==="signup"&&<label className="authField"><span>👤</span><input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="الاسم الكامل"/></label>}<label className="authField"><span>✉</span><input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="البريد الإلكتروني"/></label><label className="authField"><span>▣</span><input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="كلمة المرور"/></label>{authMode==="login"&&<div className="authHelpers"><span>تسجيل دخول آمن</span><button onClick={resetPassword}>نسيت كلمة المرور؟</button></div>}{authMsg&&<div className="authMsg">{authMsg}</div>}<button className="authSubmit" disabled={authBusy} onClick={submitAuth}>{authBusy?"جاري التنفيذ...":authMode==="login"?"تسجيل الدخول  ←":"إنشاء الحساب  ←"}</button><div className="authDivider"><span>أو</span></div><div className="socialDemo"><button className="googleLogin" disabled={authBusy} onClick={googleLogin}>G&nbsp;&nbsp; المتابعة باستخدام Google</button><button disabled>●&nbsp;&nbsp; Apple</button></div><div className="authSwitch"><span>{authMode==="login"?"ليس لديك حساب؟":"لديك حساب بالفعل؟"}</span><button onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMsg("")}}>{authMode==="login"?"إنشاء حساب جديد":"تسجيل الدخول"}</button></div><div className="authSecure">🔒 الحساب مؤمّن عبر Supabase Auth. تسجيل Google مفعّل للتجربة.</div></div></section></div>}

    <footer className="siteFooter" id="footer"><div className="footerTop"><div className="footerIdentity"><b>أبو خالد</b><p>منصة ذكية لتجميع العروض والكوبونات ومقارنة الصفقات من المتاجر الشريكة.</p><small>DEMO · TTV4K — Abo Adam</small></div><div className="footerLinks"><b>روابط سريعة</b><a href="#privacy">سياسة الخصوصية</a><a href="#terms">الشروط والأحكام</a><a href="#deals">العروض</a><a href="#contact">تواصل معنا</a></div><div className="footerPayments affiliatePartners"><b>متاجر شريكة</b><div className="paymentBadges"><span>Amazon</span><span>نون</span><span>نمشي</span><span>AliExpress</span></div><small>نوفر لك أفضل العروض الموثوقة بروابط تسوق آمنة ومباشرة من المتاجر الرسمية.</small></div></div><div className="affiliateDisclosure">قد تحتوي بعض الروابط على إحالات تسويقية، وقد نحصل على عمولة عند إتمام شراء مؤهل دون زيادة السعر عليك.</div><div className="footerBottom"><span>© 2026 متجر أبو خالد. جميع الحقوق محفوظة.</span><span>مقارنة ذكية • كوبونات • روابط مباشرة</span></div></footer>
  </div>
}

createRoot(document.getElementById("root")!).render(<App/>);
