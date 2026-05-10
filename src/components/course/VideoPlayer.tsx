const VideoPlayer = ({ url, title }: { url: string; title: string }) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-card">
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <iframe
        src={url}
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