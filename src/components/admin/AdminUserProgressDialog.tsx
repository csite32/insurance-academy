import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminStore } from "@/data/adminStore";
import {
  computeUserCourseRows,
  statusClasses,
  statusLabel,
  type CourseRow,
  type ProgressSnapshot,
} from "@/lib/courseRows";
import {
  listProgressForUser,
  type DbLessonProgress,
} from "@/lib/db/progressDb";
import { supabase } from "@/integrations/supabase/client";

type LastViewedRow = { course_id: string; lesson_id: string; viewed_at: string };

type Props = {
  userId: string | null;
  userName?: string;
  onClose: () => void;
};

const AdminUserProgressDialog = ({ userId, userName, onClose }: Props) => {
  const courses = useAdminStore((s) => s.courses);
  const lessons = useAdminStore((s) => s.lessons);
  const assignments = useAdminStore((s) => s.assignments);
  const lessonAssignments = useAdminStore((s) => s.lessonAssignments);

  const [loading, setLoading] = useState(false);
  const [progressRows, setProgressRows] = useState<DbLessonProgress[]>([]);
  const [lastViewedByCourse, setLastViewedByCourse] = useState<Map<string, string>>(
    new Map()
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      listProgressForUser(userId),
      supabase
        .from("last_viewed")
        .select("course_id, lesson_id, viewed_at")
        .eq("user_id", userId),
    ])
      .then(([p, lvRes]) => {
        if (cancelled) return;
        if (lvRes.error) throw lvRes.error;
        setProgressRows(p);
        const m = new Map<string, string>();
        ((lvRes.data ?? []) as LastViewedRow[]).forEach((r) => {
          m.set(r.course_id, r.lesson_id);
        });
        setLastViewedByCourse(m);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[admin-progress] load failed", e);
          setError(e instanceof Error ? e.message : "שגיאה בטעינת נתונים");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const rows: CourseRow[] = useMemo(() => {
    if (!userId) return [];
    const assignedCourses = assignments
      .filter((a) => a.userId === userId)
      .map((a) => a.courseId);
    const assignedLessons = lessonAssignments
      .filter((la) => la.userId === userId)
      .map((la) => ({ courseId: la.courseId, lessonId: la.lessonId }));
    const progressByCourse = new Map<string, ProgressSnapshot>();
    for (const r of progressRows) {
      const cur = progressByCourse.get(r.courseId) ?? {
        completedLessonIds: [],
        lastLessonId: null,
        startedAt: null,
      };
      cur.completedLessonIds.push(r.lessonId);
      if (!cur.startedAt || r.completedAt < cur.startedAt) cur.startedAt = r.completedAt;
      progressByCourse.set(r.courseId, cur);
    }
    lastViewedByCourse.forEach((lessonId, courseId) => {
      const cur = progressByCourse.get(courseId) ?? {
        completedLessonIds: [],
        lastLessonId: null,
        startedAt: null,
      };
      cur.lastLessonId = lessonId;
      progressByCourse.set(courseId, cur);
    });
    return computeUserCourseRows({
      courses,
      lessons,
      assignedCourses,
      assignedLessons,
      isAdmin: false,
      getProgress: (courseId) => progressByCourse.get(courseId) ?? null,
    });
  }, [userId, courses, lessons, assignments, lessonAssignments, progressRows, lastViewedByCourse]);

  const lessonTitleById = useMemo(() => {
    const m = new Map<string, string>();
    lessons.forEach((l) => m.set(l.id, l.title));
    return m;
  }, [lessons]);

  const totalAvailable = rows.reduce((s, r) => s + r.totalLessons, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completedLessons, 0);
  const overall =
    totalAvailable > 0 ? Math.round((totalCompleted / totalAvailable) * 100) : 0;

  return (
    <Dialog open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="text-right max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            דוח התקדמות{userName ? ` — ${userName}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin ml-2" />
            טוען נתונים...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-6">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            למשתמש זה לא משויכים קורסים פעילים.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">התקדמות כוללת</p>
                <p className="text-2xl font-extrabold text-foreground">{overall}%</p>
                <p className="text-xs text-muted-foreground">
                  {totalCompleted} מתוך {totalAvailable} שיעורים זמינים
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {rows.length} קורסים משויכים
              </div>
            </div>

            <div className="space-y-3">
              {rows.map((row) => {
                const Icon = row.icon;
                const lastTitle = row.lastLessonId
                  ? lessonTitleById.get(row.lastLessonId)
                  : null;
                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
                          <Icon className="h-5 w-5 text-foreground/80" strokeWidth={1.6} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold truncate">{row.title}</h3>
                          {lastTitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              שיעור אחרון: {lastTitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                        {row.accessKind === "partial" && (
                          <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-semibold">
                            שיעורים נבחרים
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusClasses[row.status]}`}
                        >
                          {statusLabel[row.status]}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserProgressDialog;