import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminStore } from "@/data/adminStore";
import {
  computeUserCourseRows,
  type CourseRow,
} from "@/lib/courseRows";
import UserCourseCards from "@/components/profile/UserCourseCards";
import type { CourseProgress } from "@/hooks/useCourseProgress";

// Mirrors Profile.tsx's local `readProgress` exactly — same key, same shape.
const readProgress = (userId: string, courseId: string): CourseProgress | null => {
  try {
    const raw = localStorage.getItem(`progress:${userId}:${courseId}`);
    return raw ? (JSON.parse(raw) as CourseProgress) : null;
  } catch {
    return null;
  }
};

type Props = {
  userId: string | null;
  userName?: string;
  userRole?: "admin" | "user";
  onClose: () => void;
};

const AdminUserProgressDialog = ({ userId, userName, userRole, onClose }: Props) => {
  const courses = useAdminStore((s) => s.courses);
  const lessons = useAdminStore((s) => s.lessons);
  const assignments = useAdminStore((s) => s.assignments);
  const lessonAssignments = useAdminStore((s) => s.lessonAssignments);

  const rows: CourseRow[] = useMemo(() => {
    if (!userId) return [];
    // Exactly the same inputs Profile.tsx feeds into computeUserCourseRows,
    // but with the selected user's id instead of the logged-in user.
    const assignedCourses = assignments
      .filter((a) => a.userId === userId)
      .map((a) => a.courseId);
    const assignedLessons = lessonAssignments
      .filter((la) => la.userId === userId)
      .map((la) => ({ courseId: la.courseId, lessonId: la.lessonId }));
    // Debug: collect the localStorage progress snapshots that will be passed
    // into computeUserCourseRows so we can see whether they are populated.
    const progressData: Record<string, ReturnType<typeof readProgress>> = {};
    for (const c of courses) {
      progressData[c.id] = readProgress(userId, c.id);
    }
    const result = computeUserCourseRows({
      courses,
      lessons,
      assignedCourses,
      assignedLessons,
      isAdmin: userRole === "admin",
      getProgress: (courseId) => {
        const p = readProgress(userId, courseId);
        return p
          ? {
              completedLessonIds: p.completedLessonIds,
              lastLessonId: p.lastLessonId,
              startedAt: p.startedAt,
            }
          : null;
      },
    });
    // eslint-disable-next-line no-console
    console.log("[admin-progress] debug", {
      selectedUserId: userId,
      assignedCourses,
      assignedLessons,
      progressData,
      courseRows: result,
      localStorageKeys: Object.keys(localStorage).filter((k) =>
        k.startsWith(`progress:${userId}:`)
      ),
    });
    return result;
  }, [userId, userRole, courses, lessons, assignments, lessonAssignments]);

  const totalAvailable = rows.reduce((s, r) => s + r.totalLessons, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completedLessons, 0);
  const overall =
    totalAvailable > 0 ? Math.round((totalCompleted / totalAvailable) * 100) : 0;

  return (
    <Dialog open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="text-right max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            דוח התקדמות{userName ? ` — ${userName}` : ""}
          </DialogTitle>
        </DialogHeader>

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

          <UserCourseCards rows={rows} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserProgressDialog;