import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  authenticate,
  clearSession,
  loadSession,
  saveSession,
  type MockRole,
  type SessionUser,
} from "@/lib/mockAuth";

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  hasRole: (role: MockRole) => boolean;
  canAccessCourse: (courseId: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(loadSession());
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = authenticate(email, password);
    if (!session) {
      return { ok: false, error: "אימייל או סיסמה שגויים" };
    }
    saveSession(session);
    setUser(session);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const hasRole = useCallback((role: MockRole) => user?.role === role, [user]);

  const canAccessCourse = useCallback(
    (courseId: string) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return user.enrolledCourseIds.includes(courseId);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, logout, hasRole, canAccessCourse }),
    [user, login, logout, hasRole, canAccessCourse]
  );

  if (!ready) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};