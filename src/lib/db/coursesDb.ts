import { supabase } from "@/integrations/supabase/client";

export type LearningMode = "sequential" | "free";
export type CourseStatus = "active" | "draft";

export type DbCourse = {
  id: string;
  title: string;
  description: string;
  image: string;
  iconKey: string;
  learningMode: LearningMode;
  status: CourseStatus;
};

type Row = {
  id: string;
  title: string;
  description: string;
  image: string;
  icon_key: string;
  learning_mode: LearningMode;
  status: CourseStatus;
};

const fromRow = (r: Row): DbCourse => ({
  id: r.id,
  title: r.title,
  description: r.description,
  image: r.image,
  iconKey: r.icon_key,
  learningMode: r.learning_mode,
  status: r.status,
});

const toRow = (c: Partial<DbCourse>) => {
  const row: Record<string, unknown> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.title !== undefined) row.title = c.title;
  if (c.description !== undefined) row.description = c.description;
  if (c.image !== undefined) row.image = c.image;
  if (c.iconKey !== undefined) row.icon_key = c.iconKey;
  if (c.learningMode !== undefined) row.learning_mode = c.learningMode;
  if (c.status !== undefined) row.status = c.status;
  return row;
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function listCourses(): Promise<DbCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function getCourse(id: string): Promise<DbCourse | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Row) : null;
}

export async function createCourse(
  input: Omit<DbCourse, "id"> & { id?: string }
): Promise<DbCourse> {
  const id = input.id ?? uid("course");
  const { data, error } = await supabase
    .from("courses")
    .insert(toRow({ ...input, id }) as never)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function updateCourse(
  id: string,
  patch: Partial<DbCourse>
): Promise<DbCourse> {
  const { data, error } = await supabase
    .from("courses")
    .update(toRow(patch) as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

export function subscribeCourses(onChange: () => void) {
  const channel = supabase
    .channel("db:courses:" + Math.random().toString(36).slice(2))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "courses" },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}