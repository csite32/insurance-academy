import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStore, type AdminUser } from "@/data/adminStore";
import { getCourseAccess } from "@/lib/access";
import { calculateUnifiedCourseProgress } from "@/lib/progressMetrics";

type Props = {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
};

type ProgressRow = { course_id: string; lesson_id: string };
type LastViewedRow = { course_id: string; lesson_id: string; viewed_at: string };

const statusLabel = (s: "not_started" | "in_progress" | "completed") =>
  s === "completed" ? "הושלם" : s === "in_progress" ? "בתהליך" : "לא התחיל";

const statusClass = (s: "not_started" | "in_progress" | "completed") =>
  s === "completed"
    ? "bg-primary/10 text-primary"
    : s === "in_progress"
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    : "bg-muted text-muted-foreground";

const UserProgressDialog = ({ user, onOpenChange }: Props) => {
  const courses = useAdminStore((s) => s.courses);
  const lessons = useAdminStore((s) => s.lessons);
  const chapters = useAdminStore((s) => s.chapters);
  const assignments = useAdminStore((s) => s.assignments);
  const lessonAssignments = useAdminStore((s) => s.lessonAssignments);

  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [lastViewed, setLastViewed] = useState<LastViewedRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [p, lv] = await Promise.all([
        supabase
          .from("lesson_progress")
          .select("course_id,lesson_id")
          .eq("user_id", user.id),
        supabase
          .from("last_viewed")
          .select("course_id,lesson_id,viewed_at")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setProgress((p.data as ProgressRow[]) ?? []);
      setLastViewed((lv.data as LastViewedRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const userAssignedCourses = assignments
    .filter((a) => a.userId === user.id)
    .map((a) => a.courseId);
  const userAssignedLessons = lessonAssignments
    .filter((la) => la.userId === user.id)
    .map((la) => ({ courseId: la.courseId, lessonId: la.lessonId }));

  const accessibleCourseIds = Array.from(
    new Set<string>([
      ...userAssignedCourses,
      ...userAssignedLessons.map((l) => l.courseId),
    ])
  );

  const rows = accessibleCourseIds
    .map((cid) => {
      const course = courses.find((c) => c.id === cid);
      if (!course) return null;
      const access = getCourseAccess(
        cid,
        userAssignedCourses,
        userAssignedLessons,
        false
      );
      const courseChapters = chapters
        .filter((c) => c.courseId === cid)
        .sort((a, b) => a.order - b.order);
      const chapterOrder = new Map(courseChapters.map((c, i) => [c.id, i]));
      const courseLessons = lessons
        .filter((l) => l.courseId === cid)
        .sort((a, b) => {
          const ca = chapterOrder.get(a.chapterId) ?? 0;
          const cb = chapterOrder.get(b.chapterId) ?? 0;
          if (ca !== cb) return ca - cb;
          return a.order - b.order;
        });
      const available =
        access.kind === "full"
          ? courseLessons
          : access.kind === "partial"
          ? courseLessons.filter((l) => access.lessonIds.has(l.id))
          : [];
      const completedIds = progress
        .filter((p) => p.course_id === cid)
        .map((p) => p.lesson_id);
      const lv = lastViewed.find((x) => x.course_id === cid) ?? null;
      const metrics = calculateUnifiedCourseProgress(
        available.map((lesson) => ({ id: lesson.id, title: lesson.title })),
        completedIds,
        lv?.lesson_id ?? null
      );
      return {
        course,
        access,
        total: metrics.totalCount,
        done: metrics.completedCount,
        percent: metrics.progressPercent,
        lastLesson: metrics.lastViewedTitle,
        lastPosition: metrics.lastViewedIndex,
        hasLast: metrics.lastViewedIndex > 0,
        status: metrics.status,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">התקדמות - {user.fullName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            טוען נתונים...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            אין קורסים משויכים למשתמש זה.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pl-1">
            {rows.map((r) => (
              <div
                key={r.course.id}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{r.course.title}</div>
                  <div className="flex items-center gap-2">
                    {r.access.kind === "partial" && (
                      <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px]">
                        שיעורים נבחרים
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(
                        r.status
                      )}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${r.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {r.hasLast
                      ? `שיעור ${r.lastPosition} מתוך ${r.total} (${r.percent}%)`
                      : `לא התחיל · 0 מתוך ${r.total} (${r.percent}%)`}
                  </span>
                  <span>
                    שיעור אחרון:{" "}
                    {r.lastLesson ? (
                      <span className="text-foreground">{r.lastLesson}</span>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProgressDialog;