import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

type MockRecord = AuthUser & { password: string };

const MOCK_USERS: MockRecord[] = [
  {
    id: "user-demo",
    fullName: "יוסי לוי",
    email: "demo@academy.co.il",
    password: "123456",
    role: "user",
    assignedCourses: ["service", "elementary", "sales", "finance"],
    completedLessons: [],
    lastViewedLesson: null,
    progress: 0,
  },
];

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
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) return { ok: false, error: "אימייל או סיסמה שגויים" };
    const { password: _pw, ...safe } = found;
    let storedAvatar: string | null = null;
    try {
      storedAvatar = localStorage.getItem(AVATAR_KEY(safe.id));
    } catch {
      /* ignore */
    }
    const withAvatar = { ...safe, avatarUrl: storedAvatar };
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
