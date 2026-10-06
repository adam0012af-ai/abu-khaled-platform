import { createClient } from "npm:@supabase/supabase-js@2";

type ImportBody = {
  url?: string;
  offer_id?: string;
  affiliate_link?: string;
  provider?: string;
  store_id?: string;
  store_name?: string;
  country?: string;
  category?: string;
  coupon_code?: string;
  featured?: boolean;
  verified?: boolean;
  expires?: string;
  expires_at?: string | null;
  highlights?: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-automation-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, key: string) {
  const p1 = new RegExp('<meta[^>]+(?:property|name)=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']*)["\\\'][^>]*>', "i");
  const p2 = new RegExp('<meta[^>]+content=["\\\']([^"\\\']*)["\\\'][^>]+(?:property|name)=["\\\']' + key + '["\\\'][^>]*>', "i");
  return clean(html.match(p1)?.[1] ?? html.match(p2)?.[1] ?? "");
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return /^169\.254\./.test(host) || /^0\./.test(host);
}

function flatten(value: unknown, out: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => flatten(item, out));
  } else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    out.push(obj);
    Object.values(obj).forEach((item) => {
      if (item && typeof item === "object") flatten(item, out);
    });
  }
  return out;
}

function parseJsonLd(html: string) {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const raw = match[1]?.trim();
    if (!raw || raw.length > 500000) continue;
    try {
      flatten(JSON.parse(raw), out);
    } catch {
      // Ignore malformed JSON-LD and continue with metadata fallbacks.
    }
  }
  return out;
}

function findProduct(items: Record<string, unknown>[]) {
  return items.find((obj) => {
    const t = obj["@type"];
    if (Array.isArray(t)) return t.some((x) => String(x).toLowerCase() === "product");
    return String(t ?? "").toLowerCase() === "product";
  });
}

function firstOffer(product?: Record<string, unknown>) {
  const offers = product?.offers;
  if (Array.isArray(offers)) return offers[0] as Record<string, unknown> | undefined;
  if (offers && typeof offers === "object") return offers as Record<string, unknown>;
  return undefined;
}

function imageList(value: unknown) {
  const out: string[] = [];
  const add = (item: unknown) => {
    if (typeof item === "string" && /^https?:\/\//i.test(item) && !out.includes(item)) out.push(item);
    if (item && typeof item === "object" && "url" in (item as Record<string, unknown>)) {
      add((item as Record<string, unknown>).url);
    }
  };
  if (Array.isArray(value)) value.forEach(add);
  else add(value);
  return out.slice(0, 8);
}

function availability(value: unknown) {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("instock") || v.includes("in_stock")) return "in_stock";
  if (v.includes("outofstock") || v.includes("out_of_stock")) return "out_of_stock";
  return "unknown";
}

function brand(value: unknown) {
  if (typeof value === "string") return clean(value) || null;
  if (value && typeof value === "object") return clean((value as Record<string, unknown>).name) || null;
  return null;
}

async function shortHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function safeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function authorize(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const configuredAutomationKey = Deno.env.get("AUTOMATION_WEBHOOK_KEY") ?? "";
  const suppliedAutomationKey = req.headers.get("x-automation-key") ?? "";

  if (configuredAutomationKey && suppliedAutomationKey === configuredAutomationKey) {
    return { ok: true, mode: "automation", status: 200, reason: "" };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authHeader) {
    return { ok: false, mode: "", status: 401, reason: "Authentication required" };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  const user = data.user;
  if (error || !user) return { ok: false, mode: "", status: 401, reason: "Invalid session" };

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: allowed, error: adminError } = await admin
    .from("automation_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !allowed) {
    return { ok: false, mode: "", status: 403, reason: "Admin access required" };
  }

  return { ok: true, mode: "user", status: 200, reason: "" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await authorize(req);
  if (!auth.ok) return json({ error: auth.reason }, auth.status);

  const body = (await req.json().catch(() => null)) as ImportBody | null;
  if (!body?.url) return json({ error: "url is required" }, 400);

  let url: URL;
  try {
    url = new URL(body.url);
  } catch {
    return json({ error: "Invalid URL" }, 400);
  }

  if (!["http:", "https:"].includes(url.protocol) || isBlockedHost(url.hostname)) {
    return json({ error: "URL is not allowed" }, 400);
  }

  let html = "";
  try {
    const response = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AbuKhaledDealsBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ar,en;q=0.8",
      },
    });
    if (!response.ok) throw new Error("Merchant returned HTTP " + response.status);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("Unsupported content type");
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > 2000000) throw new Error("Page is too large");
    html = (await response.text()).slice(0, 2000000);
  } catch (error) {
    return json({ error: "Could not fetch product page", detail: String(error) }, 422);
  }

  const objects = parseJsonLd(html);
  const product = findProduct(objects);
  const offer = firstOffer(product);
  const images = imageList(product?.image);
  const openGraphImage = meta(html, "og:image");
  if (openGraphImage && !images.includes(openGraphImage)) images.push(openGraphImage);

  const title = clean(product?.name) || meta(html, "og:title") ||
    clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  if (!title) return json({ error: "Could not identify a product title" }, 422);

  const description = clean(product?.description) || meta(html, "og:description") || meta(html, "description");
  const price = numeric(offer?.price) ?? numeric(offer?.lowPrice) ??
    numeric(meta(html, "product:price:amount")) ?? numeric(meta(html, "og:price:amount"));
  const oldPrice = numeric(meta(html, "product:original_price:amount"));
  const currency = clean(offer?.priceCurrency) || meta(html, "product:price:currency") ||
    meta(html, "og:price:currency") || null;
  const productId = clean(product?.sku) || clean(product?.productID) || clean(product?.mpn) ||
    await shortHash(url.toString());

  const host = url.hostname.replace(/^www\./, "");
  const provider = safeId(body.provider || "web") || "web";
  const id = body.offer_id || safeId(provider + "-" + productId);
  const storeId = safeId(body.store_id || host.split(".")[0] || host);
  const storeName = clean(body.store_name) || host;
  const discountPercent = price !== null && oldPrice !== null && oldPrice > price && oldPrice > 0
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : null;
  const now = new Date().toISOString();
  const sourceHash = await shortHash([
    title,
    price ?? "",
    oldPrice ?? "",
    currency ?? "",
    availability(offer?.availability),
    images[0] ?? "",
  ].join("|"));

  const row = {
    id,
    provider,
    provider_product_id: productId,
    store_id: storeId,
    store_name: storeName,
    store_logo: "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=128",
    title,
    description,
    country: clean(body.country),
    category: clean(body.category),
    brand: brand(product?.brand),
    product_url: url.toString(),
    affiliate_link: body.affiliate_link || url.toString(),
    coupon_code: clean(body.coupon_code),
    currency,
    price,
    old_price: oldPrice,
    discount_percent: discountPercent,
    discount_label: discountPercent ? "خصم " + discountPercent + "%" : "",
    original_price: oldPrice !== null ? [oldPrice, currency].filter(Boolean).join(" ") : "",
    deal_price: price !== null ? [price, currency].filter(Boolean).join(" ") : "",
    availability: availability(offer?.availability),
    gallery: images,
    highlights: Array.isArray(body.highlights) ? body.highlights.slice(0, 8) : [],
    verified: body.verified ?? false,
    featured: body.featured ?? false,
    active: true,
    expires: clean(body.expires),
    expires_at: body.expires_at || null,
    source_hash: sourceHash,
    source_updated_at: now,
    last_checked_at: now,
    last_check_status: "ok",
    last_check_error: null,
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server database credentials unavailable" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: previous } = await admin
    .from("affiliate_offers")
    .select("id,price,currency,source_hash")
    .eq("id", id)
    .maybeSingle();

  const changed = !!previous && String(previous.source_hash ?? "") !== sourceHash;
  const priceChanged = !!previous && previous.price !== null && price !== null &&
    Number(previous.price) !== Number(price);

  const { error: upsertError } = await admin.from("affiliate_offers").upsert(row, { onConflict: "id" });
  if (upsertError) return json({ error: upsertError.message }, 500);

  if (previous) {
    await admin.from("affiliate_offer_price_history").insert({
      offer_id: id,
      old_price: previous.price,
      new_price: price,
      currency: currency || previous.currency,
      changed: priceChanged,
      source: auth.mode,
    });
  }

  await admin.from("automation_events").insert({
    event_type: previous ? "offer_refresh" : "offer_import",
    offer_id: id,
    status: "ok",
    payload: {
      changed,
      price_changed: priceChanged,
      source: auth.mode,
      product_url: url.toString(),
    },
  });

  return json({
    ok: true,
    offer_id: id,
    imported: !previous,
    changed,
    price_changed: priceChanged,
    offer: row,
  });
});
