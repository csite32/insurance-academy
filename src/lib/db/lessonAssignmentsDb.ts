import { supabase } from "@/integrations/supabase/client";

export type DbLessonAssignment = {
  userId: string;
  courseId: string;
  lessonId: string;
};

type Row = {
  user_id: string;
  course_id: string;
  lesson_id: string;
};

const fromRow = (r: Row): DbLessonAssignment => ({
  userId: r.user_id,
  courseId: r.course_id,
  lessonId: r.lesson_id,
});

export async function listAllLessonAssignments(): Promise<DbLessonAssignment[]> {
  const { data, error } = await supabase.from("lesson_assignments").select("*");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function listLessonAssignmentsForUser(
  userId: string
): Promise<DbLessonAssignment[]> {
  const { data, error } = await supabase
    .from("lesson_assignments")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

/**
 * Replace the full set of single-lesson assignments for a user.
 * Resolves each lessonId to its courseId from the `lessons` table.
 */
export async function setLessonAssignmentsForUser(
  userId: string,
  lessonIds: string[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from("lesson_assignments")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw delErr;

  if (lessonIds.length === 0) return;

  const { data: lessonRows, error: lErr } = await supabase
    .from("lessons")
    .select("id, course_id")
    .in("id", lessonIds);
  if (lErr) throw lErr;

  const rows = (lessonRows as { id: string; course_id: string }[]).map((l) => ({
    user_id: userId,
    course_id: l.course_id,
    lesson_id: l.id,
  }));
  if (rows.length === 0) return;

  const { error: insErr } = await supabase
    .from("lesson_assignments")
    .insert(rows as never);
  if (insErr) throw insErr;
}

export async function assignLesson(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  const { error } = await supabase
    .from("lesson_assignments")
    .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId } as never);
  if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
}

export async function unassignLesson(userId: string, lessonId: string): Promise<void> {
  const { error } = await supabase
    .from("lesson_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);
  if (error) throw error;
}

export function subscribeLessonAssignments(onChange: () => void) {
  const channel = supabase
    .channel("db:lesson_assignments")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lesson_assignments" },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}