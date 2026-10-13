import { useEffect, useRef } from "react";
import Player from "@vimeo/player";
import { markActivity } from "@/lib/idleTracker";

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

const VideoPlayer = ({ url, title }: { url: string; title: string }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const src = toVimeoEmbedUrl(url);

  // Count playback as activity only while the playhead actually advances.
  useEffect(() => {
    const el = ref.current;
    if (!el || !src.includes("player.vimeo.com")) return;
    let player: Player | null = null;
    let lastSeconds = -1;
    try {
      player = new Player(el);
      player.on("timeupdate", (d: { seconds: number }) => {
        if (d.seconds > lastSeconds && lastSeconds >= 0) markActivity();
        lastSeconds = d.seconds;
      });
      player.on("seeked", (d: { seconds: number }) => {
        lastSeconds = d.seconds;
      });
    } catch {
      player = null;
    }
    return () => {
      player?.off("timeupdate");
      player?.off("seeked");
    };
  }, [src]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-card">
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          ref={ref}
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          frameBorder={0}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
