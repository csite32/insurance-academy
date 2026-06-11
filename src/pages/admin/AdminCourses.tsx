import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  adminStore,
  useAdminStore,
  type AdminCourse,
  type LearningMode,
  type CourseStatus,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type FormState = {
  title: string;
  description: string;
  image: string;
  learningMode: LearningMode;
  status: CourseStatus;
};

const empty: FormState = {
  title: "",
  description: "",
  image: "",
  learningMode: "sequential",
  status: "draft",
};

const AdminCourses = () => {
  const courses = useAdminStore((s) => s.courses);
  const lessons = useAdminStore((s) => s.lessons);
  const chapters = useAdminStore((s) => s.chapters);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminCourse | null>(null);
  const { toast } = useToast();

  const filtered = useMemo(
    () =>
      courses.filter((c) =>
        c.title.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [courses, q]
  );

  const openCreate = () => {
    setForm(empty);
    setErrors({});
    setCreating(true);
  };

  const openEdit = (c: AdminCourse) => {
    setForm({
      title: c.title,
      description: c.description,
      image: c.image,
      learningMode: c.learningMode,
      status: c.status,
    });
    setErrors({});
    setEditing(c);
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) e.title = "שדה חובה";
    if (!form.description.trim()) e.description = "שדה חובה";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    setSaving(true);
    if (editing) {
      adminStore.updateCourse(editing.id, form);
      toast({ title: "הקורס עודכן בהצלחה" });
      setEditing(null);
    } else {
      adminStore.createCourse({ ...form, iconKey: "default" });
      toast({ title: "קורס חדש נוצר" });
      setCreating(false);
    }
    setSaving(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    adminStore.deleteCourse(toDelete.id);
    toast({ title: "הקורס נמחק" });
    setToDelete(null);
  };

  const dialogOpen = creating || !!editing;

  return (
    <AdminLayout title="ניהול קורסים" subtitle="יצירה, עריכה ומחיקה של קורסים">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש קורס..."
            className="pr-9"
          />
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 ml-1" />
          קורס חדש
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold">שם הקורס</th>
                <th className="p-3 font-semibold">תיאור</th>
                <th className="p-3 font-semibold">פרקים</th>
                <th className="p-3 font-semibold">שיעורים</th>
                <th className="p-3 font-semibold">מצב למידה</th>
                <th className="p-3 font-semibold">סטטוס</th>
                <th className="p-3 font-semibold w-24">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    לא נמצאו קורסים
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const chCount = chapters.filter((ch) => ch.courseId === c.id).length;
                const lCount = lessons.filter((l) => l.courseId === c.id).length;
                return (
                  <tr
                    key={c.id}
                    className="border-t border-border hover:bg-muted/40 transition"
                  >
                    <td className="p-3 font-semibold">{c.title}</td>
                    <td className="p-3 text-muted-foreground max-w-xs truncate">
                      {c.description}
                    </td>
                    <td className="p-3">{chCount}</td>
                    <td className="p-3">{lCount}</td>
                    <td className="p-3">
                      {c.learningMode === "sequential"
                        ? "לפי סדר שיעורים"
                        : c.learningMode === "chapter_sequential"
                        ? "לפי סדר פרקים"
                        : "חופשי"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          c.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.status === "active" ? "פעיל" : "טיוטה"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          aria-label="עריכה"
                          className="rounded-lg p-2 hover:bg-muted text-foreground/80 hover:text-primary transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToDelete(c)}
                          aria-label="מחיקה"
                          className="rounded-lg p-2 hover:bg-destructive/10 text-foreground/80 hover:text-destructive transition"
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
        <DialogContent dir="rtl" className="text-right max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "עריכת קורס" : "יצירת קורס חדש"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>שם הקורס</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>תיאור קצר</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>תמונת קורס</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm({ ...form, image: String(reader.result || "") });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {form.image && (
                <img
                  src={form.image}
                  alt="תצוגה מקדימה"
                  className="mt-2 h-24 w-24 object-cover rounded-md border border-border"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>מצב למידה</Label>
                <select
                  value={form.learningMode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      learningMode: e.target.value as LearningMode,
                    })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="sequential">לפי סדר שיעורים</option>
                  <option value="chapter_sequential">לפי סדר פרקים</option>
                  <option value="free">חופשי</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>סטטוס</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as CourseStatus })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="active">פעיל</option>
                  <option value="draft">טיוטה</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <Button onClick={submit} disabled={saving}>
              {saving ? "שומר..." : "שמירה"}
            </Button>
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
        title="האם למחוק את הקורס?"
        description={
          toDelete
            ? `הקורס "${toDelete.title}" וכל הפרקים והשיעורים שלו יימחקו.`
            : undefined
        }
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
};

export default AdminCourses;
