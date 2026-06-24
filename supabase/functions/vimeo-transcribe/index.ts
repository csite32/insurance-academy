import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractVideoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function parseCaptionFile(text: string): string {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line === "WEBVTT" || line.startsWith("NOTE")) continue;
    if (/^\d+$/.test(line)) continue;
    if (line.includes("-->")) continue;
    lines.push(line);
  }
  return lines.join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vimeo_url, vimeo_token } = await req.json();

    if (!vimeo_url) return json({ error: "חסר קישור Vimeo" }, 400);
    if (!vimeo_token) return json({ error: "חסר Vimeo API Token" }, 400);
    if (!vimeo_url.includes("vimeo.com") && !vimeo_url.includes("player.vimeo")) {
      return json({ error: "הקישור אינו קישור Vimeo תקין" }, 400);
    }

    const videoId = extractVideoId(vimeo_url);
    if (!videoId) return json({ error: "לא ניתן לחלץ את מזהה הסרטון מהקישור" }, 400);

    const ttRes = await fetch(`https://api.vimeo.com/videos/${videoId}/texttracks`, {
      headers: { Authorization: `Bearer ${vimeo_token}` },
    });

    if (ttRes.status === 401) return json({ error: "Vimeo Token לא תקין או פג תוקף" }, 400);
    if (!ttRes.ok) return json({ error: `Vimeo texttracks API החזיר קוד ${ttRes.status}` }, 400);

    const { data: tracks } = await ttRes.json();

    if (!tracks || tracks.length === 0) {
      return json({
        error:
          "לא נמצאו כתוביות אוטומטיות לסרטון זה.\nב-Vimeo: פתחי את הסרטון ← Advanced ← Captions ← Generate captions, המתיני מספר דקות ואז נסי שוב.",
      }, 400);
    }

    const score = (t: { language?: string; type?: string }) => {
      const lang = (t.language ?? "").toLowerCase();
      const kind = (t.type ?? "").toLowerCase();
      if (lang === "he" || lang === "iw") return 0;
      if (kind.includes("auto") || kind.includes("machine")) return 1;
      return 2;
    };
    tracks.sort((a: { language?: string; type?: string }, b: { language?: string; type?: string }) => score(a) - score(b));

    const captionUrl = tracks[0].link;
    if (!captionUrl) return json({ error: "לא נמצא קישור לקובץ הכתוביות" }, 400);

    const capRes = await fetch(captionUrl, {
      headers: { Authorization: `Bearer ${vimeo_token}` },
    });

    if (!capRes.ok) {
      return json({ error: `לא ניתן להוריד את קובץ הכתוביות (קוד ${capRes.status})` }, 400);
    }

    const transcript = parseCaptionFile(await capRes.text()).trim();
    if (!transcript) return json({ error: "קובץ הכתוביות ריק" }, 400);

    return json({ transcript });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `שגיאה לא צפויה: ${msg.slice(0, 300)}` }, 500);
  }
});