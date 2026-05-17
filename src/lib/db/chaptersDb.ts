import { supabase } from "@/integrations/supabase/client";

export type DbChapter = {
  id: string;
  title: string;
  order: number;
  courseId: string;
};

type Row = {
  id: string;
  title: string;
  order: number;
  course_id: string;
};

const fromRow = (r: Row): DbChapter => ({
  id: r.id,
  title: r.title,
  order: r.order,
  courseId: r.course_id,
});

const toRow = (c: Partial<DbChapter>) => {
  const row: Record<string, unknown> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.title !== undefined) row.title = c.title;
  if (c.order !== undefined) row.order = c.order;
  if (c.courseId !== undefined) row.course_id = c.courseId;
  return row;
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function listChapters(): Promise<DbChapter[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function listChaptersForCourse(courseId: string): Promise<DbChapter[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function createChapter(
  input: Omit<DbChapter, "id" | "order"> & { id?: string; order?: number }
): Promise<DbChapter> {
  let order = input.order;
  if (order === undefined) {
    const existing = await listChaptersForCourse(input.courseId);
    order = existing.length + 1;
  }
  const id = input.id ?? uid("ch");
  const { data, error } = await supabase
    .from("chapters")
    .insert(toRow({ ...input, id, order }) as never)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function updateChapter(
  id: string,
  patch: Partial<DbChapter>
): Promise<DbChapter> {
  const { data, error } = await supabase
    .from("chapters")
    .update(toRow(patch) as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteChapter(id: string): Promise<void> {
  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderChapters(
  courseId: string,
  orderedIds: string[]
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase
        .from("chapters")
        .update({ order: idx + 1 } as never)
        .eq("id", id)
        .eq("course_id", courseId)
    )
  );
}

export function subscribeChapters(onChange: () => void) {
  const channel = supabase
    .channel("db:chapters")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chapters" },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}