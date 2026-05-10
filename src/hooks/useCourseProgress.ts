import { useCallback, useEffect, useState } from "react";

export type CourseStatus = "not_started" | "in_progress" | "completed";

export type CourseProgress = {
  userId: string;
  courseId: string;
  completedLessonIds: string[];
  lastLessonId: string | null;
  status: CourseStatus;
  startedAt: string | null;
  completedAt: string | null;
};

const storageKey = (userId: string, courseId: string) =>
  `progress:${userId}:${courseId}`;

const empty = (userId: string, courseId: string): CourseProgress => ({
  userId,
  courseId,
  completedLessonIds: [],
  lastLessonId: null,
  status: "not_started",
  startedAt: null,
  completedAt: null,
});

export function useCourseProgress(userId: string, courseId: string, totalLessons: number) {
  const [progress, setProgress] = useState<CourseProgress>(() => {
    if (typeof window === "undefined") return empty(userId, courseId);
    try {
      const raw = localStorage.getItem(storageKey(userId, courseId));
      return raw ? (JSON.parse(raw) as CourseProgress) : empty(userId, courseId);
    } catch {
      return empty(userId, courseId);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(userId, courseId), JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress, userId, courseId]);

  const setLastLesson = useCallback((lessonId: string) => {
    setProgress((p) => ({
      ...p,
      lastLessonId: lessonId,
      startedAt: p.startedAt ?? new Date().toISOString(),
      status: p.status === "completed" ? p.status : "in_progress",
    }));
  }, []);

  const toggleComplete = useCallback(
    (lessonId: string) => {
      setProgress((p) => {
        const has = p.completedLessonIds.includes(lessonId);
        const completed = has
          ? p.completedLessonIds.filter((id) => id !== lessonId)
          : [...p.completedLessonIds, lessonId];
        const isAllDone = completed.length >= totalLessons;
        return {
          ...p,
          completedLessonIds: completed,
          status: isAllDone ? "completed" : "in_progress",
          completedAt: isAllDone ? new Date().toISOString() : null,
          startedAt: p.startedAt ?? new Date().toISOString(),
        };
      });
    },
    [totalLessons]
  );

  const markComplete = useCallback(
    (lessonId: string) => {
      setProgress((p) => {
        if (p.completedLessonIds.includes(lessonId)) return p;
        const completed = [...p.completedLessonIds, lessonId];
        const isAllDone = completed.length >= totalLessons;
        return {
          ...p,
          completedLessonIds: completed,
          status: isAllDone ? "completed" : "in_progress",
          completedAt: isAllDone ? new Date().toISOString() : null,
          startedAt: p.startedAt ?? new Date().toISOString(),
        };
      });
    },
    [totalLessons]
  );

  const completedCount = progress.completedLessonIds.length;
  const percent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  return { progress, setLastLesson, toggleComplete, markComplete, completedCount, percent };
}