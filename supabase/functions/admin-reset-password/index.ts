import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BodySchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(72),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "אין לך הרשאה לבצע פעולה זו." }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return json({ error: "אין לך הרשאה לבצע פעולה זו." }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: roleRows, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", claims.claims.sub as string);
  if (roleErr) return json({ error: "אירעה שגיאה בבדיקת ההרשאות." }, 500);
  const isAdmin = (roleRows ?? []).some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) return json({ error: "אין לך הרשאה לבצע פעולה זו." }, 403);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "בקשה לא תקינה." }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    const pwIssue = parsed.error.issues.find((i) => i.path[0] === "password");
    if (pwIssue?.code === "too_small") {
      return json({ error: "הסיסמה חייבת להכיל לפחות 8 תווים." }, 400);
    }
    if (pwIssue?.code === "too_big") {
      return json({ error: "הסיסמה ארוכה מדי (עד 72 תווים)." }, 400);
    }
    return json({ error: "בקשה לא תקינה." }, 400);
  }

  const { userId, password } = parsed.data;
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    const code = (error as { code?: string }).code ?? "";
    const msg = error.message ?? "";
    if (code === "weak_password" || /weak|pwned|leaked|known|characters/i.test(msg)) {
      return json(
        { error: "הסיסמה אינה עומדת בדרישות האבטחה. יש לבחור סיסמה חזקה יותר." },
        400,
      );
    }
    if (/not found/i.test(msg)) return json({ error: "המשתמש לא נמצא." }, 404);
    return json({ error: "איפוס הסיסמה נכשל. נסה שוב." }, 400);
  }

  return json({ success: true });
});
