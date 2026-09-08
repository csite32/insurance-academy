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

type QuizItem = { q: string; o: string[]; a: number; f?: string[] };

// Pull the quiz array out of whatever top-level shape the model returned:
// the combined object { lessonContent, quiz: [...] }, a legacy { questions: [...] },
// or a bare array. Returns null when no usable questions are present.
const extractQuiz = (parsed: unknown): QuizItem[] | null => {
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>).quiz ??
      (parsed as Record<string, unknown>).questions ??
      Object.values(parsed as Record<string, unknown>).find(Array.isArray)
    : null;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const ok = arr.every(
    (it) =>
      it &&
      typeof it === "object" &&
      typeof (it as QuizItem).q === "string" &&
      Array.isArray((it as QuizItem).o) &&
      (it as QuizItem).o.length >= 2,
  );
  return ok ? (arr as QuizItem[]) : null;
};

const extractLessonContent = (parsed: unknown): string =>
  !Array.isArray(parsed) &&
  parsed &&
  typeof parsed === "object" &&
  typeof (parsed as Record<string, unknown>).lessonContent === "string"
    ? ((parsed as Record<string, unknown>).lessonContent as string).trim()
    : "";

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
      return json({ error: "חסר תמלול ליצירת החידון" }, 400);
    }

    const prompt = `בהתבסס אך ורק על התמלול הבא של שיעור, החזר JSON יחיד (וללא טקסט נוסף) עם שני שדות: "lessonContent" ו-"quiz".

"lessonContent": פסקת "תוכן השיעור" בעברית תקינה, מקצועית וברורה, שמתארת בתמצית מה לומדים בשיעור. 2-4 משפטים (מעט יותר רק אם מבנה התוכן מחייב). לא תמלול מקוצר מילה במילה, לא להמציא מידע שאינו מופיע בתמלול, מנוסחת להצגה לתלמיד בעמוד השיעור.

"quiz": מערך של 5 שאלות רב-ברירה בעברית. כל פריט בפורמט {"q":"שאלה","o":["א","ב","ג","ד"],"a":0,"f":["פידבק א","פידבק ב","פידבק ג","פידבק ד"]}. a = אינדקס התשובה הנכונה (0-3). f = 4 פידבקים, אחד לכל תשובה. הכל בעברית.

פורמט התשובה:
{"lessonContent":"...","quiz":[{"q":"...","o":["...","...","...","..."],"a":0,"f":["...","...","...","..."]}]}

תמלול:
${transcript.slice(0, 6000)}`;

    const qRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    if (!qRes.ok) {
      const errText = await qRes.text().catch(() => qRes.statusText);
      return json({ error: `Groq API החזיר שגיאה: ${errText.slice(0, 300)}` }, 400);
    }

    const qData = await qRes.json() as { choices: { message: { content: string } }[] };
    const raw = qData.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "תשובת ה-AI אינה JSON תקין" }, 400);
    }

    const quiz = extractQuiz(parsed);
    if (!quiz) {
      return json({ error: "ה-AI לא החזיר שאלות חידון תקינות" }, 400);
    }
    const lessonContent = extractLessonContent(parsed);

    // `content` stays a JSON string parsed by the client exactly as before.
    // `questions` is kept as an alias of `quiz` so a client that predates this
    // change (reads `parsed.questions`) keeps working; new clients read `quiz`
    // and `lessonContent`.
    return json({ content: JSON.stringify({ questions: quiz, quiz, lessonContent }) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `שגיאה לא צפויה: ${msg.slice(0, 300)}` }, 500);
  }
});
