import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { vimeo_url, groq_key } = await req.json() as { vimeo_url?: string; groq_key?: string }
    if (!vimeo_url) return err('חסר קישור Vimeo', 400)
    if (!groq_key) return err('חסר Groq API Key', 400)

    const vid = vimeo_url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/)?.[1]
    if (!vid) return err('קישור Vimeo לא תקין', 400)

    const cfg = await fetch(`https://player.vimeo.com/video/${vid}/config`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vimeo.com/' },
    }).then((r) => r.json()).catch(() => null)

    const files: Array<{ url: string; width: number }> = cfg?.request?.files?.progressive ?? []
    if (!files.length) return err('לא נמצאו קבצי וידאו. ודאי שהסרטון נגיש להטמעה.', 400)

    const fileUrl = files.sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0].url

    const videoRes = await fetch(fileUrl, { headers: { Range: 'bytes=0-25165823' } })
    const blob = new Blob([await videoRes.arrayBuffer()], { type: 'video/mp4' })

    const fd = new FormData()
    fd.append('file', blob, 'video.mp4')
    fd.append('model', 'whisper-large-v3')
    fd.append('response_format', 'text')
    fd.append('language', 'he')

    const tRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groq_key}` },
      body: fd,
    })
    if (!tRes.ok) {
      const e = await tRes.json().catch(() => ({})) as { error?: { message?: string } }
      return err(`Groq Whisper: ${e?.error?.message ?? tRes.statusText}`, 400)
    }

    return json({ transcript: await tRes.text() })
  } catch (e) {
    return err(String(e), 500)
  }
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const err = (error: string, status: number) => json({ error }, status)