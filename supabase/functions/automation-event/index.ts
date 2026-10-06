import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-automation-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("AUTOMATION_WEBHOOK_KEY") ?? "";
  const supplied = req.headers.get("x-automation-key") ?? "";
  if (!expected || supplied !== expected) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => null) as null | {
    event_type?: string;
    offer_id?: string | null;
    status?: string;
    payload?: unknown;
  };
  if (!body?.event_type) return json({ error: "event_type is required" }, 400);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !service) return json({ error: "Server database credentials unavailable" }, 500);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("automation_events")
    .insert({
      event_type: String(body.event_type).slice(0, 100),
      offer_id: body.offer_id ? String(body.offer_id).slice(0, 120) : null,
      status: body.status ? String(body.status).slice(0, 50) : "ok",
      payload: body.payload && typeof body.payload === "object" ? body.payload : { value: body.payload ?? null },
    })
    .select("id,created_at")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, event: data });
});
