import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminStore, useAdminStore } from "@/data/adminStore";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminAssignments = () => {
  const users = useAdminStore((s) => s.users);
  const courses = useAdminStore((s) => s.courses);
  const assignments = useAdminStore((s) => s.assignments);

  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSelected(
      assignments.filter((a) => a.userId === userId).map((a) => a.courseId)
    );
  }, [userId, assignments]);

  const toggle = (courseId: string) => {
    setSelected((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const save = () => {
    if (!userId) return;
    setSaving(true);
    adminStore.setAssignments(userId, selected);
    setSaving(false);
    toast({ title: "השיוכים נשמרו" });
  };

  return (
    <AdminLayout title="שיוך קורסים" subtitle="הקצאת קורסים למשתמשים">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-1">
          <div className="space-y-1.5">
            <Label>בחר משתמש</Label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} — {u.email}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={save}
            disabled={!userId || saving}
            className="mt-5 w-full"
          >
            <Save className="h-4 w-4 ml-1" />
            {saving ? "שומר..." : "שמירת שיוכים"}
          </Button>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-bold mb-4">קורסים זמינים</h2>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין קורסים</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.map((c) => {
                const checked = selected.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAssignments;
