import type { CourseDetail } from "@/data/courseDetail";

export type AssignedLesson = { courseId: string; lessonId: string };

export type CourseAccess =
  | { kind: "full" }
  | { kind: "partial"; lessonIds: Set<string> }
  | { kind: "none" };

/**
 * Resolve a user's access to a single course.
 * - Admins always get full access.
 * - A course in `assignedCourses` is full access.
 * - Otherwise, any rows in `assignedLessons` for this course grant partial access.
 */
export function getCourseAccess(
  courseId: string,
  assignedCourses: string[],
  assignedLessons: AssignedLesson[],
  isAdmin: boolean
): CourseAccess {
  if (isAdmin) return { kind: "full" };
  if (assignedCourses.includes(courseId)) return { kind: "full" };
  const ids = assignedLessons
    .filter((la) => la.courseId === courseId)
    .map((la) => la.lessonId);
  if (ids.length > 0) return { kind: "partial", lessonIds: new Set(ids) };
  return { kind: "none" };
}

/**
 * Returns a CourseDetail filtered to only the lessons the user has access to.
 * Empty chapters are removed. For `full` access the course is returned unchanged.
 */
export function filterCourseByAccess(
  course: CourseDetail,
  access: CourseAccess
): CourseDetail {
  if (access.kind === "full") return course;
  if (access.kind === "none") return { ...course, chapters: [] };
  const chapters = course.chapters
    .map((ch) => ({
      ...ch,
      lessons: ch.lessons.filter((l) => access.lessonIds.has(l.id)),
    }))
    .filter((ch) => ch.lessons.length > 0);
  return { ...course, chapters };
}