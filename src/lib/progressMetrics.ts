import type { CourseStatus } from "@/hooks/useCourseProgress";

export type CourseProgressMetrics = {
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
};

export function calculateCourseProgressMetrics(
  availableLessonIds: string[],
  completedLessonIds: string[]
): CourseProgressMetrics {
  const totalLessons = availableLessonIds.length;
  const availableSet = new Set(availableLessonIds);
  const completedLessons = Array.from(new Set(completedLessonIds)).filter((lessonId) =>
    availableSet.has(lessonId)
  ).length;

  return {
    totalLessons,
    completedLessons,
    progressPercent:
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
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