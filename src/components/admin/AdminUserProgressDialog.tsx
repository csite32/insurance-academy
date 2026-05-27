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
import { useUserProgressMap } from "@/hooks/useUserProgressMap";

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
  const progressByCourse = useUserProgressMap(
    userId,
    courses.map((course) => course.id)
  );

  const rows: CourseRow[] = useMemo(() => {
    if (!userId) return [];
    const assignedCourses = assignments
      .filter((a) => a.userId === userId)
      .map((a) => a.courseId);
    const assignedLessons = lessonAssignments
      .filter((la) => la.userId === userId)
      .map((la) => ({ courseId: la.courseId, lessonId: la.lessonId }));
    return computeUserCourseRows({
      courses,
      lessons,
      assignedCourses,
      assignedLessons,
      isAdmin: userRole === "admin",
      getProgress: (courseId) => progressByCourse[courseId] ?? null,
    });
  }, [userId, userRole, courses, lessons, assignments, lessonAssignments, progressByCourse]);

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