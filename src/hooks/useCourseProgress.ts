import { useCallback, useEffect, useRef, useState } from "react";
import {
  listProgressForUserCourse,
  markLessonCompleted as cloudMarkCompleted,
  unmarkLessonCompleted as cloudUnmarkCompleted,
  getLastViewed as cloudGetLastViewed,
  setLastViewed as cloudSetLastViewed,
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

const isGuestId = (userId: string) => !userId || userId === "guest";

export function useCourseProgress(userId: string, courseId: string, totalLessons: number) {
  const [progress, setProgress] = useState<CourseProgress>(() => {
    if (typeof window === "undefined") return empty(userId, courseId);
    // Don't seed from localStorage for guest/empty users — avoids flashing a
    // stale/zeroed snapshot before the real user id is ready.
    if (isGuestId(userId)) return empty(userId, courseId);
    try {
      const raw = localStorage.getItem(storageKey(userId, courseId));
      return raw ? (JSON.parse(raw) as CourseProgress) : empty(userId, courseId);
    } catch {
      return empty(userId, courseId);
    }
  });

  useEffect(() => {
    // Don't persist guest/empty progress to localStorage.
    if (isGuestId(userId)) return;
    try {
      localStorage.setItem(storageKey(userId, courseId), JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress, userId, courseId]);

  // Cloud hydration + one-time localStorage -> cloud migration
  const hydratedRef = useRef<string>("");
  useEffect(() => {
    if (isGuestId(userId) || !courseId) return;
    const key = `${userId}:${courseId}`;
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;

    let cancelled = false;
    (async () => {
      try {
        const [rows, lv] = await Promise.all([
          listProgressForUserCourse(userId, courseId),
          cloudGetLastViewed(userId),
        ]);
        if (cancelled) return;

        const cloudCompleted = rows.map((r) => r.lessonId);
        const cloudLastLesson =
          lv && lv.courseId === courseId ? lv.lessonId : null;

        // Read current local snapshot
        let local: CourseProgress | null = null;
        try {
          const raw = localStorage.getItem(storageKey(userId, courseId));
          local = raw ? (JSON.parse(raw) as CourseProgress) : null;
        } catch {
          local = null;
        }

        // One-time migration: cloud empty but local has data
        if (
          cloudCompleted.length === 0 &&
          local &&
          (local.completedLessonIds.length > 0 || local.lastLessonId)
        ) {
          try {
            await Promise.all([
              ...local.completedLessonIds.map((lid) =>
                cloudMarkCompleted(userId, courseId, lid)
              ),
              local.lastLessonId
                ? cloudSetLastViewed(userId, courseId, local.lastLessonId)
                : Promise.resolve(),
            ]);
          } catch {
            /* ignore migration errors, keep local */
          }
          // After migration local is the truth
          return;
        }

        // Otherwise: cloud is truth
        const isAllDone =
          totalLessons > 0 && cloudCompleted.length >= totalLessons;
        setProgress({
          userId,
          courseId,
          completedLessonIds: cloudCompleted,
          lastLessonId: cloudLastLesson ?? local?.lastLessonId ?? null,
          status: isAllDone
            ? "completed"
            : cloudCompleted.length > 0 || cloudLastLesson
            ? "in_progress"
            : "not_started",
          startedAt:
            local?.startedAt ??
            (cloudCompleted.length > 0 || cloudLastLesson
              ? new Date().toISOString()
              : null),
          completedAt: isAllDone
            ? local?.completedAt ?? new Date().toISOString()
            : null,
        });
      } catch {
        /* keep local state on error */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, courseId, totalLessons]);

  const setLastLesson = useCallback((lessonId: string) => {
    setProgress((p) => ({
      ...p,
      lastLessonId: lessonId,
      startedAt: p.startedAt ?? new Date().toISOString(),
      status: p.status === "completed" ? p.status : "in_progress",
    }));
    if (!isGuestId(userId) && courseId) {
      cloudSetLastViewed(userId, courseId, lessonId).catch((err) => {
        console.error("[useCourseProgress] setLastViewed failed", {
          userId,
          courseId,
          lessonId,
          error: err,
        });
      });
    }
  }, [userId, courseId]);

  const toggleComplete = useCallback(
    (lessonId: string) => {
      let willBeCompleted = false;
      setProgress((p) => {
        const has = p.completedLessonIds.includes(lessonId);
        willBeCompleted = !has;
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
      if (!isGuestId(userId) && courseId) {
        (willBeCompleted
          ? cloudMarkCompleted(userId, courseId, lessonId)
          : cloudUnmarkCompleted(userId, lessonId)
        ).catch((err) => {
          console.error("[useCourseProgress] toggleComplete failed", {
            userId,
            courseId,
            lessonId,
            willBeCompleted,
            error: err,
          });
        });
      }
    },
    [totalLessons, userId, courseId]
  );

  const markComplete = useCallback(
    (lessonId: string) => {
      let didAdd = false;
      setProgress((p) => {
        if (p.completedLessonIds.includes(lessonId)) return p;
        didAdd = true;
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
      if (didAdd && !isGuestId(userId) && courseId) {
        cloudMarkCompleted(userId, courseId, lessonId).catch((err) => {
          console.error("[useCourseProgress] markComplete failed", {
            userId,
            courseId,
            lessonId,
            error: err,
          });
        });
      }
    },
    [totalLessons, userId, courseId]
  );

  const completedCount = progress.completedLessonIds.length;
  const percent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  return { progress, setLastLesson, toggleComplete, markComplete, completedCount, percent };
}