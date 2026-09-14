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

    const prompt = `בהתבסס אך ורק על התמלול הבא של שיעור, כתוב "תוכן השיעור" בעברית תקינה, מקצועית וברורה, שמתאר בתמצית מה לומדים בשיעור. התוכן מוצג לתלמיד בעמוד השיעור בעורך תוכן עשיר.

כללי תוכן:
- לא תמלול מקוצר מילה במילה. אסור להמציא מידע שאינו מופיע בתמלול — השתמש אך ורק במידע מהתמלול.
- תמציתי, מקצועי וברור.
- חלק לפסקאות בצורה טבעית.
- אם 2-3 פסקאות עם מספר הדגשות הן המבנה המתאים ביותר — השאר כך. אל תייצר כותרות או רשימות בכוח ואל תעבוד לפי תבנית קבועה.
- השתמש בכותרת משנה <h3> רק כאשר יש בתוכן חלוקה אמיתית לנושאים.
- השתמש ברשימת בולטים <ul><li> רק כאשר קיימת רשימה טבעית של נקודות, שלבים או עקרונות.
- הדגש מושגים ומשפטים חשובים עם <strong>.

פורמט הפלט:
- החזר JSON יחיד בלבד (ולא טקסט נוסף) בפורמט: {"lessonContent":"..."}
- ערך lessonContent הוא HTML שמכיל אך ורק את התגים הבאים: <p>, <strong>, <h3>, <ul>, <li>. ללא תגים אחרים, ללא style, ללא class.

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
