import type { CourseStatus } from "@/hooks/useCourseProgress";

export type CourseProgressMetrics = {
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
};

export type AvailableLessonProgressItem = {
  id: string;
  title: string;
};

export type UnifiedCourseProgress = {
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  lastViewedIndex: number;
  lastViewedTitle: string | null;
  status: CourseStatus;
};

export function calculateUnifiedCourseProgress(
  availableLessons: AvailableLessonProgressItem[],
  completedLessonIds: string[],
  lastViewedLessonId: string | null
): UnifiedCourseProgress {
  const totalCount = availableLessons.length;
  const availableSet = new Set(availableLessons.map((lesson) => lesson.id));
  const completedCount = Array.from(new Set(completedLessonIds)).filter((lessonId) =>
    availableSet.has(lessonId)
  ).length;
  const lastViewedLesson =
    lastViewedLessonId
      ? availableLessons.find((lesson) => lesson.id === lastViewedLessonId) ?? null
      : null;
  const lastViewedIndex = lastViewedLesson
    ? availableLessons.findIndex((lesson) => lesson.id === lastViewedLesson.id) + 1
    : 0;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const status: CourseStatus =
    totalCount > 0 && completedCount >= totalCount
      ? "completed"
      : completedCount > 0 || lastViewedIndex > 0
        ? "in_progress"
        : "not_started";

  return {
    completedCount,
    totalCount,
    progressPercent,
    lastViewedIndex,
    lastViewedTitle: lastViewedLesson?.title ?? null,
    status,
  };
}

export function calculateCourseProgressMetrics(
  availableLessonIds: string[],
  completedLessonIds: string[]
): CourseProgressMetrics {
  const { totalCount, completedCount, progressPercent } = calculateUnifiedCourseProgress(
    availableLessonIds.map((id) => ({ id, title: "" })),
    completedLessonIds,
    null
  );

  return {
    totalLessons: totalCount,
    completedLessons: completedCount,
    progressPercent,
  };
}

export function getCourseProgressStatus(
  completedLessons: number,
  totalLessons: number
): CourseStatus {
  if (completedLessons === 0) return "not_started";
  if (totalLessons > 0 && completedLessons >= totalLessons) return "completed";
  return "in_progress";
}