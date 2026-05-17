import { supabase } from "@/integrations/supabase/client";

export type DbAssignment = {
  userId: string;
  courseId: string;
};

type Row = {
  user_id: string;
  course_id: string;
};

const fromRow = (r: Row): DbAssignment => ({
  userId: r.user_id,
  courseId: r.course_id,
});

export async function listAssignments(): Promise<DbAssignment[]> {
  const { data, error } = await supabase.from("assignments").select("*");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function listAssignmentsForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("course_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as { course_id: string }[]).map((r) => r.course_id);
}

export async function countAssignmentsForCourse(courseId: string): Promise<number> {
  const { count, error } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);
  if (error) throw error;
  return count ?? 0;
}

export async function setAssignmentsForUser(
  userId: string,
  courseIds: string[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from("assignments")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw delErr;
  if (courseIds.length === 0) return;
  const rows = courseIds.map((courseId) => ({
    user_id: userId,
    course_id: courseId,
  }));
  const { error: insErr } = await supabase
    .from("assignments")
    .insert(rows as never);
  if (insErr) throw insErr;
}

export async function assignCourse(userId: string, courseId: string): Promise<void> {
  const { error } = await supabase
    .from("assignments")
    .insert({ user_id: userId, course_id: courseId } as never);
  if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
}

export async function unassignCourse(userId: string, courseId: string): Promise<void> {
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("user_id", userId)
    .eq("course_id", courseId);
  if (error) throw error;
}

export function subscribeAssignments(onChange: () => void) {
  const channel = supabase
    .channel("db:assignments")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "assignments" },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}