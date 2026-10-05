import { ChevronLeft } from "lucide-react";
import HeroAnimatedVisual from "./HeroAnimatedVisual";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="container grid gap-10 py-12 lg:grid-cols-2 lg:gap-8 lg:py-20">
        {/* Text */}
        <div className="order-2 lg:order-1 flex flex-col items-start justify-center text-right animate-fade-up">
          <h1 className="text-4xl font-bold leading-[1.08] text-foreground sm:text-5xl lg:text-6xl">
            <span className="hero-line-mask block">
              <span className="hero-line-rise block" style={{ animationDelay: "0.05s" }}>
                האקדמיה הדיגיטלית
              </span>
            </span>
            <span className="hero-line-mask block">
              <span className="hero-line-rise block text-primary" style={{ animationDelay: "0.22s" }}>
                לביטוח.
              </span>
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
            פלטפורמת הלמידה המתקדמת של מנדי גפנר סוכנות לביטוח — ידע מקצועי,
            נגיש ומסודר לעולם הביטוח הישראלי.
          </p>
          <a
            href="#courses"
            className="course-action-button group/course-action mt-8 inline-flex w-auto items-center justify-center text-base font-semibold"
          >
            <span className="course-action-button__label">לכל הקורסים</span>
            <span className="course-action-button__pill" aria-hidden="true">
              <ChevronLeft className="course-action-button__icon" />
            </span>
          </a>
        </div>

        {/* Visual */}
        <div className="order-1 lg:order-2 relative h-[360px] sm:h-[440px] lg:h-[520px]">
          <HeroAnimatedVisual />
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

export default Hero;