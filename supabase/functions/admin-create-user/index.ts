import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Body = {
  email?: string;
  password?: string;
  fullName?: string;
  role?: "user" | "admin";
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

  const callerId = claims.claims.sub as string;
  const admin = createClient(SUPABASE_URL, SERVICE);

  // verify caller is admin
  const { data: roleRows, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  if (roleErr) return json({ error: roleErr.message }, 500);
  const isAdmin = (roleRows ?? []).some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = (body.fullName ?? "").trim();
  const role: "user" | "admin" = body.role === "admin" ? "admin" : "user";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "אימייל לא תקין" }, 400);
  }
  if (!password || password.length < 6) {
    return json({ error: "סיסמה חייבת להיות לפחות 6 תווים" }, 400);
  }
  if (!fullName) {
    return json({ error: "שם מלא נדרש" }, 400);
  }

  // Create the auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "Failed to create user";
    const status = /already|exists|registered/i.test(msg) ? 409 : 400;
    return json(
      { error: status === 409 ? "משתמש עם אימייל זה כבר קיים" : msg },
      status
    );
  }

  const newId = created.user.id;

  // Upsert profile + role (handle_new_user trigger may already insert them)
  await admin
    .from("profiles")
    .upsert({ id: newId, full_name: fullName, email }, { onConflict: "id" });

  if (role === "admin") {
    await admin.from("user_roles").delete().eq("user_id", newId);
    await admin.from("user_roles").insert({ user_id: newId, role: "admin" });
  }

  return json({ id: newId, email, fullName, role });
});