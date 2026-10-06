import { supabase } from "@/integrations/supabase/client";

export type DbBundle = {
  id: string;
  name: string;
  courseIds: string[];
  lessons: { courseId: string; lessonId: string }[];
};

export type DbUserBundle = { userId: string; bundleId: string };

type BundleRow = { id: string; name: string; created_at: string };
type BCRow = { bundle_id: string; course_id: string };
type BLRow = { bundle_id: string; lesson_id: string; course_id: string };

/** Lists bundles visible to the caller (admin: all; user: only their own via RLS). */
export async function listBundles(): Promise<DbBundle[]> {
  const [b, bc, bl] = await Promise.all([
    supabase.from("bundles").select("id, name, created_at").order("created_at"),
    supabase.from("bundle_courses").select("bundle_id, course_id"),
    supabase.from("bundle_lessons").select("bundle_id, lesson_id, course_id"),
  ]);
  if (b.error) throw b.error;
  if (bc.error) throw bc.error;
  if (bl.error) throw bl.error;
  return (b.data as BundleRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    courseIds: (bc.data as BCRow[]).filter((x) => x.bundle_id === r.id).map((x) => x.course_id),
    lessons: (bl.data as BLRow[])
      .filter((x) => x.bundle_id === r.id)
      .map((x) => ({ courseId: x.course_id, lessonId: x.lesson_id })),
  }));
}

export async function listUserBundles(userId?: string): Promise<DbUserBundle[]> {
  let q = supabase.from("user_bundles").select("user_id, bundle_id");
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as { user_id: string; bundle_id: string }[]).map((r) => ({
    userId: r.user_id,
    bundleId: r.bundle_id,
  }));
}

async function replaceContents(
  bundleId: string,
  courseIds: string[],
  lessons: { courseId: string; lessonId: string }[]
) {
  const d1 = await supabase.from("bundle_courses").delete().eq("bundle_id", bundleId);
  if (d1.error) throw d1.error;
  const d2 = await supabase.from("bundle_lessons").delete().eq("bundle_id", bundleId);
  if (d2.error) throw d2.error;
  if (courseIds.length) {
    const { error } = await supabase
      .from("bundle_courses")
      .insert(courseIds.map((course_id) => ({ bundle_id: bundleId, course_id })));
    if (error) throw error;
  }
  if (lessons.length) {
    const { error } = await supabase.from("bundle_lessons").insert(
      lessons.map((l) => ({ bundle_id: bundleId, lesson_id: l.lessonId, course_id: l.courseId }))
    );
    if (error) throw error;
  }
}

export async function saveBundle(input: {
  id?: string;
  name: string;
  courseIds: string[];
  lessons: { courseId: string; lessonId: string }[];
}): Promise<string> {
  let id = input.id;
  if (id) {
    const { error } = await supabase.from("bundles").update({ name: input.name }).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("bundles")
      .insert({ name: input.name })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }
  await replaceContents(id, input.courseIds, input.lessons);
  return id;
}

export async function deleteBundle(id: string): Promise<void> {
  const { error } = await supabase.from("bundles").delete().eq("id", id);
  if (error) throw error;
}

/** Replaces ONLY the user's bundle memberships. Direct assignments are untouched. */
export async function setUserBundles(userId: string, bundleIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from("user_bundles").delete().eq("user_id", userId);
  if (delErr) throw delErr;
  if (!bundleIds.length) return;
  const { error } = await supabase
    .from("user_bundles")
    .insert(bundleIds.map((bundle_id) => ({ user_id: userId, bundle_id })));
  if (error) throw error;
}

export function subscribeBundles(onChange: () => void) {
  const ch = supabase.channel(`db:bundles:${Math.random().toString(36).slice(2)}`);
  for (const table of ["bundles", "bundle_courses", "bundle_lessons", "user_bundles"]) {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange());
  }
  ch.subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

/** Effective content granted to a user through their bundles. */
export function bundleGrants(bundles: DbBundle[], bundleIds: string[]) {
  const set = new Set(bundleIds);
  const courses = new Set<string>();
  const lessons = new Map<string, { courseId: string; lessonId: string }>();
  for (const b of bundles) {
    if (!set.has(b.id)) continue;
    b.courseIds.forEach((c) => courses.add(c));
    b.lessons.forEach((l) => lessons.set(l.lessonId, l));
  }
  return { courses, lessons: [...lessons.values()] };
}
