import type { LucideIcon } from "lucide-react";
import type { AdminCourse, AdminLesson, AdminLessonAssignment } from "@/data/adminStore";
import { getIcon } from "@/data/adminStore";
import { getCourseAccess } from "@/lib/access";
import type { CourseStatus } from "@/hooks/useCourseProgress";

export type CourseRow = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  totalLessons: number;
  completedLessons: number;
  percent: number;
  status: CourseStatus;
  lastLessonId: string | null;
  startedAt: string | null;
  accessKind: "full" | "partial";
};

export type ProgressSnapshot = {
  completedLessonIds: string[];
  lastLessonId: string | null;
  startedAt: string | null;
};

export type ComputeRowsInput = {
  courses: AdminCourse[];
  lessons: AdminLesson[];
  assignedCourses: string[];
  assignedLessons: AdminLessonAssignment[] | { courseId: string; lessonId: string }[];
  isAdmin: boolean;
  getProgress: (courseId: string) => ProgressSnapshot | null;
};

/**
 * Shared logic used by the user's profile page and the admin progress dialog.
 * Filters courses by access, restricts lessons to those available to the user,
 * and derives completed counts / percent / status from a progress snapshot.
 */
export function computeUserCourseRows({
  courses,
  lessons,
  assignedCourses,
  assignedLessons,
  isAdmin,
  getProgress,
}: ComputeRowsInput): CourseRow[] {
  return courses
    .filter((c) => c.status === "active")
    .map((c) => {
      const access = getCourseAccess(
        c.id,
        assignedCourses,
        assignedLessons as { courseId: string; lessonId: string }[],
        isAdmin
      );
      if (access.kind === "none") return null;
      const courseLessonIds = lessons
        .filter((l) => l.courseId === c.id)
        .map((l) => l.id);
      const availableIds =
        access.kind === "partial"
          ? courseLessonIds.filter((id) => access.lessonIds.has(id))
          : courseLessonIds;
      const totalLessons = availableIds.length;
      const p = getProgress(c.id);
      const completedLessons =
        p?.completedLessonIds.filter((id) => availableIds.includes(id)).length ?? 0;
      const percent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const status: CourseStatus =
        completedLessons === 0
          ? "not_started"
          : completedLessons >= totalLessons && totalLessons > 0
            ? "completed"
            : "in_progress";
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        icon: getIcon(c.iconKey),
        totalLessons,
        completedLessons,
        percent,
        status,
        lastLessonId: p?.lastLessonId ?? null,
        startedAt: p?.startedAt ?? null,
        accessKind: access.kind === "partial" ? "partial" : "full",
      } satisfies CourseRow;
    })
    .filter((r): r is CourseRow => r !== null);
}

export const statusLabel: Record<CourseStatus, string> = {
  not_started: "לא התחיל",
  in_progress: "בתהליך",
  completed: "הושלם",
};

export const statusClasses: Record<CourseStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-emerald-100 text-emerald-700",
};