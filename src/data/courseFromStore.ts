import { FileText, FileType2, Presentation, Link as LinkIcon } from "lucide-react";
import { adminStore, type AdminLesson } from "./adminStore";
import type { CourseDetail, Lesson, Chapter, Attachment } from "./courseDetail";

const iconForType = (type: string) => {
  if (type === "pdf") return FileText;
  if (type === "doc") return FileType2;
  if (type === "ppt") return Presentation;
  return LinkIcon;
};

const parseAttachment = (raw: string, lessonId: string, i: number): Attachment => {
  try {
    if (raw.trim().startsWith("{")) {
      const o = JSON.parse(raw) as { name?: string; url?: string; type?: string };
      const type = o.type ?? "link";
      return {
        id: `${lessonId}-att-${i}`,
        name: o.name ?? "קובץ",
        url: o.url ?? "#",
        icon: iconForType(type),
      };
    }
  } catch { /* fall through */ }
  return { id: `${lessonId}-att-${i}`, name: raw, url: "#", icon: FileText };
};

const toLesson = (l: AdminLesson): Lesson => {
  const attachments: Attachment[] = (l.attachments ?? []).map((raw, i) =>
    parseAttachment(raw, l.id, i)
  );
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
