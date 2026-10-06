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
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await authorize(req);
  if (!auth.ok) return json({ error: auth.reason }, auth.status);

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
