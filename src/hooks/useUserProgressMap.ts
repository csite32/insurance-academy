import { useEffect, useMemo, useState } from "react";
import {
  listLastViewedForUser,
  listProgressForUser,
  markLessonCompleted,
  setLastViewed,
  type DbLastViewed,
  type DbLessonProgress,
} from "@/lib/db/progressDb";
import type { CourseProgress } from "@/hooks/useCourseProgress";

const storageKey = (userId: string, courseId: string) => `progress:${userId}:${courseId}`;

const readLocalProgress = (userId: string, courseId: string): CourseProgress | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId, courseId));
    return raw ? (JSON.parse(raw) as CourseProgress) : null;
  } catch {
    return null;
  }
};

const toIsoMin = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
};

const toIsoMax = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
};

const buildProgressMap = (
  userId: string,
  courseIds: string[],
  rows: DbLessonProgress[],
  lastViewedRows: DbLastViewed[]
): Record<string, CourseProgress> => {
  const map: Record<string, CourseProgress> = {};

  for (const row of rows) {
    const current =
      map[row.courseId] ??
      {
        userId,
        courseId: row.courseId,
        completedLessonIds: [],
        lastLessonId: null,
        status: "not_started",
        startedAt: null,
        completedAt: null,
      };

    current.completedLessonIds = current.completedLessonIds.includes(row.lessonId)
      ? current.completedLessonIds
      : [...current.completedLessonIds, row.lessonId];
    current.startedAt = toIsoMin(current.startedAt, row.completedAt);
    current.completedAt = toIsoMax(current.completedAt, row.completedAt);
    current.status = "in_progress";
    map[row.courseId] = current;
  }

  for (const row of lastViewedRows) {
    const current =
      map[row.courseId] ??
      {
        userId,
        courseId: row.courseId,
        completedLessonIds: [],
        lastLessonId: null,
        status: "not_started",
        startedAt: null,
        completedAt: null,
      };

    current.lastLessonId = row.lessonId;
    current.startedAt = toIsoMin(current.startedAt, row.viewedAt);
    current.status = current.completedLessonIds.length > 0 ? "in_progress" : "in_progress";
    map[row.courseId] = current;
  }

  for (const courseId of courseIds) {
    if (!map[courseId]) continue;
    if (map[courseId].completedLessonIds.length === 0 && !map[courseId].lastLessonId) {
      map[courseId].status = "not_started";
    }
  }

  return map;
};

const mergeLocalMetadata = (
  userId: string,
  courseIds: string[],
  dbMap: Record<string, CourseProgress>
) => {
  const merged = { ...dbMap };

  for (const courseId of courseIds) {
    const local = readLocalProgress(userId, courseId);
    if (!local) continue;

    if (!merged[courseId]) {
      merged[courseId] = {
        ...local,
        completedLessonIds: [],
        lastLessonId: null,
        status: "not_started",
      };
      continue;
    }

    merged[courseId] = {
      ...merged[courseId],
      startedAt: local.startedAt ?? merged[courseId].startedAt,
      completedAt: local.completedAt ?? merged[courseId].completedAt,
    };
  }

  return merged;
};

export function useUserProgressMap(userId: string | null | undefined, courseIds: string[]) {
  const normalizedCourseIds = useMemo(
    () => Array.from(new Set(courseIds)).sort(),
    [courseIds]
  );
  const [progressByCourse, setProgressByCourse] = useState<Record<string, CourseProgress>>({});

  useEffect(() => {
    if (!userId) {
      setProgressByCourse({});
      return;
    }

    let cancelled = false;

    const loadFromDb = async () => {
      const [rows, lastViewedRows] = await Promise.all([
        listProgressForUser(userId),
        listLastViewedForUser(userId),
      ]);
      return buildProgressMap(userId, normalizedCourseIds, rows, lastViewedRows);
    };

    (async () => {
      try {
        let dbMap = await loadFromDb();

        const migrationTasks = normalizedCourseIds.flatMap((courseId) => {
          const dbProgress = dbMap[courseId];
          const hasDbData = !!dbProgress &&
            (dbProgress.completedLessonIds.length > 0 || !!dbProgress.lastLessonId);
          const local = readLocalProgress(userId, courseId);

          if (!local || hasDbData) return [];
          if (local.completedLessonIds.length === 0 && !local.lastLessonId) return [];

          return [
            ...local.completedLessonIds.map((lessonId) =>
              markLessonCompleted(userId, courseId, lessonId)
            ),
            ...(local.lastLessonId
              ? [setLastViewed(userId, courseId, local.lastLessonId)]
              : []),
          ];
        });

        if (migrationTasks.length > 0) {
          await Promise.all(migrationTasks);
          dbMap = await loadFromDb();
        }

        if (!cancelled) {
          setProgressByCourse(mergeLocalMetadata(userId, normalizedCourseIds, dbMap));
        }
      } catch {
        const fallback = normalizedCourseIds.reduce<Record<string, CourseProgress>>((acc, courseId) => {
          const local = readLocalProgress(userId, courseId);
          if (local) acc[courseId] = local;
          return acc;
        }, {});

        if (!cancelled) {
          setProgressByCourse(fallback);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, normalizedCourseIds]);

  return progressByCourse;
}