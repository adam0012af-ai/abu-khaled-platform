import React,{useEffect,useMemo,useState}from"react";
import{supabase}from"./supabase";

type OfferRow={
  id:string;
  title:string;
  store_name:string;
  country:string;
  category:string;
  discount_label:string;
  deal_price:string;
  original_price:string;
  affiliate_link:string;
  updated_at?:string;
  last_checked_at?:string;
};

type EventRow={
  id:string;
  event_type:string;
  status:string;
  created_at:string;
  offer_id?:string|null;
};

const tools=[
  ["إضافة منتج من رابط","URL → استخراج بيانات → حفظ المنتج","جاهز"],
  ["تحديث الأسعار","مراجعة المنتجات كل 12 ساعة","جاهز"],
  ["إدارة من Telegram","/add رابط لإضافة أو تحديث منتج","جاهز"],
  ["تنبيه انتهاء العروض","تنبيه قبل انتهاء العرض بـ3 أيام","جاهز"],
  ["تنبيهات GitHub","نجاح أو فشل الـBuild على Telegram","جاهز"],
  ["فرز دعم العملاء","تصنيف رسائل الدعم والأولوية","جاهز"],
  ["تقييم العملاء المحتملين","HOT / WARM / COLD تلقائيًا","جاهز"],
  ["مراجعة المحتوى","قائمة انتظار للمحتوى قبل النشر","جاهز"],
  ["طلبات Shopify","تنبيه فوري عند وصول طلب جديد","جاهز"],
  ["تقرير يومي","العروض والتغييرات وأحداث الأتمتة","جاهز"]
];

export default function AutomationDashboard(){
  const[offers,setOffers]=useState<OfferRow[]>([]);
  const[events,setEvents]=useState<EventRow[]>([]);
  const[loading,setLoading]=useState(true);
  const[url,setUrl]=useState("");
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const[refreshing,setRefreshing]=useState("");

  const load=async()=>{
    setLoading(true);
    const offersResult=await supabase
      .from("affiliate_offers")
      .select("id,title,store_name,country,category,discount_label,deal_price,original_price,affiliate_link,updated_at,last_checked_at")
      .eq("active",true)
      .order("updated_at",{ascending:false})
      .limit(50);

    if(!offersResult.error&&offersResult.data)setOffers(offersResult.data as OfferRow[]);

    const eventsResult=await supabase
      .from("automation_events")
      .select("id,event_type,status,created_at,offer_id")
      .order("created_at",{ascending:false})
      .limit(20);

    if(!eventsResult.error&&eventsResult.data)setEvents(eventsResult.data as EventRow[]);
    setLoading(false);
  };

  useEffect(()=>{void load()},[]);

  const importOffer=async()=>{
    const clean=url.trim();
    if(!/^https?:\/\//i.test(clean)){
      setMsg("اكتب رابط منتج صحيح يبدأ بـ http أو https.");
      return;
    }
    setBusy(true);
    setMsg("");
    const{data,error}=await supabase.functions.invoke("offer-import",{
      body:{url:clean,provider:"manual",verified:true}
    });
    if(error){
      setMsg("تعذر الإضافة الآن: "+error.message+" — لو الـEdge Function لسه غير منشورة سيتم تفعيلها من Supabase.");
    }else{
      setMsg(data?.offer_id?"تمت إضافة/تحديث المنتج: "+data.offer_id:"تم تنفيذ الطلب.");
      setUrl("");
      await load();
    }
    setBusy(false);
  };

  const refreshOffer=async(offer:OfferRow)=>{
    if(!offer.affiliate_link)return;
    setRefreshing(offer.id);
    setMsg("");
    const{error}=await supabase.functions.invoke("offer-import",{
      body:{url:offer.affiliate_link,offer_id:offer.id,provider:"refresh"}
    });
    setMsg(error?"تعذر تحديث المنتج: "+error.message:"تم تحديث المنتج وفحص السعر.");
    await load();
    setRefreshing("");
  };

  const stats=useMemo(()=>({
    offers:offers.length,
    events:events.length,
    ready:tools.length,
    updated:offers.filter(x=>x.last_checked_at).length
  }),[offers,events]);

  return <div className="automationPage" dir="rtl">
    <header className="automationTop">
      <div><b>أبو خالد</b><span>AUTOMATION CONTROL</span></div>
      <button onClick={()=>{window.location.hash="";window.location.reload()}}>العودة للمتجر</button>
    </header>

    <main className="automationMain">
      <section className="automationHero">
        <div>
          <span className="automationPill">لوحة الأتمتة</span>
          <h1>إدارة المنتجات والأتمتة من مكان واحد</h1>
          <p>أضف منتجًا بالرابط، راقب الأسعار، تابع الأحداث، وشغّل الأدوات الجاهزة بدون الحاجة لمكتبة مدفوعة.</p>
        </div>
        <div className="automationLive"><i/> نظام GitHub جاهز <small>الربط الحي يعتمد على تفعيل Supabase Functions</small></div>
      </section>

      <section className="automationStats">
        <article><span>منتجات حية</span><b>{loading?"—":stats.offers}</b><small>من Supabase</small></article>
        <article><span>أدوات جاهزة</span><b>{stats.ready}</b><small>Workflows</small></article>
        <article><span>تم فحصها</span><b>{stats.updated}</b><small>منتجات</small></article>
        <article><span>أحداث حديثة</span><b>{loading?"—":stats.events}</b><small>آخر سجل</small></article>
      </section>

      <section className="automationPanel">
        <div className="automationPanelHead"><div><span>PRODUCT IMPORT</span><h2>إضافة منتج حقيقي بالرابط</h2></div><small>السعر يبقى بعملة المصدر</small></div>
        <div className="automationImport">
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://store.example/product/..."/>
          <button disabled={busy} onClick={importOffer}>{busy?"جاري الاستخراج...":"استخراج وإضافة المنتج"}</button>
        </div>
        {msg&&<div className="automationMsg">{msg}</div>}
        <p className="automationHint">الأداة تحاول قراءة Product JSON-LD وOpenGraph من صفحة المتجر. لا يتم اختراع سعر إذا لم يوفر المصدر سعرًا موثوقًا.</p>
      </section>

      <section className="automationPanel">
        <div className="automationPanelHead"><div><span>WORKFLOWS</span><h2>الأدوات الجاهزة</h2></div><small>{tools.length} أداة</small></div>
        <div className="automationTools">
          {tools.map(([name,desc,status],i)=><article key={name}>
            <div className="automationToolIcon">{String(i+1).padStart(2,"0")}</div>
            <div><b>{name}</b><p>{desc}</p></div>
            <span>{status}</span>
          </article>)}
        </div>
      </section>

      <section className="automationPanel">
        <div className="automationPanelHead"><div><span>CATALOG</span><h2>المنتجات المربوطة</h2></div><button className="automationRefreshAll" onClick={()=>void load()}>تحديث القائمة</button></div>
        {loading?<div className="automationEmpty">جاري تحميل البيانات...</div>:offers.length?
          <div className="automationTableWrap"><table className="automationTable"><thead><tr><th>المنتج</th><th>المتجر</th><th>السعر</th><th>الخصم</th><th>آخر تحديث</th><th/></tr></thead><tbody>
            {offers.map(o=><tr key={o.id}><td><b>{o.title}</b><small>{o.country} · {o.category}</small></td><td>{o.store_name}</td><td><b>{o.deal_price||"—"}</b>{o.original_price&&<del>{o.original_price}</del>}</td><td>{o.discount_label||"—"}</td><td>{o.updated_at?new Date(o.updated_at).toLocaleString("ar-EG"):"—"}</td><td><button disabled={refreshing===o.id} onClick={()=>refreshOffer(o)}>{refreshing===o.id?"...":"فحص الآن"}</button></td></tr>)}
          </tbody></table></div>
          :<div className="automationEmpty">لا توجد منتجات في جدول affiliate_offers حتى الآن. المنتجات الحقيقية المعروضة في المتجر تعمل كبيانات مبدئية لحين تفعيل الجدول.</div>}
      </section>

      <section className="automationPanel">
        <div className="automationPanelHead"><div><span>EVENTS</span><h2>آخر أحداث الأتمتة</h2></div><small>{events.length} حدث</small></div>
        {events.length?<div className="automationEvents">{events.map(e=><article key={e.id}><i className={e.status==="ok"?"ok":""}/><div><b>{e.event_type}</b><small>{e.offer_id||"عام"} · {new Date(e.created_at).toLocaleString("ar-EG")}</small></div><span>{e.status}</span></article>)}</div>:<div className="automationEmpty">سجل الأحداث سيظهر هنا بمجرد تفعيل وظيفة automation-event في Supabase.</div>}
      </section>
    </main>
  </div>;
}
