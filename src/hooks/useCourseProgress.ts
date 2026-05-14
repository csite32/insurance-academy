import { useCallback, useEffect, useRef, useState } from "react";
import {
  listProgressForUserCourse,
  markLessonCompleted,
  unmarkLessonCompleted,
  getLastViewed,
  setLastViewed,
  subscribeProgress,
} from "@/lib/db/progressDb";

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

const empty = (userId: string, courseId: string): CourseProgress => ({
  userId,
  courseId,
  completedLessonIds: [],
  lastLessonId: null,
  status: "not_started",
  startedAt: null,
  completedAt: null,
});

const computeStatus = (
  completedCount: number,
  totalLessons: number
): CourseStatus => {
  if (totalLessons > 0 && completedCount >= totalLessons) return "completed";
  if (completedCount > 0) return "in_progress";
  return "not_started";
};

export function useCourseProgress(
  userId: string,
  courseId: string,
  totalLessons: number
) {
  const [progress, setProgress] = useState<CourseProgress>(() =>
    empty(userId, courseId)
  );
  const lastWrittenLessonRef = useRef<string | null>(null);

  const isGuest = !userId || userId === "guest";
  const isValidCourse = !!courseId && courseId !== "missing";

  // Keep latest totalLessons in a ref so we don't reload progress when it changes.
  const totalLessonsRef = useRef(totalLessons);
  useEffect(() => {
    totalLessonsRef.current = totalLessons;
    // Recompute status against new total without refetching.
    setProgress((p) => ({
      ...p,
      status: computeStatus(p.completedLessonIds.length, totalLessons),
    }));
  }, [totalLessons]);

  // Initial load + reload on user/course change ONLY.
  useEffect(() => {
    setProgress(empty(userId, courseId));
    lastWrittenLessonRef.current = null;
    if (isGuest || !isValidCourse) return;
    let cancelled = false;
    (async () => {
      try {
        const [rows, lv] = await Promise.all([
          listProgressForUserCourse(userId, courseId),
          getLastViewed(userId, courseId),
        ]);
        if (cancelled) return;
        const completedLessonIds = rows.map((r) => r.lessonId);
        const tl = totalLessonsRef.current;
        const startedAt =
          rows.length > 0
            ? rows.map((r) => r.completedAt).sort()[0] ?? null
            : null;
        console.info("[progress] initial load resolved", {
          user_id: userId,
          course_id: courseId,
          completedLessonIds,
          lastLessonId: lv?.lessonId ?? null,
          totalLessons: tl,
        });
        setProgress({
          userId,
          courseId,
          completedLessonIds,
          lastLessonId: lv?.lessonId ?? null,
          status: computeStatus(completedLessonIds.length, tl),
          startedAt,
          completedAt:
            tl > 0 && completedLessonIds.length >= tl
              ? rows.map((r) => r.completedAt).sort().slice(-1)[0] ?? null
              : null,
        });
        if (lv?.lessonId) lastWrittenLessonRef.current = lv.lessonId;
      } catch (err) {
        console.error("[progress] initial load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, courseId, isGuest, isValidCourse]);

  // Realtime: keep this user's progress in sync across tabs/devices
  useEffect(() => {
    if (isGuest || !userId || !isValidCourse) return;
    const refresh = async () => {
      try {
        const [rows, lv] = await Promise.all([
          listProgressForUserCourse(userId, courseId),
          getLastViewed(userId, courseId),
        ]);
        const completedLessonIds = rows.map((r) => r.lessonId);
        const tl = totalLessonsRef.current;
        console.info("[progress] realtime refresh resolved", {
          user_id: userId,
          course_id: courseId,
          completedLessonIds,
          lastLessonId: lv?.lessonId ?? null,
          totalLessons: tl,
        });
        setProgress((p) => ({
          ...p,
          completedLessonIds,
          lastLessonId: lv?.lessonId ?? p.lastLessonId,
          status: computeStatus(completedLessonIds.length, tl),
        }));
      } catch (err) {
        console.error("[progress] realtime refresh failed", err);
      }
    };
    const unsub = subscribeProgress(userId, refresh);
    return unsub;
  }, [userId, courseId, isGuest, isValidCourse]);

  const setLastLesson = useCallback(
    (lessonId: string) => {
      setProgress((p) => ({
        ...p,
        lastLessonId: lessonId,
        startedAt: p.startedAt ?? new Date().toISOString(),
        status: p.status === "completed" ? p.status : "in_progress",
      }));
      if (isGuest || !isValidCourse) return;
      if (lastWrittenLessonRef.current === lessonId) return;
      lastWrittenLessonRef.current = lessonId;
      void setLastViewed(userId, courseId, lessonId).catch((err) => {
        console.error("[progress] setLastViewed failed", err);
        // allow retry next time
        lastWrittenLessonRef.current = null;
      });
    },
    [userId, courseId, isGuest, isValidCourse]
  );

  const toggleComplete = useCallback(
    (lessonId: string) => {
      let willMark = false;
      setProgress((p) => {
        const has = p.completedLessonIds.includes(lessonId);
        willMark = !has;
        const completed = has
          ? p.completedLessonIds.filter((id) => id !== lessonId)
          : [...p.completedLessonIds, lessonId];
        const isAllDone =
          totalLessons > 0 && completed.length >= totalLessons;
        return {
          ...p,
          completedLessonIds: completed,
          status: isAllDone ? "completed" : "in_progress",
          completedAt: isAllDone ? new Date().toISOString() : null,
          startedAt: p.startedAt ?? new Date().toISOString(),
        };
      });
      if (isGuest || !isValidCourse) return;
      console.info("[progress] toggleComplete requested", {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        willMark,
      });
      const op = willMark
        ? markLessonCompleted(userId, courseId, lessonId)
        : unmarkLessonCompleted(userId, courseId, lessonId);
      void op.catch((err) => {
        console.error("[progress] toggleComplete write failed", {
          userId,
          courseId,
          lessonId,
          willMark,
          err,
        });
      });
    },
    [userId, courseId, totalLessons, isGuest, isValidCourse]
  );

  const markComplete = useCallback(
    (lessonId: string) => {
      let didAdd = false;
      setProgress((p) => {
        if (p.completedLessonIds.includes(lessonId)) return p;
        didAdd = true;
        const completed = [...p.completedLessonIds, lessonId];
        const isAllDone =
          totalLessons > 0 && completed.length >= totalLessons;
        return {
          ...p,
          completedLessonIds: completed,
          status: isAllDone ? "completed" : "in_progress",
          completedAt: isAllDone ? new Date().toISOString() : null,
          startedAt: p.startedAt ?? new Date().toISOString(),
        };
      });
      if (isGuest || !isValidCourse || !didAdd) return;
      console.info("[progress] markComplete requested", {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
      });
      void markLessonCompleted(userId, courseId, lessonId).catch((err) => {
        console.error("[progress] markComplete write failed", err);
      });
    },
    [userId, courseId, totalLessons, isGuest, isValidCourse]
  );

  const completedCount = progress.completedLessonIds.length;
  const percent =
    totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  return {
    progress,
    setLastLesson,
    toggleComplete,
    markComplete,
    completedCount,
    percent,
  };
}
