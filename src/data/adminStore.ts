import { useSyncExternalStore } from "react";
import { courses as seedCourses } from "./courses";
import { courseDetails } from "./courseDetail";
import {
  BookOpen,
  Headphones,
  ShieldCheck,
  Handshake,
  HeartPulse,
  Wallet,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type LearningMode = "sequential" | "free";
export type CourseStatus = "active" | "draft";
export type Role = "user" | "admin";

export type AdminLesson = {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  content?: string;
  attachments: string[];
  order: number;
  courseId: string;
  chapterId: string;
  hasQuiz: boolean;
  quiz: null;
  isLocked: boolean;
};

export type AdminChapter = {
  id: string;
  title: string;
  order: number;
  courseId: string;
};

export type AdminCourse = {
  id: string;
  title: string;
  description: string;
  image: string;
  iconKey: string;
  learningMode: LearningMode;
  status: CourseStatus;
};

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: Role;
};

export type AdminAssignment = {
  userId: string;
  courseId: string;
};

type StoreState = {
  courses: AdminCourse[];
  chapters: AdminChapter[];
  lessons: AdminLesson[];
  users: AdminUser[];
  assignments: AdminAssignment[];
};

const STORAGE_KEY = "admin:store:v1";
const SEED_FLAG = "admin:store:seeded:v1";

const ICONS: Record<string, LucideIcon> = {
  service: Headphones,
  elementary: ShieldCheck,
  sales: Handshake,
  private: HeartPulse,
  finance: Wallet,
  pension: UserCog,
  default: BookOpen,
};

export const getIcon = (key: string): LucideIcon => ICONS[key] ?? ICONS.default;

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function buildSeed(): StoreState {
  const courses: AdminCourse[] = seedCourses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    image: "",
    iconKey: c.id,
    learningMode: "sequential",
    status: "active",
  }));

  const chapters: AdminChapter[] = [];
  const lessons: AdminLesson[] = [];

  for (const c of seedCourses) {
    const detail = courseDetails[c.id];
    if (!detail) continue;
    detail.chapters.forEach((ch, chIdx) => {
      const chapterId = `${c.id}-ch-${chIdx + 1}`;
      chapters.push({
        id: chapterId,
        title: ch.title,
        order: chIdx + 1,
        courseId: c.id,
      });
      ch.lessons.forEach((l, lIdx) => {
        lessons.push({
          id: `${c.id}-${chapterId}-l-${lIdx + 1}`,
          title: l.title,
          description: l.shortDescription,
          videoUrl: l.videoUrl,
          content: l.content,
          attachments: (l.attachments ?? []).map((a) => a.name),
          order: lIdx + 1,
          courseId: c.id,
          chapterId,
          hasQuiz: !!l.quiz,
          quiz: null,
          isLocked: false,
        });
      });
    });
  }

  const users: AdminUser[] = [
    {
      id: "user-demo",
      fullName: "יוסי לוי",
      email: "demo@academy.co.il",
      password: "123456",
      role: "user",
    },
    {
      id: "user-admin",
      fullName: "מנהל מערכת",
      email: "admin@academy.co.il",
      password: "123456",
      role: "admin",
    },
  ];

  const demoAssigned = ["service", "elementary", "sales", "finance"];
  const assignments: AdminAssignment[] = demoAssigned.map((courseId) => ({
    userId: "user-demo",
    courseId,
  }));

  return { courses, chapters, lessons, users, assignments };
}

let state: StoreState = loadInitial();
const listeners = new Set<() => void>();

function loadInitial(): StoreState {
  if (typeof window === "undefined") return buildSeed();
  try {
    const seeded = localStorage.getItem(SEED_FLAG);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (seeded && raw) {
      return JSON.parse(raw) as StoreState;
    }
    const seed = buildSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    localStorage.setItem(SEED_FLAG, "1");
    return seed;
  } catch {
    return buildSeed();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function update(mut: (s: StoreState) => StoreState) {
  state = mut(state);
  persist();
}

export const adminStore = {
  getState: () => state,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  // courses
  createCourse(input: Omit<AdminCourse, "id">) {
    const c: AdminCourse = { ...input, id: uid("course") };
    update((s) => ({ ...s, courses: [...s.courses, c] }));
    return c;
  },
  updateCourse(id: string, patch: Partial<AdminCourse>) {
    update((s) => ({
      ...s,
      courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },
  deleteCourse(id: string) {
    update((s) => ({
      ...s,
      courses: s.courses.filter((c) => c.id !== id),
      chapters: s.chapters.filter((c) => c.courseId !== id),
      lessons: s.lessons.filter((l) => l.courseId !== id),
      assignments: s.assignments.filter((a) => a.courseId !== id),
    }));
  },
  // chapters
  createChapter(input: Omit<AdminChapter, "id" | "order">) {
    const order =
      state.chapters.filter((c) => c.courseId === input.courseId).length + 1;
    const c: AdminChapter = { ...input, id: uid("ch"), order };
    update((s) => ({ ...s, chapters: [...s.chapters, c] }));
    return c;
  },
  updateChapter(id: string, patch: Partial<AdminChapter>) {
    update((s) => ({
      ...s,
      chapters: s.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },
  deleteChapter(id: string) {
    update((s) => ({
      ...s,
      chapters: s.chapters.filter((c) => c.id !== id),
      lessons: s.lessons.filter((l) => l.chapterId !== id),
    }));
  },
  reorderChapters(courseId: string, orderedIds: string[]) {
    update((s) => ({
      ...s,
      chapters: s.chapters.map((c) => {
        if (c.courseId !== courseId) return c;
        const idx = orderedIds.indexOf(c.id);
        return idx === -1 ? c : { ...c, order: idx + 1 };
      }),
    }));
  },
  // lessons
  createLesson(input: Omit<AdminLesson, "id" | "order" | "quiz"> & { order?: number }) {
    const order =
      input.order ??
      state.lessons.filter((l) => l.chapterId === input.chapterId).length + 1;
    const l: AdminLesson = {
      ...input,
      id: uid("l"),
      order,
      quiz: null,
    };
    update((s) => ({ ...s, lessons: [...s.lessons, l] }));
    return l;
  },
  updateLesson(id: string, patch: Partial<AdminLesson>) {
    update((s) => ({
      ...s,
      lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  },
  deleteLesson(id: string) {
    update((s) => ({ ...s, lessons: s.lessons.filter((l) => l.id !== id) }));
  },
  moveLesson(id: string, direction: "up" | "down") {
    update((s) => {
      const lesson = s.lessons.find((l) => l.id === id);
      if (!lesson) return s;
      const siblings = s.lessons
        .filter((l) => l.chapterId === lesson.chapterId)
        .sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((l) => l.id === id);
      const swapWith = direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
      if (!swapWith) return s;
      const a = lesson.order;
      const b = swapWith.order;
      return {
        ...s,
        lessons: s.lessons.map((l) => {
          if (l.id === lesson.id) return { ...l, order: b };
          if (l.id === swapWith.id) return { ...l, order: a };
          return l;
        }),
      };
    });
  },
  // users
  createUser(input: Omit<AdminUser, "id">) {
    const u: AdminUser = { ...input, id: uid("user") };
    update((s) => ({ ...s, users: [...s.users, u] }));
    return u;
  },
  updateUser(id: string, patch: Partial<AdminUser>) {
    update((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  },
  deleteUser(id: string) {
    update((s) => ({
      ...s,
      users: s.users.filter((u) => u.id !== id),
      assignments: s.assignments.filter((a) => a.userId !== id),
    }));
  },
  // assignments
  setAssignments(userId: string, courseIds: string[]) {
    update((s) => ({
      ...s,
      assignments: [
        ...s.assignments.filter((a) => a.userId !== userId),
        ...courseIds.map((courseId) => ({ userId, courseId })),
      ],
    }));
  },
  authenticate(email: string, password: string): AdminUser | null {
    return (
      state.users.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.password === password
      ) ?? null
    );
  },
  assignedCoursesFor(userId: string): string[] {
    return state.assignments
      .filter((a) => a.userId === userId)
      .map((a) => a.courseId);
  },
};

export function useAdminStore<T>(selector: (s: StoreState) => T): T {
  return useSyncExternalStore(
    adminStore.subscribe,
    () => selector(adminStore.getState()),
    () => selector(adminStore.getState())
  );
}

// Convenience selectors used by app pages
export const selectVisibleCourses = (s: StoreState) =>
  s.courses.filter((c) => c.status === "active");

export const selectCourseById = (id: string) => (s: StoreState) =>
  s.courses.find((c) => c.id === id) ?? null;

export const selectChaptersForCourse = (courseId: string) => (s: StoreState) =>
  s.chapters
    .filter((c) => c.courseId === courseId)
    .sort((a, b) => a.order - b.order);

export const selectLessonsForCourse = (courseId: string) => (s: StoreState) =>
  s.lessons
    .filter((l) => l.courseId === courseId)
    .sort((a, b) => a.order - b.order);

export const selectAssignmentsFor = (userId: string) => (s: StoreState) =>
  s.assignments.filter((a) => a.userId === userId).map((a) => a.courseId);

export const selectAssignmentCount = (courseId?: string) => (s: StoreState) =>
  courseId
    ? s.assignments.filter((a) => a.courseId === courseId).length
    : s.assignments.length;
