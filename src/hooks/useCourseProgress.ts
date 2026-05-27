import { useCallback, useEffect, useRef, useState } from "react";
import {
  listProgressForUserCourse,
  markLessonCompleted as cloudMarkCompleted,
  unmarkLessonCompleted as cloudUnmarkCompleted,
  getLastViewedForCourse as cloudGetLastViewedForCourse,
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
  const [progress, setProgress] = useState<CourseProgress>(() => empty(userId, courseId));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(userId, courseId), JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress, userId, courseId]);

  // DB hydration + one-time localStorage -> DB migration
  const hydratedRef = useRef<string>("");
  useEffect(() => {
    if (isGuestId(userId) || !courseId) return;
    const key = `${userId}:${courseId}`;
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;

    let cancelled = false;
    (async () => {
      try {
        const loadFromDb = () =>
          Promise.all([
            listProgressForUserCourse(userId, courseId),
            cloudGetLastViewedForCourse(userId, courseId),
          ]);

        let [rows, lv] = await loadFromDb();
        if (cancelled) return;

        const cloudCompleted = rows.map((r) => r.lessonId);
        const cloudLastLesson = lv?.lessonId ?? null;

        // Read current local snapshot
        let local: CourseProgress | null = null;
        try {
          const raw = localStorage.getItem(storageKey(userId, courseId));
          local = raw ? (JSON.parse(raw) as CourseProgress) : null;
        } catch {
          local = null;
        }

        // One-time migration: DB empty but local has data
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
          if (cancelled) return;

          [rows, lv] = await loadFromDb();
          if (cancelled) return;
        }

        const finalCompleted = rows.map((r) => r.lessonId);
        const finalLastLesson = lv?.lessonId ?? null;
        const isAllDone = totalLessons > 0 && finalCompleted.length >= totalLessons;
        const startedAt =
          local?.startedAt ??
          (finalCompleted.length > 0 || finalLastLesson ? new Date().toISOString() : null);
        setProgress({
          userId,
          courseId,
          completedLessonIds: finalCompleted,
          lastLessonId: finalLastLesson,
          status: isAllDone
            ? "completed"
            : finalCompleted.length > 0 || finalLastLesson
            ? "in_progress"
            : "not_started",
          startedAt,
          completedAt: isAllDone
            ? local?.completedAt ?? new Date().toISOString()
            : null,
        });
      } catch {
        try {
          const raw = localStorage.getItem(storageKey(userId, courseId));
          const local = raw ? (JSON.parse(raw) as CourseProgress) : null;
          if (local && !cancelled) {
            setProgress(local);
          }
        } catch {
          /* keep current state on error */
        }
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
      cloudSetLastViewed(userId, courseId, lessonId).catch(() => {});
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
        ).catch(() => {});
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
        cloudMarkCompleted(userId, courseId, lessonId).catch(() => {});
      }
    },
    [totalLessons, userId, courseId]
  );

  const completedCount = progress.completedLessonIds.length;
  const percent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  return { progress, setLastLesson, toggleComplete, markComplete, completedCount, percent };
}