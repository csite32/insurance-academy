import { supabase } from "@/integrations/supabase/client";

export type Role = "user" | "admin";

export type DbUser = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

type RoleRow = {
  user_id: string;
  role: Role;
};

export async function listUsers(): Promise<DbUser[]> {
  const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] =
    await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const roleMap = new Map<string, Role>();
  (roles as RoleRow[]).forEach((r) => {
    // 'admin' wins over 'user'
    const cur = roleMap.get(r.user_id);
    if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role);
  });
  return (profiles as ProfileRow[]).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    avatarUrl: p.avatar_url,
    role: roleMap.get(p.id) ?? "user",
  }));
}

export async function getUser(id: string): Promise<DbUser | null> {
  const { data: profile, error: e1 } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) throw e1;
  if (!profile) return null;
  const { data: roles, error: e2 } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", id);
  if (e2) throw e2;
  const isAdmin = (roles as { role: Role }[]).some((r) => r.role === "admin");
  const p = profile as ProfileRow;
  return {
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    avatarUrl: p.avatar_url,
    role: isAdmin ? "admin" : "user",
  };
}

export async function updateProfile(
  id: string,
  patch: { fullName?: string; email?: string; avatarUrl?: string | null }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  const { error } = await supabase
    .from("profiles")
    .update(row as never)
    .eq("id", id);
  if (error) throw error;
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  // Replace existing role rows with a single one
  const { error: delErr } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw delErr;
  const { error: insErr } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role } as never);
  if (insErr) throw insErr;
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  await updateProfile(userId, { avatarUrl: data.publicUrl });
  return data.publicUrl;
}

export function subscribeUsers(onChange: () => void) {
  const c1 = supabase
    .channel(`db:profiles:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      () => onChange()
    )
    .subscribe();
  const c2 = supabase
    .channel(`db:user_roles:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_roles" },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(c1);
    supabase.removeChannel(c2);
  };
}