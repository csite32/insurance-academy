import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, TrendingUp } from "lucide-react";
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
    { label: "קורסים פעילים", value: String(coursesCount), Icon: BookOpen },
    { label: "שיעורים שהושלמו", value: String(completedCount), Icon: CheckCircle2 },
    { label: "אחוז התקדמות כולל", value: `${overall}%`, Icon: TrendingUp },
  ];

  return (
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
};

export default StatsSection;