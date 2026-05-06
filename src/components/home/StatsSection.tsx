import { BookOpen, CheckCircle2, TrendingUp } from "lucide-react";

const stats = [
  { label: "קורסים פעילים", value: "4", Icon: BookOpen },
  { label: "שיעורים שהושלמו", value: "27", Icon: CheckCircle2 },
  { label: "אחוז התקדמות כולל", value: "62%", Icon: TrendingUp },
];

const StatsSection = () => (
  <section className="container pb-4">
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map(({ label, value, Icon }) => (
        <div
          key={label}
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default StatsSection;