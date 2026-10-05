import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const NO_PERM = "אין לך הרשאה לבצע פעולה זו.";

// Read-only: returns only { id, lastSignInAt } per auth user, admin-only.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: NO_PERM }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  const callerId = claims?.claims?.sub as string | undefined;
  if (claimsErr || !callerId) return json({ error: NO_PERM }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: roleRows, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  if (roleErr) return json({ error: "אירעה שגיאה בבדיקת ההרשאות." }, 500);
  if (!(roleRows ?? []).some((r: { role: string }) => r.role === "admin")) {
    return json({ error: NO_PERM }, 403);
  }

  const users: { id: string; lastSignInAt: string | null }[] = [];
  const perPage = 1000;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("listUsers failed", error.message);
      return json({ error: "טעינת נתוני הכניסה נכשלה." }, 500);
    }
    for (const u of data.users) {
      users.push({ id: u.id, lastSignInAt: u.last_sign_in_at ?? null });
    }
    if (data.users.length < perPage) break;
  }

  return json({ users });
});
