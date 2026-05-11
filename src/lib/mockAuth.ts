export type MockRole = "student" | "admin";

export type MockUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: MockRole;
  enrolledCourseIds: string[];
};

export const mockUsers: MockUser[] = [
  {
    id: "user-1",
    email: "yossi@academy.co.il",
    password: "123456",
    name: "יוסי לוי",
    role: "student",
    enrolledCourseIds: ["course-1", "course-2", "course-3"],
  },
  {
    id: "user-2",
    email: "admin@academy.co.il",
    password: "admin123",
    name: "מנדי גפנר",
    role: "admin",
    enrolledCourseIds: ["course-1", "course-2", "course-3"],
  },
];

export type SessionUser = Omit<MockUser, "password">;

export const SESSION_KEY = "academy:session";

export function authenticate(email: string, password: string): SessionUser | null {
  const user = mockUsers.find(
    (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
  if (!user) return null;
  const { password: _pw, ...session } = user;
  return session;
}

export function loadSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}