function toVimeoEmbedUrl(url: string): string {
  if (!url) return url;
  if (url.includes("player.vimeo.com/video/")) return url;
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/);
  if (m) {
    const [, id, hash] = m;
    return hash
      ? `https://player.vimeo.com/video/${id}?h=${hash}`
      : `https://player.vimeo.com/video/${id}`;
  }
  return url;
}

const VideoPlayer = ({ url, title }: { url: string; title: string }) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-card">
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <iframe
        src={toVimeoEmbedUrl(url)}
        title={title}
        className="absolute inset-0 h-full w-full"
        frameBorder={0}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  </div>
);

export default VideoPlayer;