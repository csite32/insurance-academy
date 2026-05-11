import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { adminStore } from "@/data/adminStore";

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

const STORAGE_KEY = "auth:user";
const AVATAR_KEY = (userId: string) => `auth:avatar:${userId}`;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  updateAvatar: (dataUrl: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        // refresh assigned courses from admin store
        parsed.assignedCourses = adminStore.assignedCoursesFor(parsed.id);
        setUser(parsed);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  // keep user.assignedCourses in sync with admin store changes
  useEffect(() => {
    return adminStore.subscribe(() => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          assignedCourses: adminStore.assignedCoursesFor(prev.id),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    });
  }, []);

  const login = (email: string, password: string) => {
    const found = adminStore.authenticate(email, password);
    if (!found) return { ok: false, error: "אימייל או סיסמה שגויים" };
    const { password: _pw, ...safe } = found;
    let storedAvatar: string | null = null;
    try {
      storedAvatar = localStorage.getItem(AVATAR_KEY(safe.id));
    } catch {
      /* ignore */
    }
    const withAvatar: AuthUser = {
      ...safe,
      assignedCourses: adminStore.assignedCoursesFor(safe.id),
      completedLessons: [],
      lastViewedLesson: null,
      progress: 0,
      avatarUrl: storedAvatar,
    };
    setUser(withAvatar);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withAvatar));
    } catch {
      /* ignore */
    }
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const updateAvatar = (dataUrl: string | null) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, avatarUrl: dataUrl };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (dataUrl) {
          localStorage.setItem(AVATAR_KEY(prev.id), dataUrl);
        } else {
          localStorage.removeItem(AVATAR_KEY(prev.id));
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
