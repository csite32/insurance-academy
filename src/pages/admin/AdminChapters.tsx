import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  adminStore,
  useAdminStore,
  type AdminChapter,
} from "@/data/adminStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminChapters = () => {
  const courses = useAdminStore((s) => s.courses);
  const chapters = useAdminStore((s) => s.chapters);
  const lessons = useAdminStore((s) => s.lessons);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [editing, setEditing] = useState<AdminChapter | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminChapter | null>(null);
  const { toast } = useToast();

  const courseChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.courseId === courseId)
        .sort((a, b) => a.order - b.order),
    [chapters, courseId]
  );

  const openCreate = () => {
    setTitle("");
    setError(null);
    setCreating(true);
  };

  const openEdit = (c: AdminChapter) => {
    setTitle(c.title);
    setError(null);
    setEditing(c);
  };

  const submit = () => {
    if (!title.trim()) {
      setError("שם הפרק הוא שדה חובה");
      return;
    }
    if (editing) {
      adminStore.updateChapter(editing.id, { title: title.trim() });
      toast({ title: "הפרק עודכן" });
      setEditing(null);
    } else {
      adminStore.createChapter({ courseId, title: title.trim() });
      toast({ title: "פרק חדש נוצר" });
      setCreating(false);
    }
  };

  const move = (id: string, dir: "up" | "down") => {
    const ids = courseChapters.map((c) => c.id);
    const idx = ids.indexOf(id);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    adminStore.reorderChapters(courseId, ids);
  };

  const dialogOpen = creating || !!editing;

  return (
    <AdminLayout title="ניהול פרקים" subtitle="ארגון פרקים בכל קורס">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-5">
        <div className="space-y-1.5 md:w-72">
          <Label>בחר קורס</Label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate} disabled={!courseId} className="md:self-end">
          <Plus className="h-4 w-4 ml-1" />
          פרק חדש
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold w-16">סדר</th>
                <th className="p-3 font-semibold">שם הפרק</th>
                <th className="p-3 font-semibold w-24">שיעורים</th>
                <th className="p-3 font-semibold w-40">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {courseChapters.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    אין פרקים בקורס זה
                  </td>
                </tr>
              )}
              {courseChapters.map((c, i) => {
                const lCount = lessons.filter((l) => l.chapterId === c.id).length;
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-semibold">{c.title}</td>
                    <td className="p-3">{lCount}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => move(c.id, "up")}
                          disabled={i === 0}
                          className="rounded-lg p-2 hover:bg-muted disabled:opacity-40 transition"
                          aria-label="העבר למעלה"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => move(c.id, "down")}
                          disabled={i === courseChapters.length - 1}
                          className="rounded-lg p-2 hover:bg-muted disabled:opacity-40 transition"
                          aria-label="העבר למטה"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg p-2 hover:bg-muted hover:text-primary transition"
                          aria-label="עריכה"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToDelete(c)}
                          className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive transition"
                          aria-label="מחיקה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent dir="rtl" className="text-right max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "עריכת פרק" : "פרק חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>שם הפרק</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <Button onClick={submit}>שמירה</Button>
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="האם למחוק את הפרק?"
        description={
          toDelete ? `הפרק "${toDelete.title}" וכל השיעורים שלו יימחקו.` : undefined
        }
        onConfirm={() => {
          if (toDelete) {
            adminStore.deleteChapter(toDelete.id);
            toast({ title: "הפרק נמחק" });
            setToDelete(null);
          }
        }}
      />
    </AdminLayout>
  );
};

export default AdminChapters;
