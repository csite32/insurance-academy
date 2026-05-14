import { supabase } from "@/integrations/supabase/client";

export type DbLessonProgress = {
  userId: string;
  courseId: string;
  lessonId: string;
  completedAt: string;
};

export type DbLastViewed = {
  userId: string;
  courseId: string;
  lessonId: string;
  viewedAt: string;
};

type ProgressRow = {
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed_at: string;
};

type LastViewedRow = {
  user_id: string;
  course_id: string;
  lesson_id: string;
  viewed_at: string;
};

const fromProgress = (r: ProgressRow): DbLessonProgress => ({
  userId: r.user_id,
  courseId: r.course_id,
  lessonId: r.lesson_id,
  completedAt: r.completed_at,
});

const fromLastViewed = (r: LastViewedRow): DbLastViewed => ({
  userId: r.user_id,
  courseId: r.course_id,
  lessonId: r.lesson_id,
  viewedAt: r.viewed_at,
});

// ---------- Lesson Progress ----------

export async function listProgressForUser(
  userId: string
): Promise<DbLessonProgress[]> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as ProgressRow[]).map(fromProgress);
}

export async function listProgressForUserCourse(
  userId: string,
  courseId: string
): Promise<DbLessonProgress[]> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId);
  if (error) throw error;
  return (data as ProgressRow[]).map(fromProgress);
}

export async function markLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  const { error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,lesson_id" }
    );
  if (error) throw error;
}

export async function unmarkLessonCompleted(
  userId: string,
  lessonId: string
): Promise<void> {
  const { error } = await supabase
    .from("lesson_progress")
    .delete()
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);
  if (error) throw error;
}

// ---------- Last Viewed ----------

export async function getLastViewed(
  userId: string,
  courseId?: string
): Promise<DbLastViewed | null> {
  let q = supabase.from("last_viewed").select("*").eq("user_id", userId);
  if (courseId) q = q.eq("course_id", courseId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data ? fromLastViewed(data as LastViewedRow) : null;
}

export async function setLastViewed(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  const { error } = await supabase
    .from("last_viewed")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        viewed_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,course_id" }
    );
  if (error) throw error;
}

// ---------- Realtime ----------

export function subscribeProgress(userId: string, onChange: () => void) {
  const c1 = supabase
    .channel(`db:lesson_progress:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "lesson_progress",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange()
    )
    .subscribe();
  const c2 = supabase
    .channel(`db:last_viewed:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "last_viewed",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(c1);
    supabase.removeChannel(c2);
  };
}