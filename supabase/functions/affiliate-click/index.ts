import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const couponId = String(body?.coupon_id ?? "").trim();
    const storeId = String(body?.store_id ?? "").trim();
    const destinationDomain = String(body?.destination_domain ?? "").trim().toLowerCase();
    const source = String(body?.source ?? "web").trim();
    const eventType = String(body?.event_type ?? "click").trim();

    if (!couponId || couponId.length > 100) throw new Error("invalid_coupon");
    if (!storeId || storeId.length > 80) throw new Error("invalid_store");
    if (!/^[a-z0-9.-]{3,180}$/i.test(destinationDomain)) throw new Error("invalid_domain");
    if (!["web", "android", "ios"].includes(source)) throw new Error("invalid_source");
    if (!["click", "copy", "view"].includes(eventType)) throw new Error("invalid_event");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const { error: insertError } = await supabase.from("affiliate_clicks").insert({
      user_id: userId,
      coupon_id: couponId,
      store_id: storeId,
      destination_domain: destinationDomain,
      source,
      event_type: eventType,
    });
    if (insertError) throw insertError;

    await supabase.rpc("increment_offer_metric", {
      p_offer_id: couponId,
      p_event_type: eventType,
    });

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
