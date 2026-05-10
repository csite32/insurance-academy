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
      <div className="mt-5 max-w-xl">
        <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
          <span className="font-semibold text-primary">הושלם {percent}%</span>
          <span className="text-muted-foreground">
            {completed}/{total} שיעורים
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-gradient-to-l from-primary to-[hsl(var(--primary-glow))] transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%`, marginInlineStart: 0 }}
          />
        </div>
      </div>
    </div>
  </section>
);

export default CourseHeader;