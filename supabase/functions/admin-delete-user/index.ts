import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BodySchema = z.object({ userId: z.string().uuid() });
const NO_PERM = "אין לך הרשאה לבצע פעולה זו.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "בקשה לא תקינה." }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "בקשה לא תקינה." }, 400);
  const { userId } = parsed.data;

  if (userId === callerId) {
    return json({ error: "לא ניתן למחוק את החשבון שלך." }, 400);
  }

  // 1. lesson_assignments has no FK to auth.users — delete explicitly.
  const { error: laErr } = await admin.from("lesson_assignments").delete().eq("user_id", userId);
  if (laErr) return json({ error: "מחיקת שיוכי השיעורים נכשלה. נסה שוב." }, 500);

  // 2. Avatar files under "<userId>/" in the avatars bucket.
  const { data: files } = await admin.storage.from("avatars").list(userId);
  if (files && files.length > 0) {
    await admin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
  }

  // 3. Auth user — remaining linked rows are removed by existing ON DELETE CASCADE.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    if (/not found/i.test(error.message ?? "")) return json({ error: "המשתמש לא נמצא." }, 404);
    return json({ error: "מחיקת המשתמש נכשלה. נסה שוב." }, 500);
  }

  return json({ success: true });
});
