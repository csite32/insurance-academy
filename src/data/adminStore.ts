import { useEffect, useSyncExternalStore } from "react";
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
import * as coursesDb from "@/lib/db/coursesDb";
import * as chaptersDb from "@/lib/db/chaptersDb";
import * as lessonsDb from "@/lib/db/lessonsDb";
import * as usersDb from "@/lib/db/usersDb";
import * as assignmentsDb from "@/lib/db/assignmentsDb";
import { supabase } from "@/integrations/supabase/client";

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

let state: StoreState = {
  courses: [],
  chapters: [],
  lessons: [],
  users: [],
  assignments: [],
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  emit();
}

// ---------- Cloud hydration ----------

let hydrated = false;
let hydrating: Promise<void> | null = null;
let unsubAll: Array<() => void> = [];
let hydratedAt = 0;
let currentAuthUserId: string | null = null;
let authListenerStarted = false;

export function isHydrated() {
  return hydrated;
}

async function refreshCourses() {
  const data = await coursesDb.listCourses();
  setState({ courses: data });
}
async function refreshChapters() {
  const data = await chaptersDb.listChapters();
  setState({
    chapters: data.map((c) => ({
      id: c.id,
      title: c.title,
      order: c.order,
      courseId: c.courseId,
    })),
  });
}
async function refreshLessons() {
  const data = await lessonsDb.listLessons();
  setState({
    lessons: data.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      videoUrl: l.videoUrl ?? undefined,
      content: l.content ?? undefined,
      attachments: l.attachments ?? [],
      order: l.order,
      courseId: l.courseId,
      chapterId: l.chapterId,
      hasQuiz: l.hasQuiz,
      quiz: null,
      isLocked: l.isLocked,
    })),
  });
}
async function refreshUsers() {
  try {
    const data = await usersDb.listUsers();
    setState({
      users: data.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        password: "",
        role: u.role,
      })),
    });
  } catch {
    // non-admin: cannot list users
    setState({ users: [] });
  }
}
async function refreshAssignments() {
  try {
    const data = await assignmentsDb.listAssignments();
    setState({ assignments: data });
  } catch {
    setState({ assignments: [] });
  }
}

async function hydrateAll() {
  await Promise.all([
    refreshCourses().catch(() => {}),
    refreshChapters().catch(() => {}),
    refreshLessons().catch(() => {}),
    refreshUsers().catch(() => {}),
    refreshAssignments().catch(() => {}),
  ]);
}

function startSubscriptions() {
  unsubAll.push(coursesDb.subscribeCourses(() => void refreshCourses().catch(() => {})));
  unsubAll.push(chaptersDb.subscribeChapters(() => void refreshChapters().catch(() => {})));
  unsubAll.push(lessonsDb.subscribeLessons(() => void refreshLessons().catch(() => {})));
  unsubAll.push(usersDb.subscribeUsers(() => void refreshUsers().catch(() => {})));
  unsubAll.push(
    assignmentsDb.subscribeAssignments(() => void refreshAssignments().catch(() => {}))
  );
}

export async function ensureHydrated(): Promise<void> {
  startAuthListener();
  if (hydrated) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    // Wait for an auth session before issuing reads — RLS requires authenticated.
    const { data } = await supabase.auth.getSession();
    currentAuthUserId = data.session?.user?.id ?? null;
    if (!currentAuthUserId) {
      // Not signed in yet; the auth listener will re-trigger hydration on sign-in.
      hydrating = null;
      return;
    }
    await hydrateAll();
    startSubscriptions();
    hydrated = true;
    hydratedAt = Date.now();
    emit();
  })();
  return hydrating;
}

function startAuthListener() {
  if (authListenerStarted) return;
  authListenerStarted = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    const nextId = session?.user?.id ?? null;
    if (nextId === currentAuthUserId) return;
    currentAuthUserId = nextId;
    if (!nextId) {
      // Signed out — clear state and allow re-hydration on next sign-in.
      hydrated = false;
      hydrating = null;
      unsubAll.forEach((u) => u());
      unsubAll = [];
      setState({ courses: [], chapters: [], lessons: [], users: [], assignments: [] });
      return;
    }
    // Signed in (or switched user) — force re-hydration.
    hydrated = false;
    hydrating = null;
    unsubAll.forEach((u) => u());
    unsubAll = [];
    void ensureHydrated();
  });
}

// ---------- Public API (signature-compatible with previous store) ----------

export const getCourses = () => state.courses;
export const getChapters = () => state.chapters;
export const getLessons = () => state.lessons;
export const getUsers = () => state.users;
export const getAssignments = () => state.assignments;

// Kept for back-compat (no-op vs cloud — UI should call CRUD methods)
export const saveCourses = (_: AdminCourse[]) => {};
export const saveChapters = (_: AdminChapter[]) => {};
export const saveLessons = (_: AdminLesson[]) => {};
export const saveUsers = (_: AdminUser[]) => {};
export const saveAssignments = (_: AdminAssignment[]) => {};

export const adminStore = {
  getState: () => state,
  getCourses,
  saveCourses,
  getChapters,
  saveChapters,
  getLessons,
  saveLessons,
  getUsers,
  saveUsers,
  getAssignments,
  saveAssignments,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  // ----- courses -----
  async createCourse(input: Omit<AdminCourse, "id">) {
    const c = await coursesDb.createCourse(input);
    await refreshCourses();
    return c as AdminCourse;
  },
  async updateCourse(id: string, patch: Partial<AdminCourse>) {
    await coursesDb.updateCourse(id, patch);
    await refreshCourses();
  },
  async deleteCourse(id: string) {
    await coursesDb.deleteCourse(id);
    await Promise.all([
      refreshCourses(),
      refreshChapters(),
      refreshLessons(),
      refreshAssignments(),
    ]);
  },

  // ----- chapters -----
  async createChapter(input: Omit<AdminChapter, "id" | "order">) {
    const c = await chaptersDb.createChapter(input);
    await refreshChapters();
    return {
      id: c.id,
      title: c.title,
      order: c.order,
      courseId: c.courseId,
    } as AdminChapter;
  },
  async updateChapter(id: string, patch: Partial<AdminChapter>) {
    await chaptersDb.updateChapter(id, patch);
    await refreshChapters();
  },
  async deleteChapter(id: string) {
    await chaptersDb.deleteChapter(id);
    await Promise.all([refreshChapters(), refreshLessons()]);
  },
  async reorderChapters(courseId: string, orderedIds: string[]) {
    await chaptersDb.reorderChapters(courseId, orderedIds);
    await refreshChapters();
  },

  // ----- lessons -----
  async createLesson(
    input: Omit<AdminLesson, "id" | "order" | "quiz"> & { order?: number }
  ) {
    const created = await lessonsDb.createLesson({
      title: input.title,
      description: input.description,
      videoUrl: input.videoUrl ?? null,
      content: input.content ?? null,
      attachments: input.attachments ?? [],
      courseId: input.courseId,
      chapterId: input.chapterId,
      hasQuiz: input.hasQuiz,
      isLocked: input.isLocked,
      order: input.order,
    });
    await refreshLessons();
    return {
      id: created.id,
      title: created.title,
      description: created.description,
      videoUrl: created.videoUrl ?? undefined,
      content: created.content ?? undefined,
      attachments: created.attachments ?? [],
      order: created.order,
      courseId: created.courseId,
      chapterId: created.chapterId,
      hasQuiz: created.hasQuiz,
      quiz: null,
      isLocked: created.isLocked,
    } as AdminLesson;
  },
  async updateLesson(id: string, patch: Partial<AdminLesson>) {
    const dbPatch: Parameters<typeof lessonsDb.updateLesson>[1] = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.videoUrl !== undefined) dbPatch.videoUrl = patch.videoUrl ?? null;
    if (patch.content !== undefined) dbPatch.content = patch.content ?? null;
    if (patch.attachments !== undefined) dbPatch.attachments = patch.attachments;
    if (patch.order !== undefined) dbPatch.order = patch.order;
    if (patch.courseId !== undefined) dbPatch.courseId = patch.courseId;
    if (patch.chapterId !== undefined) dbPatch.chapterId = patch.chapterId;
    if (patch.hasQuiz !== undefined) dbPatch.hasQuiz = patch.hasQuiz;
    if (patch.isLocked !== undefined) dbPatch.isLocked = patch.isLocked;
    await lessonsDb.updateLesson(id, dbPatch);
    await refreshLessons();
  },
  async deleteLesson(id: string) {
    await lessonsDb.deleteLesson(id);
    await refreshLessons();
  },
  async moveLesson(id: string, direction: "up" | "down") {
    await lessonsDb.moveLesson(id, direction);
    await refreshLessons();
  },

  // ----- users -----
  async createUser(_input: Omit<AdminUser, "id">) {
    // Creating auth users requires a privileged server-side flow.
    // Not yet wired in stage C. UI will still get a refresh.
    console.warn(
      "[adminStore] createUser is not supported via the cloud yet — will be added with a server-side endpoint."
    );
    await refreshUsers();
    return null as unknown as AdminUser;
  },
  async updateUser(id: string, patch: Partial<AdminUser>) {
    const profilePatch: Parameters<typeof usersDb.updateProfile>[1] = {};
    if (patch.fullName !== undefined) profilePatch.fullName = patch.fullName;
    if (patch.email !== undefined) profilePatch.email = patch.email;
    if (Object.keys(profilePatch).length > 0) {
      await usersDb.updateProfile(id, profilePatch);
    }
    if (patch.role !== undefined) {
      await usersDb.setUserRole(id, patch.role);
    }
    await refreshUsers();
  },
  async deleteUser(id: string) {
    // Best effort: removes the profile + role; auth user remains.
    await Promise.all([
      // delete role rows
      usersDb.setUserRole(id, "user").catch(() => {}),
    ]);
    // delete profile (admin policy)
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("profiles").delete().eq("id", id);
    await Promise.all([refreshUsers(), refreshAssignments()]);
  },

  // ----- assignments -----
  async setAssignments(userId: string, courseIds: string[]) {
    await assignmentsDb.setAssignmentsForUser(userId, courseIds);
    await refreshAssignments();
  },

  // Legacy auth helpers — unused now (AuthContext uses supabase.auth)
  authenticate(_email: string, _password: string): AdminUser | null {
    return null;
  },
  getUserById(id: string): AdminUser | null {
    return state.users.find((u) => u.id === id) ?? null;
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
    () => selector(state),
    () => selector(state)
  );
}

export function useAdminStoreHydration() {
  useEffect(() => {
    void ensureHydrated();
  }, []);
}

export function useAdminHydrated(): boolean {
  return useSyncExternalStore(
    adminStore.subscribe,
    () => hydrated,
    () => hydrated
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
