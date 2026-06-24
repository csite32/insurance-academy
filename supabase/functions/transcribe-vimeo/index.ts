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

    // Extract privacy hash if present: /VIDEO_ID/HASH or ?h=HASH
    const hash =
      vimeo_url.match(/vimeo\.com\/\d+\/([a-zA-Z0-9]+)/)?.[1] ??
      vimeo_url.match(/[?&]h=([a-zA-Z0-9]+)/)?.[1] ??
      null

    const configUrl = `https://player.vimeo.com/video/${vid}/config${hash ? `?h=${hash}` : ''}`
    const cfgRes = await fetch(configUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vimeo.com/' },
    })
    if (!cfgRes.ok) {
      return err(`לא ניתן לגשת לסרטון (${cfgRes.status}). ודאי שהסרטון פומבי או שהקישור כולל את ה-hash (למשל /123456789/abc123).`, 400)
    }
    const cfg = await cfgRes.json().catch(() => null) as
      | { request?: { files?: { progressive?: Array<{ url: string; width: number }>; hls?: { cdns?: Record<string, { url: string }>; default_cdn?: string } } } }
      | null

    const progressive = cfg?.request?.files?.progressive ?? []
    let fileUrl: string | null = null
    if (progressive.length) {
      fileUrl = progressive.sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0].url
    } else {
      // Fallback: extract audio segment from HLS master playlist
      const hls = cfg?.request?.files?.hls
      const masterUrl = hls?.cdns?.[hls?.default_cdn ?? '']?.url
      if (!masterUrl) {
        return err('לא נמצאו קבצי וידאו זמינים. ייתכן שהסרטון פרטי או שהגדרות הפרטיות חוסמות הטמעה.', 400)
      }
      // Parse master HLS to find an audio-only or lowest-bandwidth variant
      const master = await fetch(masterUrl).then((r) => r.text())
      const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1)
      // Prefer an EXT-X-MEDIA audio URI; else lowest STREAM-INF variant
      const audioMatch = master.match(/#EXT-X-MEDIA:[^\n]*TYPE=AUDIO[^\n]*URI="([^"]+)"/)
      let variantUrl: string
      if (audioMatch) {
        variantUrl = new URL(audioMatch[1], baseUrl).toString()
      } else {
        const streams = [...master.matchAll(/#EXT-X-STREAM-INF:[^\n]*BANDWIDTH=(\d+)[^\n]*\n([^\n]+)/g)]
        if (!streams.length) return err('פורמט הסרטון לא נתמך לתמלול.', 400)
        const lowest = streams.sort((a, b) => Number(a[1]) - Number(b[1]))[0]
        variantUrl = new URL(lowest[2].trim(), baseUrl).toString()
      }
      // Fetch variant playlist and concatenate segments up to ~24MB
      const variant = await fetch(variantUrl).then((r) => r.text())
      const variantBase = variantUrl.substring(0, variantUrl.lastIndexOf('/') + 1)
      const segs = variant.split('\n').filter((l) => l && !l.startsWith('#'))
      const chunks: Uint8Array[] = []
      let total = 0
      const MAX = 24 * 1024 * 1024
      for (const s of segs) {
        if (total >= MAX) break
        const buf = new Uint8Array(await fetch(new URL(s, variantBase).toString()).then((r) => r.arrayBuffer()))
        chunks.push(buf)
        total += buf.byteLength
      }
      if (!total) return err('הורדת הסרטון נכשלה.', 400)
      const merged = new Uint8Array(total)
      let off = 0
      for (const c of chunks) { merged.set(c, off); off += c.byteLength }
      const blob = new Blob([merged], { type: 'audio/mp4' })
      return await transcribe(blob, 'audio.m4a', groq_key)
    }

    const videoRes = await fetch(fileUrl!, { headers: { Range: 'bytes=0-25165823' } })
    const blob = new Blob([await videoRes.arrayBuffer()], { type: 'video/mp4' })
    return await transcribe(blob, 'video.mp4', groq_key)
  } catch (e) {
    return err(String(e), 500)
  }
})

async function transcribe(blob: Blob, filename: string, groqKey: string): Promise<Response> {
  const fd = new FormData()
  fd.append('file', blob, filename)
  fd.append('model', 'whisper-large-v3')
  fd.append('response_format', 'text')
  fd.append('language', 'he')
  const tRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: fd,
  })
  if (!tRes.ok) {
    const e = await tRes.json().catch(() => ({})) as { error?: { message?: string } }
    return err(`Groq Whisper: ${e?.error?.message ?? tRes.statusText}`, 400)
  }
  return json({ transcript: await tRes.text() })
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  const err = (error: string, _status?: number) => json({ error }, 200)