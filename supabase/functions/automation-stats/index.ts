import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-automation-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("AUTOMATION_WEBHOOK_KEY") ?? "";
  const supplied = req.headers.get("x-automation-key") ?? "";
  if (!expected || supplied !== expected) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !service) return json({ error: "Server database credentials unavailable" }, 500);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [activeOffers, events24h, priceChanges24h] = await Promise.all([
    admin.from("affiliate_offers").select("id", { count: "exact", head: true }).eq("active", true),
    admin.from("automation_events").select("id", { count: "exact", head: true }).gte("created_at", since),
    admin.from("affiliate_offer_price_history").select("id", { count: "exact", head: true }).eq("changed", true).gte("observed_at", since),
  ]);

  const { data: byTypeRows, error: typeError } = await admin
    .from("automation_events")
    .select("event_type")
    .gte("created_at", since)
    .limit(5000);

  if (activeOffers.error || events24h.error || priceChanges24h.error || typeError) {
    return json({
      error: activeOffers.error?.message ||
        events24h.error?.message ||
        priceChanges24h.error?.message ||
        typeError?.message ||
        "Unknown database error",
    }, 500);
  }

  const byType: Record<string, number> = {};
  for (const row of byTypeRows ?? []) {
    const key = String(row.event_type ?? "unknown");
    byType[key] = (byType[key] ?? 0) + 1;
  }

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    period_hours: 24,
    active_offers: activeOffers.count ?? 0,
    automation_events: events24h.count ?? 0,
    price_changes: priceChanges24h.count ?? 0,
    events_by_type: byType,
  });
});
