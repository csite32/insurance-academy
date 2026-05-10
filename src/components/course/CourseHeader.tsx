type Props = {
  title: string;
  description: string;
  completed: number;
  total: number;
  percent: number;
};

const CourseHeader = ({ title, description, completed, total, percent }: Props) => (
  <section className="border-b border-border bg-card">
    <div className="container py-8">
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p>
      <div className="mt-6 w-full rounded-2xl bg-[hsl(0_0%_11%)] p-5 text-white shadow-card">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-[hsl(var(--primary))]">
            הושלם {percent}%
          </span>
          <span className="text-white/80">
            {completed}/{total} שיעורים
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-gradient-to-l from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  </section>
);

export default CourseHeader;