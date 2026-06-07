import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Award, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStore, useAdminStoreHydration } from "@/data/adminStore";
import { computeUserCourseRows } from "@/lib/courseRows";
import { listProgressForUser } from "@/lib/db/progressDb";

const StatsSection = () => {
  useAdminStoreHydration();
  const { user } = useAuth();
  const adminCourses = useAdminStore((s) => s.courses);
  const adminLessons = useAdminStore((s) => s.lessons);
  const [completedByCourse, setCompletedByCourse] = useState<Map<string, string[]>>(
    new Map()
  );
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    if (!user || user.id === "guest") {
      setCompletedByCourse(new Map());
      setDbLoaded(true);
      return;
    }
    let cancelled = false;
    setDbLoaded(false);
    listProgressForUser(user.id)
      .then((rows) => {
        if (cancelled) return;
        const m = new Map<string, string[]>();
        for (const r of rows) {
          const arr = m.get(r.courseId) ?? [];
          arr.push(r.lessonId);
          m.set(r.courseId, arr);
        }
        setCompletedByCourse(m);
      })
      .catch((err) => console.error("[StatsSection] progress fetch failed", err))
      .finally(() => {
        if (!cancelled) setDbLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const { coursesCount, completedCount, overall } = useMemo(() => {
    if (!user || !dbLoaded) {
      return { coursesCount: 0, completedCount: 0, overall: 0 };
    }
    const rows = computeUserCourseRows({
      courses: adminCourses,
      lessons: adminLessons,
      assignedCourses: user.assignedCourses ?? [],
      assignedLessons: user.assignedLessons ?? [],
      isAdmin: user.role === "admin",
      getProgress: (courseId) => {
        const ids = completedByCourse.get(courseId);
        if (!ids) return null;
        return { completedLessonIds: ids, lastLessonId: null, startedAt: null };
      },
    });
    const totalLessons = rows.reduce((s, r) => s + r.totalLessons, 0);
    const totalCompleted = rows.reduce((s, r) => s + r.completedLessons, 0);
    return {
      coursesCount: rows.length,
      completedCount: totalCompleted,
      overall:
        totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0,
    };
  }, [user, adminCourses, adminLessons, completedByCourse, dbLoaded]);

  const stats = [
    {
      label: "קורסים פעילים",
      sub: "סה״כ הקורסים שלך באקדמיה",
      value: String(coursesCount),
      Icon: BookOpenText,
      tint: "primary" as const,
    },
    {
      label: "שיעורים שהושלמו",
      sub: "ההישגים שצברת עד כה",
      value: String(completedCount),
      Icon: Award,
      tint: "accent" as const,
    },
    {
      label: "אחוז התקדמות כולל",
      sub: "הקצב הכללי של הלמידה שלך",
      value: `${overall}%`,
      Icon: TrendingUp,
      tint: "primary" as const,
    },
  ];

  return (
    <section className="container pb-6 pt-2">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-primary" />
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            ההתקדמות האישית שלך
          </h2>
          <span className="h-px w-10 bg-primary" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          תמונת מצב קצרה של הלמידה שלך באקדמיה
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, sub, value, Icon, tint }) => {
          const isAccent = tint === "accent";
          return (
            <div
              key={label}
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] border border-primary/20 bg-card p-7 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover"
            >
              {/* Decorative dots */}
              <div aria-hidden className="pointer-events-none absolute left-6 top-6 flex gap-1.5 opacity-50">
                <span className="h-1 w-1 rounded-full bg-primary/60" />
                <span className="h-1 w-1 rounded-full bg-accent/60" />
                <span className="h-1 w-1 rounded-full bg-primary/30" />
              </div>
              {/* Decorative thin line */}
              <div aria-hidden className="pointer-events-none absolute bottom-5 left-6 right-6 h-px bg-gradient-to-l from-transparent via-primary/20 to-transparent" />

              <div className="relative flex h-full flex-row-reverse items-center gap-5">
                {/* Icon cluster (left side in RTL) */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                  {/* Solid icon medallion */}
                  <span
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-sm ring-4 ring-card ${
                      isAccent
                        ? "bg-gradient-to-br from-accent to-accent-light"
                        : "bg-gradient-primary"
                    }`}
                  >
                    <Icon className="h-7 w-7 text-primary-foreground" strokeWidth={1.9} />
                  </span>
                </div>

                {/* Text block (right side in RTL) */}
                <div className="relative flex min-w-0 flex-1 flex-col text-right">
                  <span className="text-5xl font-bold leading-none tracking-tight text-foreground sm:text-[3.25rem]">
                    {value}
                  </span>
                  <span className="mt-3 text-base font-semibold text-foreground/90">
                    {label}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {sub}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StatsSection;