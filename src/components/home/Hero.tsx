import { ChevronLeft } from "lucide-react";
import HeroAnimatedVisual from "./HeroAnimatedVisual";

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