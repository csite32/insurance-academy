import { useEffect, useMemo, useState } from "react";
import { Save, Search, Check } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminStore, useAdminStore } from "@/data/adminStore";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const AdminAssignments = () => {
  const users = useAdminStore((s) => s.users);
  const courses = useAdminStore((s) => s.courses);
  const assignments = useAdminStore((s) => s.assignments);

  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
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
