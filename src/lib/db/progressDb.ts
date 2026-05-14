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

const debugProgress = (message: string, payload?: Record<string, unknown>) => {
  if (payload) {
    console.info(`[progressDb] ${message}`, payload);
    return;
  }
  console.info(`[progressDb] ${message}`);
};

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
  const mapped = (data as ProgressRow[]).map(fromProgress);
  debugProgress("loaded lesson_progress rows", {
    user_id: userId,
    course_id: courseId,
    row_count: mapped.length,
    lesson_ids: mapped.map((row) => row.lessonId),
  });
  return mapped;
}

export async function markLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, course_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    console.error("[progressDb] failed to verify lesson before completion write", {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      error: lessonError,
    });
    throw lessonError;
  }

  const lessonCourseId = lesson?.course_id ?? null;
  const isLessonCourseMatch = lessonCourseId === courseId;

  debugProgress("attempting completion upsert", {
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    lesson_exists: !!lesson,
    lesson_course_id: lessonCourseId,
    is_lesson_course_match: isLessonCourseMatch,
  });

  if (!lesson || !isLessonCourseMatch) {
    const mismatchError = new Error(
      `Lesson ${lessonId} does not belong to course ${courseId}`
    );
    console.error("[progressDb] aborted completion write בגלל חוסר התאמה", {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      lesson_course_id: lessonCourseId,
      error: mismatchError,
    });
    throw mismatchError;
  }

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
  if (error) {
    console.error("[progressDb] completion upsert failed", {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      success: false,
      error,
    });
    throw error;
  }

  debugProgress("completion upsert succeeded", {
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    success: true,
  });
}

export async function unmarkLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  debugProgress("attempting completion delete", {
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
  });

  const { error } = await supabase
    .from("lesson_progress")
    .delete()
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("lesson_id", lessonId);
  if (error) {
    console.error("[progressDb] completion delete failed", {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      success: false,
      error,
    });
    throw error;
  }

  debugProgress("completion delete succeeded", {
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    success: true,
  });
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

export async function listLastViewedForUser(
  userId: string
): Promise<DbLastViewed[]> {
  const { data, error } = await supabase
    .from("last_viewed")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as LastViewedRow[]).map(fromLastViewed);
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