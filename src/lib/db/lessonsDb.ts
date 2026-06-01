import { supabase } from "@/integrations/supabase/client";

export type QuizQuestionData = {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: string;
  correctFeedback?: string;
  wrongFeedback?: string;
};
export type QuizData = {
  title: string;
  questions: QuizQuestionData[];
};

export type DbLesson = {
  id: string;
  title: string;
  description: string;
  videoUrl?: string | null;
  content?: string | null;
  attachments: string[];
  order: number;
  courseId: string;
  chapterId: string;
  hasQuiz: boolean;
  isLocked: boolean;
  quiz?: QuizData | null;
};

type Row = {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  content: string | null;
  attachments: string[];
  order: number;
  course_id: string;
  chapter_id: string;
  has_quiz: boolean;
  is_locked: boolean;
  quiz: QuizData | null;
};

const fromRow = (r: Row): DbLesson => ({
  id: r.id,
  title: r.title,
  description: r.description,
  videoUrl: r.video_url,
  content: r.content,
  attachments: r.attachments ?? [],
  order: r.order,
  courseId: r.course_id,
  chapterId: r.chapter_id,
  hasQuiz: r.has_quiz,
  isLocked: r.is_locked,
  quiz: r.quiz ?? null,
});

const toRow = (l: Partial<DbLesson>) => {
  const row: Record<string, unknown> = {};
  if (l.id !== undefined) row.id = l.id;
  if (l.title !== undefined) row.title = l.title;
  if (l.description !== undefined) row.description = l.description;
  if (l.videoUrl !== undefined) row.video_url = l.videoUrl;
  if (l.content !== undefined) row.content = l.content;
  if (l.attachments !== undefined) row.attachments = l.attachments;
  if (l.order !== undefined) row.order = l.order;
  if (l.courseId !== undefined) row.course_id = l.courseId;
  if (l.chapterId !== undefined) row.chapter_id = l.chapterId;
  if (l.hasQuiz !== undefined) row.has_quiz = l.hasQuiz;
  if (l.isLocked !== undefined) row.is_locked = l.isLocked;
  if (l.quiz !== undefined) row.quiz = l.quiz;
  return row;
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function listLessons(): Promise<DbLesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function listLessonsForCourse(courseId: string): Promise<DbLesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function listLessonsForChapter(chapterId: string): Promise<DbLesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function createLesson(
  input: Omit<DbLesson, "id" | "order"> & { id?: string; order?: number }
): Promise<DbLesson> {
  let order = input.order;
  if (order === undefined) {
    const existing = await listLessonsForChapter(input.chapterId);
    order = existing.length + 1;
  }
  const id = input.id ?? uid("l");
  const payload: DbLesson = {
    attachments: [],
    hasQuiz: false,
    isLocked: false,
    ...input,
    id,
    order,
  } as DbLesson;
  const { data, error } = await supabase
    .from("lessons")
    .insert(toRow(payload) as never)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function updateLesson(
  id: string,
  patch: Partial<DbLesson>
): Promise<DbLesson> {
  const { data, error } = await supabase
    .from("lessons")
    .update(toRow(patch) as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw error;
}

export async function moveLesson(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  const { data: current, error: e1 } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw e1;
  if (!current) return;
  const lesson = current as Row;
  const siblings = await listLessonsForChapter(lesson.chapter_id);
  const idx = siblings.findIndex((l) => l.id === id);
  const swap = direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swap) return;
  await Promise.all([
    supabase
      .from("lessons")
      .update({ order: swap.order } as never)
      .eq("id", lesson.id),
    supabase
      .from("lessons")
      .update({ order: lesson.order } as never)
      .eq("id", swap.id),
  ]);
}

export function subscribeLessons(onChange: () => void) {
  const channel = supabase
    .channel(`db:lessons:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lessons" },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}