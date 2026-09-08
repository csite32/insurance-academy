import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Standalone: turns an existing lesson transcript into a short "תוכן השיעור"
// paragraph. Independent of generate-quiz — never produces or touches a quiz.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return json(
        { error: "מפתח GROQ_API_KEY לא הוגדר בשרת. יש להגדירו ב-Supabase Secrets." },
        500,
      );
    }

    const { transcript } = await req.json() as { transcript?: string };
    if (!transcript || !transcript.trim()) {
      return json({ error: "חסר תמלול ליצירת תוכן השיעור" }, 400);
    }

    const prompt = `בהתבסס אך ורק על התמלול הבא של שיעור, כתוב פסקת "תוכן השיעור" אחת בעברית תקינה, מקצועית וברורה, שמתארת בתמצית מה לומדים בשיעור.
כללים: 2-4 משפטים (מעט יותר רק אם מבנה התוכן מחייב). לא תמלול מקוצר מילה במילה. לא להמציא מידע שאינו מופיע בתמלול. מנוסחת להצגה לתלמיד בעמוד השיעור.
החזר JSON יחיד בלבד (וללא טקסט נוסף) בפורמט: {"lessonContent":"..."}

תמלול:
${transcript.slice(0, 6000)}`;

    const cRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!cRes.ok) {
      const errText = await cRes.text().catch(() => cRes.statusText);
      return json({ error: `Groq API החזיר שגיאה: ${errText.slice(0, 300)}` }, 400);
    }

    const cData = await cRes.json() as { choices: { message: { content: string } }[] };
    const raw = cData.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "תשובת ה-AI אינה JSON תקין" }, 400);
    }

    const lessonContent =
      parsed && typeof parsed === "object" &&
      typeof (parsed as Record<string, unknown>).lessonContent === "string"
        ? ((parsed as Record<string, unknown>).lessonContent as string).trim()
        : "";
    if (!lessonContent) {
      return json({ error: "ה-AI לא החזיר תוכן שיעור תקין" }, 400);
    }

    return json({ content: lessonContent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `שגיאה לא צפויה: ${msg.slice(0, 300)}` }, 500);
  }
});
