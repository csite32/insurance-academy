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
const PROTECTED_EMAIL = "c.site32@gmail.com";

type LaRow = { user_id: string; course_id: string; lesson_id: string; created_at: string };

// deno-lint-ignore no-explicit-any
function isNotFound(err: any): boolean {
  if (!err) return false;
  return err.status === 404 || /not.?found/i.test(err.message ?? "") || err.code === "user_not_found";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Auth + admin check
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

  // 2. Validation + self-delete block
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

  const removeAvatars = async () => {
    try {
      const { data: files } = await admin.storage.from("avatars").list(userId);
      if (files && files.length > 0) {
        const { error } = await admin.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
        if (error) console.error("avatar removal failed", userId, error.message);
      }
    } catch (e) {
      console.error("avatar removal failed", userId, e);
    }
  };

  // 3. Look up target
  const { data: targetUser, error: targetErr } = await admin.auth.admin.getUserById(userId);
  if (targetErr && !isNotFound(targetErr)) {
    console.error("getUserById failed", userId, targetErr.message);
    return json({ error: "אירעה שגיאה באיתור המשתמש. לא בוצעה מחיקה." }, 500);
  }
  const exists = !targetErr && !!targetUser?.user;

  if (!exists) {
    // Completion mode: account already gone — only clean residual rows for this id.
    const { error: sweepErr } = await admin.from("lesson_assignments").delete().eq("user_id", userId);
    if (sweepErr) {
      console.error("completion sweep failed", userId, sweepErr.message);
      return json({ error: "החשבון כבר אינו קיים, אך ניקוי השיוכים נכשל. נסה שוב." }, 500);
    }
    await removeAvatars();
    return json({ success: true, alreadyDeleted: true });
  }

  // 4. Primary admin protection (unchanged)
  if (targetUser.user.email?.trim().toLowerCase() === PROTECTED_EMAIL) {
    return json({ error: "לא ניתן למחוק את מנהל המערכת הראשי." }, 403);
  }

  // 5. Snapshot lesson_assignments
  const { data: snapshot, error: snapErr } = await admin
    .from("lesson_assignments")
    .select("user_id, course_id, lesson_id, created_at")
    .eq("user_id", userId);
  if (snapErr) {
    console.error("snapshot failed", userId, snapErr.message);
    return json({ error: "אירעה שגיאה בקריאת שיוכי המשתמש. לא בוצעה מחיקה." }, 500);
  }
  const rows = (snapshot ?? []) as LaRow[];

  const restore = async (): Promise<boolean> => {
    if (rows.length === 0) return true;
    const { error } = await admin.from("lesson_assignments").insert(rows);
    if (error) console.error("restore failed", userId, error.message);
    return !error;
  };

  // 6. Delete lesson_assignments
  const { error: laErr } = await admin.from("lesson_assignments").delete().eq("user_id", userId);
  if (laErr) {
    console.error("lesson_assignments delete failed", userId, laErr.message);
    return json({ error: "מחיקת שיוכי השיעורים נכשלה. המשתמש לא נמחק." }, 500);
  }

  // 7. Delete auth user
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error("auth deleteUser failed", userId, delErr.message);
    const ok = await restore();
    return json(
      {
        error: ok
          ? "מחיקת המשתמש נכשלה. המשתמש לא נמחק."
          : "מחיקת המשתמש נכשלה, ושחזור שיוכי השיעורים נכשל. יש לבדוק את שיוכי המשתמש.",
      },
      500
    );
  }

  // 8. Verify the account is gone
  const { data: check, error: checkErr } = await admin.auth.admin.getUserById(userId);
  if (checkErr && !isNotFound(checkErr)) {
    console.error("verification failed", userId, checkErr.message);
    return json({ error: "לא ניתן לאמת שהמשתמש נמחק. רענן את הרשימה ונסה שוב." }, 500);
  }
  if (!checkErr && check?.user) {
    console.error("user still exists after delete", userId);
    const ok = await restore();
    return json(
      {
        error: ok
          ? "המשתמש לא נמחק ממערכת ההתחברות. נסה שוב."
          : "המשתמש לא נמחק, ושחזור שיוכי השיעורים נכשל. יש לבדוק את שיוכי המשתמש.",
      },
      500
    );
  }

  // 9. Final sweep (rows inserted during deletion)
  const { error: sweepErr } = await admin.from("lesson_assignments").delete().eq("user_id", userId);
  if (sweepErr) {
    console.error("final sweep failed", userId, sweepErr.message);
    return json({ error: "החשבון נמחק אך נותרו שיוכים. נסה למחוק שוב." }, 500);
  }

  // 10. Avatars (best-effort)
  await removeAvatars();

  // 11. Success
  return json({ success: true });
});
