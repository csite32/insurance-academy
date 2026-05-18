import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { listAssignmentsForUser } from "@/lib/db/assignmentsDb";
import { uploadAvatar as uploadAvatarDb, removeAvatar as removeAvatarDb } from "@/lib/db/usersDb";

export type Role = "user" | "admin";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  assignedCourses: string[];
  completedLessons: string[];
  lastViewedLesson: string | null;
  progress: number;
  avatarUrl?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function hydrateUser(userId: string): Promise<AuthUser | null> {
  const [{ data: profile, error: pErr }, { data: roles, error: rErr }, assigned] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      listAssignmentsForUser(userId).catch(() => [] as string[]),
    ]);
  if (pErr) {
    console.error("[auth] profile fetch error", pErr);
  }
  if (rErr) {
    console.error("[auth] roles fetch error", rErr);
  }
  if (!profile) return null;
  const isAdmin = (roles as { role: Role }[] | null)?.some((r) => r.role === "admin") ?? false;
  return {
    id: profile.id,
    fullName: profile.full_name ?? "",
    email: profile.email ?? "",
    role: isAdmin ? "admin" : "user",
    assignedCourses: assigned,
    completedLessons: [],
    lastViewedLesson: null,
    progress: 0,
    avatarUrl: profile.avatar_url ?? null,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1. Set up listener FIRST (sync only — defer DB calls)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setUser(null);
        return;
      }
      const uid = nextSession.user.id;
      // Defer Supabase calls to avoid deadlocks inside the callback
      setTimeout(() => {
        hydrateUser(uid)
          .then((u) => {
            if (!cancelled) setUser(u);
          })
          .catch((e) => console.error("[auth] hydrate error", e));
      }, 0);
    });

    // 2. Then check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user) {
        hydrateUser(data.session.user.id)
          .then((u) => {
            if (!cancelled) setUser(u);
          })
          .catch((e) => console.error("[auth] initial hydrate error", e))
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const msg = /invalid/i.test(error.message)
        ? "אימייל או סיסמה שגויים"
        : error.message;
      return { ok: false, error: msg };
    }
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    const u = await hydrateUser(uid);
    setUser(u);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error("no user");
    const url = await uploadAvatarDb(user.id, file);
    setUser((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
  };

  const removeAvatar = async () => {
    if (!user) return;
    await removeAvatarDb(user.id);
    setUser((prev) => (prev ? { ...prev, avatarUrl: null } : prev));
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, login, logout, uploadAvatar, removeAvatar, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
