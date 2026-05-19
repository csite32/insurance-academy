import { useEffect, useMemo, useState } from "react";
import { Save, Search, Check, ChevronDown, X } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminStore, useAdminStore } from "@/data/adminStore";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

type Mode = "full" | "partial" | "none";

const AdminAssignments = () => {
  const users = useAdminStore((s) => s.users);
  const courses = useAdminStore((s) => s.courses);
  const chapters = useAdminStore((s) => s.chapters);
  const lessons = useAdminStore((s) => s.lessons);
  const assignments = useAdminStore((s) => s.assignments);
  const lessonAssignments = useAdminStore((s) => s.lessonAssignments);

  const [userId, setUserId] = useState<string>("");
  const [draftFullCourses, setDraftFullCourses] = useState<Set<string>>(new Set());
  const [draftLessons, setDraftLessons] = useState<Set<string>>(new Set());
  const [initialFullCourses, setInitialFullCourses] = useState<Set<string>>(new Set());
  const [initialLessons, setInitialLessons] = useState<Set<string>>(new Set());
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const selectedUser = users.find((u) => u.id === userId) ?? null;

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  // Hydrate draft state when user changes or cloud data updates
  useEffect(() => {
    if (!userId) {
      setDraftFullCourses(new Set());
      setDraftLessons(new Set());
      setInitialFullCourses(new Set());
      setInitialLessons(new Set());
      return;
    }
    const full = new Set(
      assignments.filter((a) => a.userId === userId).map((a) => a.courseId)
    );
    const single = new Set(
      lessonAssignments
        .filter((a) => a.userId === userId)
        .map((a) => a.lessonId)
    );
    setDraftFullCourses(new Set(full));
    setDraftLessons(new Set(single));
    setInitialFullCourses(full);
    setInitialLessons(single);
  }, [userId, assignments, lessonAssignments]);

  const lessonsByCourse = useMemo(() => {
    const m = new Map<string, typeof lessons>();
    for (const l of lessons) {
      const arr = m.get(l.courseId) ?? [];
      arr.push(l);
      m.set(l.courseId, arr);
    }
    return m;
  }, [lessons]);

  const chaptersByCourse = useMemo(() => {
    const m = new Map<string, typeof chapters>();
    for (const c of chapters) {
      const arr = m.get(c.courseId) ?? [];
      arr.push(c);
      m.set(c.courseId, arr);
    }
    return m;
  }, [chapters]);

  const getMode = (courseId: string): Mode => {
    if (draftFullCourses.has(courseId)) return "full";
    const courseLessons = lessonsByCourse.get(courseId) ?? [];
    const anySelected = courseLessons.some((l) => draftLessons.has(l.id));
    return anySelected ? "partial" : "none";
  };

  const isDirty =
    userId !== "" &&
    (setsDiffer(draftFullCourses, initialFullCourses) ||
      setsDiffer(draftLessons, initialLessons));

  const toggleOpen = (courseId: string) => {
    setOpenCourses((prev) => {
      const n = new Set(prev);
      if (n.has(courseId)) n.delete(courseId);
      else n.add(courseId);
      return n;
    });
  };

  const toggleFullCourse = (courseId: string, checked: boolean) => {
    setDraftFullCourses((prev) => {
      const n = new Set(prev);
      if (checked) n.add(courseId);
      else n.delete(courseId);
      return n;
    });
    const ids = (lessonsByCourse.get(courseId) ?? []).map((l) => l.id);
    if (checked) {
      // Auto-mark all lessons of this course in the visual state
      setDraftLessons((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => n.add(id));
        return n;
      });
    } else {
      // Unchecking "full course" clears all lesson selections for this course.
      setDraftLessons((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => n.delete(id));
        return n;
      });
    }
  };

  const toggleLesson = (courseId: string, lessonId: string, checked: boolean) => {
    // Manual lesson edit cancels the "full course" mode for this course.
    setDraftFullCourses((prev) => {
      if (!prev.has(courseId)) return prev;
      const n = new Set(prev);
      n.delete(courseId);
      return n;
    });
    setDraftLessons((prev) => {
      const n = new Set(prev);
      if (checked) n.add(lessonId);
      else n.delete(lessonId);
      return n;
    });
  };

  const cancel = () => {
    setDraftFullCourses(new Set(initialFullCourses));
    setDraftLessons(new Set(initialLessons));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const fullCourses = Array.from(draftFullCourses);
      // Only persist lessons for courses that are NOT marked full
      const lessonsToPersist = Array.from(draftLessons).filter((lessonId) => {
        const l = lessons.find((x) => x.id === lessonId);
        if (!l) return false;
        return !draftFullCourses.has(l.courseId);
      });
      await adminStore.saveUserAssignments(userId, {
        fullCourses,
        lessons: lessonsToPersist,
      });
      toast({ title: "השיוכים נשמרו" });
    } catch (e) {
      toast({
        title: "שמירה נכשלה",
        description: e instanceof Error ? e.message : "שגיאה לא ידועה",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="שיוך קורסים" subtitle="הקצאת קורסים ושיעורים בודדים למשתמשים">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: user picker + actions */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-1 self-start">
          <div className="space-y-1.5">
            <Label>בחר משתמש</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder={
                  selectedUser
                    ? `${selectedUser.fullName} — ${selectedUser.email}`
                    : "חיפוש לפי שם או אימייל"
                }
                className="pr-9 text-right"
              />
              {open && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                  {filteredUsers.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      לא נמצאו משתמשים
                    </p>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSel = u.id === userId;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setUserId(u.id);
                            setQuery("");
                            setOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm transition hover:bg-accent ${
                            isSel ? "bg-accent/60" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                          {isSel && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            {selectedUser && (
              <p className="mt-2 text-xs text-muted-foreground">
                נבחר: {selectedUser.fullName} ({selectedUser.email})
              </p>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              onClick={save}
              disabled={!userId || saving || !isDirty}
              className="flex-1"
            >
              <Save className="h-4 w-4 ml-1" />
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              disabled={!userId || saving || !isDirty}
            >
              <X className="h-4 w-4 ml-1" />
              בטל
            </Button>
          </div>

          {userId && (
            <p className="mt-3 text-xs text-muted-foreground">
              {summarize(draftFullCourses.size, countLessonsExcludingFull(draftLessons, draftFullCourses, lessons))}
            </p>
          )}
        </div>

        {/* Right: courses list */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-bold mb-4">קורסים</h2>
          {!userId ? (
            <p className="text-sm text-muted-foreground">בחר/י משתמש כדי לערוך שיוכים</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין קורסים</p>
          ) : (
            <div className="space-y-3">
              {courses.map((c) => {
                const mode = getMode(c.id);
                const isOpen = openCourses.has(c.id);
                const courseChapters = (chaptersByCourse.get(c.id) ?? [])
                  .slice()
                  .sort((a, b) => a.order - b.order);
                const courseLessons = lessonsByCourse.get(c.id) ?? [];

                return (
                  <Collapsible
                    key={c.id}
                    open={isOpen}
                    onOpenChange={() => toggleOpen(c.id)}
                    className={`rounded-xl border transition ${
                      mode === "full"
                        ? "border-primary bg-primary/5"
                        : mode === "partial"
                          ? "border-primary/40 bg-primary/[0.03]"
                          : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <Checkbox
                        checked={draftFullCourses.has(c.id)}
                        onCheckedChange={(v) => toggleFullCourse(c.id, v === true)}
                        aria-label="שיוך קורס מלא"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {c.description}
                        </p>
                      </div>
                      <ModeBadge mode={mode} />
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          aria-label={isOpen ? "סגור" : "פתח"}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t border-border px-3 py-3 space-y-3">
                        {courseChapters.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            אין פרקים בקורס זה
                          </p>
                        ) : (
                          courseChapters.map((chapter) => {
                            const chapterLessons = courseLessons
                              .filter((l) => l.chapterId === chapter.id)
                              .slice()
                              .sort((a, b) => a.order - b.order);
                            return (
                              <div key={chapter.id} className="space-y-1.5">
                                <p className="text-sm font-semibold text-muted-foreground">
                                  {chapter.title}
                                </p>
                                {chapterLessons.length === 0 ? (
                                  <p className="pr-6 text-xs text-muted-foreground">
                                    אין שיעורים
                                  </p>
                                ) : (
                                  <ul className="space-y-1">
                                    {chapterLessons.map((l) => {
                                      const checked = draftLessons.has(l.id);
                                      return (
                                        <li
                                          key={l.id}
                                          className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(v) =>
                                              toggleLesson(c.id, l.id, v === true)
                                            }
                                            aria-label={`שייך את ${l.title}`}
                                          />
                                          <span className="text-sm">{l.title}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

function ModeBadge({ mode }: { mode: Mode }) {
  if (mode === "full") {
    return <Badge className="shrink-0">קורס מלא</Badge>;
  }
  if (mode === "partial") {
    return (
      <Badge variant="secondary" className="shrink-0">
        שיעורים נבחרים
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0">
      לא משויך
    </Badge>
  );
}

function setsDiffer(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return true;
  for (const v of a) if (!b.has(v)) return true;
  return false;
}

function countLessonsExcludingFull(
  lessonsSel: Set<string>,
  fullCourses: Set<string>,
  allLessons: { id: string; courseId: string }[]
) {
  let n = 0;
  for (const id of lessonsSel) {
    const l = allLessons.find((x) => x.id === id);
    if (l && !fullCourses.has(l.courseId)) n++;
  }
  return n;
}

function summarize(fullCount: number, lessonCount: number) {
  if (fullCount === 0 && lessonCount === 0) return "אין שיוכים";
  const parts: string[] = [];
  if (fullCount > 0) parts.push(`${fullCount} קורסים מלאים`);
  if (lessonCount > 0) parts.push(`${lessonCount} שיעורים בודדים`);
  return parts.join(" · ");
}

export default AdminAssignments;
