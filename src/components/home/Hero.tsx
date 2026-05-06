import { ChevronLeft, Headphones, ShieldCheck, Handshake, HeartPulse, Wallet } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="container grid gap-10 py-12 lg:grid-cols-2 lg:gap-8 lg:py-20">
        {/* Text */}
        <div className="order-2 lg:order-1 flex flex-col items-start justify-center text-right animate-fade-up">
          <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            האקדמיה הדיגיטלית
            <br />
            <span className="text-primary">לביטוח.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
            פלטפורמת הלמידה המתקדמת של מנדי גפנר סוכנות לביטוח — ידע מקצועי,
            נגיש ומסודר לעולם הביטוח הישראלי.
          </p>
          <a
            href="#courses"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            לכל הקורסים
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          </a>
        </div>

        {/* Visual */}
        <div className="order-1 lg:order-2 relative h-[360px] sm:h-[440px] lg:h-[520px]">
          <HeroVisual />
        </div>
      </div>

      {/* Decorative dots */}
      <div className="pointer-events-none absolute right-6 top-10 hidden lg:block">
        <DotsGrid />
      </div>
      <div className="pointer-events-none absolute left-6 bottom-10 hidden lg:block">
        <DotsGrid />
      </div>
    </section>
  );
};

const DotsGrid = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    {Array.from({ length: 5 }).map((_, r) =>
      Array.from({ length: 5 }).map((_, c) => (
        <circle key={`${r}-${c}`} cx={6 + c * 16} cy={6 + r * 16} r="2" fill="hsl(var(--border))" />
      ))
    )}
  </svg>
);

const FloatingIcon = ({
  Icon,
  className,
  delay = "0s",
}: {
  Icon: any;
  className: string;
  delay?: string;
}) => (
  <div
    className={`absolute flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-card animate-float ${className}`}
    style={{ animationDelay: delay }}
  >
    <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
  </div>
);

const HeroVisual = () => {
  return (
    <div className="relative h-full w-full">
      {/* Organic blobs */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 500 500" className="h-full w-full max-w-[520px]" aria-hidden>
          <defs>
            <radialGradient id="g-orange" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(var(--primary-dark))" stopOpacity="0.7" />
            </radialGradient>
            <radialGradient id="g-olive" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.4" />
            </radialGradient>
            <radialGradient id="g-light" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--accent-light))" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(var(--accent-light))" stopOpacity="0.35" />
            </radialGradient>
          </defs>

          {/* Blobs */}
          <ellipse cx="230" cy="200" rx="120" ry="155" fill="url(#g-orange)" transform="rotate(-20 230 200)" />
          <ellipse cx="170" cy="320" rx="120" ry="150" fill="url(#g-olive)" transform="rotate(15 170 320)" opacity="0.85" />
          <ellipse cx="290" cy="320" rx="115" ry="140" fill="url(#g-light)" transform="rotate(-10 290 320)" opacity="0.75" />

          {/* Connecting dashed paths with draw animation */}
          <g
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1"
            strokeDasharray="4 6"
            fill="none"
            opacity="0.55"
          >
            <path
              d="M 60 130 Q 180 50 260 90 T 440 140"
              style={{
                strokeDasharray: 800,
                strokeDashoffset: 800,
                animation: "draw 2.4s ease-out 0.2s forwards",
              }}
            />
            <path
              d="M 80 380 Q 200 460 320 430 T 460 380"
              style={{
                strokeDasharray: 800,
                strokeDashoffset: 800,
                animation: "draw 2.4s ease-out 0.5s forwards",
              }}
            />
            <path
              d="M 60 250 Q 180 230 250 260 T 460 250"
              style={{
                strokeDasharray: 800,
                strokeDashoffset: 800,
                animation: "draw 2.4s ease-out 0.8s forwards",
              }}
            />
          </g>

          {/* Anchor dots */}
          <circle cx="60" cy="130" r="4" fill="hsl(var(--primary))" />
          <circle cx="460" cy="380" r="4" fill="hsl(var(--accent))" />
        </svg>
      </div>

      {/* Floating icons */}
      <FloatingIcon Icon={Headphones} className="top-[8%] left-[42%]" delay="0s" />
      <FloatingIcon Icon={ShieldCheck} className="top-[28%] left-[6%]" delay="0.6s" />
      <FloatingIcon Icon={Handshake} className="top-[44%] right-[6%]" delay="1.2s" />
      <FloatingIcon Icon={HeartPulse} className="bottom-[10%] left-[14%]" delay="0.3s" />
      <FloatingIcon Icon={Wallet} className="bottom-[18%] right-[24%]" delay="0.9s" />
    </div>
  );
};

export default Hero;