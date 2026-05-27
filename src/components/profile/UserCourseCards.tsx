import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { CourseRow } from "@/lib/courseRows";
import { statusClasses, statusLabel } from "@/lib/courseRows";

/**
 * Exact "My courses" cards grid used in the personal area (Profile).
 * Rendered as-is by both the personal area and the admin progress dialog
 * so the two views are pixel-identical for the same `rows` input.
 */
const UserCourseCards = ({ rows }: { rows: CourseRow[] }) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
        לא משויכים אליך כרגע קורסים.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {rows.map((row) => {
        const Icon = row.icon;
        const ctaLabel =
          row.status === "completed"
            ? "צפייה בקורס"
            : row.status === "in_progress"
              ? "המשך למידה"
              : "התחלת קורס";
        return (
          <article
            key={row.id}
            className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Icon className="h-6 w-6 text-foreground/80" strokeWidth={1.6} />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {row.accessKind === "partial" && (
                  <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold">
                    שיעורים נבחרים
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusClasses[row.status]}`}
                >
                  {statusLabel[row.status]}
                </span>
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold">{row.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {row.description}
            </p>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {row.completedLessons}/{row.totalLessons} שיעורים
              </span>
              <span className="font-semibold text-foreground">{row.percent}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all duration-700"
                style={{ width: `${row.percent}%` }}
              />
            </div>

            <Link
              to={`/course/${row.id}`}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 transition"
            >
              {ctaLabel}
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </article>
        );
      })}
    </div>
  );
};

export default UserCourseCards;