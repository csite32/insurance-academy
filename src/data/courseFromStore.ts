import { FileText } from "lucide-react";
import { adminStore, type AdminLesson } from "./adminStore";
import type { CourseDetail, Lesson, Chapter, Attachment } from "./courseDetail";

const toLesson = (l: AdminLesson): Lesson => {
  const attachments: Attachment[] = (l.attachments ?? []).map((name, i) => ({
    id: `${l.id}-att-${i}`,
    name,
    url: "#",
    icon: FileText,
  }));
  return {
    id: l.id,
    order: l.order,
    title: l.title,
    shortDescription: l.description,
    content:
      l.content ||
      "תוכן השיעור יתעדכן בקרוב על ידי מערכת הניהול.",
    videoUrl: l.videoUrl,
    attachments,
  };
};

export function buildCourseDetailFromStore(courseId: string): CourseDetail | null {
  const state = adminStore.getState();
  const course = state.courses.find((c) => c.id === courseId);
  if (!course) return null;
  const chapters: Chapter[] = state.chapters
    .filter((c) => c.courseId === courseId)
    .sort((a, b) => a.order - b.order)
    .map((ch) => ({
      id: ch.id,
      order: ch.order,
      title: ch.title,
      lessons: state.lessons
        .filter((l) => l.chapterId === ch.id)
        .sort((a, b) => a.order - b.order)
        .map(toLesson),
    }));
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    learningMode: course.learningMode,
    chapters,
    assignedUserIds: state.assignments
      .filter((a) => a.courseId === courseId)
      .map((a) => a.userId),
    active: course.status === "active",
  };
}
