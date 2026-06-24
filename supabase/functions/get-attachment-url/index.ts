import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PUBLIC_URL_RE = /\/storage\/v1\/object\/public\/lesson-attachments\/(.+)$/;

function extractPath(raw: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("storage:")) return raw.slice("storage:".length);
  const m = raw.match(PUBLIC_URL_RE);
  if (m) {
    try { return decodeURIComponent(m[1]); } catch { return m[1]; }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthenticated" }, 200);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthenticated" }, 200);
    const userId = userData.user.id;

    let body: { lessonId?: string; path?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 200);
    }
    const lessonId = (body?.lessonId ?? "").toString().trim();
    const reqPath = (body?.path ?? "").toString().trim();
    if (!lessonId || !reqPath) return json({ error: "Missing lessonId or path" }, 200);
    if (reqPath.includes("..") || reqPath.startsWith("/")) {
      return json({ error: "Invalid path" }, 200);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;

    const { data: lesson, error: lErr } = await admin
      .from("lessons")
      .select("id, course_id, is_locked, attachments")
      .eq("id", lessonId)
      .maybeSingle();
    if (lErr || !lesson) return json({ error: "Lesson not found" }, 200);

    const attachments: string[] = (lesson.attachments as string[]) ?? [];
    const knownPaths = new Set<string>();
    for (const raw of attachments) {
      try {
        const obj = raw.trim().startsWith("{") ? JSON.parse(raw) : null;
        const url = obj?.url ?? raw;
        const p = extractPath(url);
        if (p) knownPaths.add(p);
      } catch {
        const p = extractPath(raw);
        if (p) knownPaths.add(p);
      }
    }
    if (!knownPaths.has(reqPath)) {
      return json({ error: "Path does not belong to lesson" }, 200);
    }

    if (!isAdmin) {
      const { data: laRow } = await admin
        .from("lesson_assignments")
        .select("lesson_id")
        .eq("user_id", userId)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      const hasLessonAssignment = !!laRow;

      let allowed = false;
      if (lesson.is_locked) {
        allowed = hasLessonAssignment;
      } else if (hasLessonAssignment) {
        allowed = true;
      } else {
        const { data: aRow } = await admin
          .from("assignments")
          .select("course_id")
          .eq("user_id", userId)
          .eq("course_id", lesson.course_id)
          .maybeSingle();
        allowed = !!aRow;
      }
      if (!allowed) return json({ error: "Forbidden" }, 200);
    }

    const { data: signed, error: sErr } = await admin.storage
      .from("lesson-attachments")
      .createSignedUrl(reqPath, 300);
    if (sErr || !signed?.signedUrl) {
      return json({ error: sErr?.message ?? "Failed to sign" }, 200);
    }
    return json({ url: signed.signedUrl }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 200);
  }
});