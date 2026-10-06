import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"GET, OPTIONS",
  "Access-Control-Allow-Headers":"content-type"
};

function clean(value: unknown) {
  return String(value ?? "").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").trim();
}

function imageList(value: unknown) {
  const out:string[]=[];
  const add=(v:unknown)=>{
    if(typeof v==="string" && /^https?:\/\//i.test(v) && !out.includes(v)) out.push(v);
    if(v && typeof v==="object"){
      const obj=v as Record<string,unknown>;
      add(obj.url ?? obj.contentUrl ?? obj["@id"]);
    }
  };
  if(Array.isArray(value)) value.forEach(add); else add(value);
  return out.slice(0,8);
}

function flatten(value:unknown,out:Record<string,unknown>[]=[]){
  if(Array.isArray(value)) value.forEach(v=>flatten(v,out));
  else if(value && typeof value==="object"){
    const obj=value as Record<string,unknown>;
    out.push(obj);
    Object.values(obj).forEach(v=>{ if(v && typeof v==="object") flatten(v,out); });
  }
  return out;
}

function parseProductImages(html:string){
  const images:string[]=[];
  const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for(const m of html.matchAll(re)){
    const raw=m[1]?.trim();
    if(!raw || raw.length>500000) continue;
    try{
      const objects=flatten(JSON.parse(raw));
      for(const obj of objects){
        const t=obj["@type"];
        const isProduct=Array.isArray(t)
          ? t.some(x=>String(x).toLowerCase()==="product")
          : String(t??"").toLowerCase()==="product";
        if(isProduct){
          for(const u of imageList(obj.image)) if(!images.includes(u)) images.push(u);
        }
      }
    }catch{}
  }

  const metaPatterns=[
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
  ];
  for(const p of metaPatterns){
    const u=clean(html.match(p)?.[1] ?? "");
    if(/^https?:\/\//i.test(u) && !images.includes(u)) images.push(u);
  }

  if(!images.length){
    const samsung=[...html.matchAll(/https:\/\/images\.samsung\.com\/[^"'<>\s]+/gi)]
      .map(m=>clean(m[0].replace(/\\u002F/g,"/")));
    for(const u of samsung){
      if(!images.includes(u)) images.push(u);
      if(images.length>=8) break;
    }
  }

  return images.slice(0,8);
}

function blocked(host:string){
  const h=host.toLowerCase();
  if(h==="localhost"||h==="::1"||h.endsWith(".local")) return true;
  if(/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)) return true;
  const m=h.match(/^172\.(\d+)\./); return !!(m&&Number(m[1])>=16&&Number(m[1])<=31);
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="GET") return new Response("Method not allowed",{status:405,headers:cors});

  const id=new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if(!id || id.length>120) return new Response("Invalid id",{status:400,headers:cors});

  const url=Deno.env.get("SUPABASE_URL") ?? "";
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if(!url||!service) return new Response("Server configuration unavailable",{status:500,headers:cors});

  const supabase=createClient(url,service,{auth:{persistSession:false}});
  const {data:offer,error}=await supabase
    .from("affiliate_offers")
    .select("id,product_url,gallery,active")
    .eq("id",id)
    .eq("active",true)
    .maybeSingle();

  if(error||!offer) return new Response("Not found",{status:404,headers:cors});

  const current=Array.isArray(offer.gallery)?offer.gallery.filter((x:unknown)=>typeof x==="string"&&/^https?:\/\//i.test(String(x))):[];
  if(current.length){
    return Response.redirect(String(current[0]),302);
  }

  let productUrl:URL;
  try{ productUrl=new URL(String(offer.product_url)); }
  catch{ return new Response("Invalid product URL",{status:422,headers:cors}); }

  if(!["http:","https:"].includes(productUrl.protocol)||blocked(productUrl.hostname)){
    return new Response("Blocked product URL",{status:422,headers:cors});
  }

  try{
    const res=await fetch(productUrl.toString(),{
      redirect:"follow",
      signal:AbortSignal.timeout(12000),
      headers:{
        "User-Agent":"Mozilla/5.0 (compatible; AbuKhaledProductImageBot/1.0)",
        "Accept":"text/html,application/xhtml+xml",
        "Accept-Language":"ar,en;q=0.8"
      }
    });
    if(!res.ok) throw new Error("HTTP "+res.status);
    const type=res.headers.get("content-type")??"";
    if(!type.includes("text/html")&&!type.includes("application/xhtml+xml")) throw new Error("Unsupported content type");
    const html=(await res.text()).slice(0,2500000);
    const images=parseProductImages(html);
    if(!images.length) return new Response("No image found",{status:404,headers:cors});

    await supabase.from("affiliate_offers").update({
      gallery:images,
      last_checked_at:new Date().toISOString(),
      last_check_status:"image_enriched"
    }).eq("id",id);

    return Response.redirect(images[0],302);
  }catch{
    return new Response("Image unavailable",{status:404,headers:{...cors,"Cache-Control":"public, max-age=300"}});
  }
});
