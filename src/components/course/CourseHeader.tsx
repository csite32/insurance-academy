import { Progress } from "@/components/ui/progress";

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
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>התקדמות בקורס</span>
          <span>
            {completed}/{total} שיעורים · {percent}%
          </span>
        </div>
        <Progress value={percent} />
      </div>
    </div>
  </section>
);

export default CourseHeader;