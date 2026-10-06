import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2, Users } from "lucide-react";
import { adminStore, useAdminStore } from "@/data/adminStore";
import type { DbBundle } from "@/lib/db/bundlesDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";

type Draft = { id?: string; name: string; courses: Set<string>; lessons: Set<string> };

const BundlesManager = () => {
  const bundles = useAdminStore((s) => s.bundles);
  const userBundles = useAdminStore((s) => s.userBundles);
  const courses = useAdminStore((s) => s.courses);
  const chapters = useAdminStore((s) => s.chapters);
  const lessons = useAdminStore((s) => s.lessons);
  const { toast } = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<DbBundle | null>(null);
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());

  const memberCount = (id: string) => userBundles.filter((ub) => ub.bundleId === id).length;

  const lessonsByCourse = useMemo(() => {
    const m = new Map<string, typeof lessons>();
    lessons.forEach((l) => m.set(l.courseId, [...(m.get(l.courseId) ?? []), l]));
    return m;
  }, [lessons]);

  const openEditor = (b?: DbBundle) => {
    setOpenCourses(new Set());
    setDraft(
      b
        ? {
            id: b.id,
            name: b.name,
            courses: new Set(b.courseIds),
            lessons: new Set(b.lessons.map((l) => l.lessonId)),
          }
        : { name: "", courses: new Set(), lessons: new Set() }
    );
  };

  const update = (fn: (d: Draft) => Draft) => setDraft((d) => (d ? fn(d) : d));

  const toggleCourse = (courseId: string, on: boolean) =>
    update((d) => {
      const c = new Set(d.courses);
      const l = new Set(d.lessons);
      const ids = (lessonsByCourse.get(courseId) ?? []).map((x) => x.id);
      if (on) c.add(courseId);
      else c.delete(courseId);
      ids.forEach((id) => l.delete(id)); // full course supersedes single lessons
      return { ...d, courses: c, lessons: l };
    });

  const toggleLessons = (ids: string[], on: boolean) =>
    update((d) => {
      const l = new Set(d.lessons);
      ids.forEach((id) => (on ? l.add(id) : l.delete(id)));
      return { ...d, lessons: l };
    });

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast({ title: "יש להזין שם לקומבינציה", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminStore.saveBundle({
        id: draft.id,
        name,
        courseIds: [...draft.courses],
        lessons: lessons
          .filter((l) => draft.lessons.has(l.id) && !draft.courses.has(l.courseId))
          .map((l) => ({ courseId: l.courseId, lessonId: l.id })),
      });
      toast({ title: "הקומבינציה נשמרה" });
      setDraft(null);
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

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await adminStore.deleteBundle(toDelete.id);
      toast({ title: "הקומבינציה נמחקה" });
    } catch (e) {
      toast({
        title: "מחיקה נכשלה",
        description: e instanceof Error ? e.message : "שגיאה לא ידועה",
        variant: "destructive",
      });
    } finally {
      setToDelete(null);
    }
  };

  const describe = (b: DbBundle) => {
    const parts: string[] = [];
    if (b.courseIds.length) parts.push(`${b.courseIds.length} קורסים מלאים`);
    if (b.lessons.length) parts.push(`${b.lessons.length} שיעורים בודדים`);
    return parts.length ? parts.join(" · ") : "ריקה";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">קומבינציות</h2>
          <p className="text-xs text-muted-foreground">
            חבילות תוכן שמשויכות למשתמשים. שינוי בקומבינציה חל מיד על כל המשויכים אליה.
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="ml-1 h-4 w-4" />
          קומבינציה חדשה
        </Button>
      </div>

      {bundles.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין לא נוצרו קומבינציות.</p>
      ) : (
        <ul className="space-y-2">
          {bundles.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{describe(b)}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Users className="h-3 w-3" />
                {memberCount(b.id)} משתמשים
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => openEditor(b)} aria-label="עריכה">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setToDelete(b)} aria-label="מחיקה">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "עריכת קומבינציה" : "קומבינציה חדשה"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bundle-name">שם הקומבינציה</Label>
                <Input
                  id="bundle-name"
                  value={draft.name}
                  onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
                  placeholder='לדוגמה: "מכירות"'
                />
              </div>
              <div className="space-y-2">
                <Label>תוכן</Label>
                {courses.map((c) => {
                  const full = draft.courses.has(c.id);
                  const cLessons = lessonsByCourse.get(c.id) ?? [];
                  const selected = cLessons.filter((l) => draft.lessons.has(l.id)).length;
                  const isOpen = openCourses.has(c.id);
                  return (
                    <Collapsible
                      key={c.id}
                      open={isOpen}
                      onOpenChange={() =>
                        setOpenCourses((p) => {
                          const n = new Set(p);
                          if (n.has(c.id)) n.delete(c.id);
                          else n.add(c.id);
                          return n;
                        })
                      }
                      className={`rounded-xl border ${full || selected ? "border-primary/50 bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={full}
                          onCheckedChange={(v) => toggleCourse(c.id, v === true)}
                          aria-label={`קורס מלא: ${c.title}`}
                        />
                        <p className="min-w-0 flex-1 truncate font-medium">{c.title}</p>
                        {full ? (
                          <Badge className="shrink-0">קורס מלא</Badge>
                        ) : selected > 0 ? (
                          <Badge variant="secondary" className="shrink-0">
                            {selected} שיעורים
                          </Badge>
                        ) : null}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={isOpen ? "סגור" : "פתח"}>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="space-y-3 border-t border-border px-3 py-3">
                          {full && (
                            <p className="text-xs text-muted-foreground">
                              הקורס כולו כלול. לבחירת שיעורים בודדים יש לבטל את "קורס מלא".
                            </p>
                          )}
                          {chapters
                            .filter((ch) => ch.courseId === c.id)
                            .sort((a, b) => a.order - b.order)
                            .map((ch) => {
                              const chLessons = cLessons
                                .filter((l) => l.chapterId === ch.id)
                                .sort((a, b) => a.order - b.order);
                              const ids = chLessons.map((l) => l.id);
                              const n = ids.filter((id) => draft.lessons.has(id)).length;
                              return (
                                <div key={ch.id} className="space-y-1">
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      disabled={full || ids.length === 0}
                                      checked={
                                        full || (ids.length > 0 && n === ids.length)
                                          ? true
                                          : n > 0
                                            ? "indeterminate"
                                            : false
                                      }
                                      onCheckedChange={(v) => toggleLessons(ids, v === true)}
                                      aria-label={`פרק ${ch.title}`}
                                    />
                                    <p className="text-sm font-semibold text-muted-foreground">{ch.title}</p>
                                  </div>
                                  <ul className="space-y-1 pr-6">
                                    {chLessons.map((l) => (
                                      <li key={l.id} className="flex items-center gap-3 px-2 py-1">
                                        <Checkbox
                                          disabled={full}
                                          checked={full ? !l.isLocked : draft.lessons.has(l.id)}
                                          onCheckedChange={(v) => toggleLessons([l.id], v === true)}
                                          aria-label={l.title}
                                        />
                                        <span className="text-sm">{l.title}</span>
                                        {l.isLocked && (
                                          <Badge variant="outline" className="text-[10px]">
                                            נעול
                                          </Badge>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              ביטול
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "שומר..." : "שמור קומבינציה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`מחיקת הקומבינציה "${toDelete?.name ?? ""}"`}
        description={`הקומבינציה תוסר מ-${toDelete ? memberCount(toDelete.id) : 0} משתמשים. גישה שהם מקבלים משיוך ישיר או מקומבינציה אחרת תישאר, וההתקדמות שלהם לא תימחק.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default BundlesManager;
