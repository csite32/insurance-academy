import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, BarChart3, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  adminStore,
  useAdminStore,
  type AdminUser,
  type Role,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import AdminUserProgressDialog from "@/components/admin/AdminUserProgressDialog";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

type FormState = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
};

const empty: FormState = { fullName: "", email: "", password: "", role: "user" };

const AdminUsers = () => {
  const users = useAdminStore((s) => s.users);
  const assignments = useAdminStore((s) => s.assignments);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [progressUser, setProgressUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  const openCreate = () => {
    setForm(empty);
    setErrors({});
    setCreating(true);
  };

  const openEdit = (u: AdminUser) => {
    setForm({ fullName: u.fullName, email: u.email, password: u.password, role: u.role });
    setErrors({});
    setEditing(u);
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) e.fullName = "שדה חובה";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "אימייל לא תקין";
    // Password is only required when creating a new user
    if (!editing && (!form.password || form.password.length < 6)) {
      e.password = "סיסמה לפחות 6 תווים";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await adminStore.updateUser(editing.id, form);
        toast({ title: "המשתמש עודכן" });
        setEditing(null);
      } else {
        await adminStore.createUser(form);
        toast({ title: "משתמש חדש נוצר" });
        setCreating(false);
      }
    } catch (err) {
      toast({
        title: "שגיאה",
        description: err instanceof Error ? err.message : "אירעה שגיאה",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setNewPw("");
    setConfirmPw("");
    setShowPw(false);
    setShowPw2(false);
    setResetError(null);
  }, [editing]);

  const resetPassword = async () => {
    if (!editing) return;
    if (!newPw) return setResetError("יש להזין סיסמה חדשה.");
    if (!confirmPw) return setResetError("יש לאמת את הסיסמה החדשה.");
    if (newPw.length < 8) return setResetError("הסיסמה חייבת להכיל לפחות 8 תווים.");
    if (newPw !== confirmPw) return setResetError("הסיסמאות אינן תואמות.");
    setResetError(null);
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId: editing.id, password: newPw },
      });
      if (error) {
        let msg = "איפוס הסיסמה נכשל. נסה שוב.";
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const b = await ctx.json();
            if (b?.error) msg = b.error;
          } catch {
            /* ignore */
          }
        }
        setResetError(msg);
        return;
      }
      if (data?.error) {
        setResetError(data.error);
        return;
      }
      setNewPw("");
      setConfirmPw("");
      toast({ title: "הסיסמה עודכנה בהצלחה." });
    } finally {
      setResetting(false);
    }
  };

  const dialogOpen = creating || !!editing;

  return (
    <AdminLayout title="משתמשים" subtitle="ניהול משתמשי המערכת">
      <div className="flex justify-end mb-5">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-1" />
          משתמש חדש
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold">שם</th>
                <th className="p-3 font-semibold">אימייל</th>
                <th className="p-3 font-semibold">תפקיד</th>
                <th className="p-3 font-semibold">קורסים משויכים</th>
                <th className="p-3 font-semibold w-24">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const count = assignments.filter((a) => a.userId === u.id).length;
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.fullName} /> : null}
                          <AvatarFallback className="text-[11px]">{initials(u.fullName) || "?"}</AvatarFallback>
                        </Avatar>
                        <span>{u.fullName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground" dir="ltr">
                      {u.email}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          u.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.role === "admin" ? "מנהל" : "לומד"}
                      </span>
                    </td>
                    <td className="p-3">{count}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setProgressUser(u)}
                          className="rounded-lg p-2 hover:bg-muted hover:text-primary transition"
                          aria-label="צפייה בהתקדמות"
                          title="צפייה בהתקדמות"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-lg p-2 hover:bg-muted hover:text-primary transition"
                          aria-label="עריכה"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToDelete(u)}
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
            <DialogTitle>{editing ? "עריכת משתמש" : "משתמש חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>שם מלא</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>אימייל</Label>
              <Input
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>סיסמה</Label>
              <Input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>תפקיד</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="user">לומד</option>
                <option value="admin">מנהל</option>
              </select>
            </div>
            {editing && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-semibold">איפוס סיסמה</p>
                <div className="space-y-1.5">
                  <Label>סיסמה חדשה</Label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      dir="ltr"
                      autoComplete="new-password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPw ? "הסתרת סיסמה" : "הצגת סיסמה"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>אימות סיסמה חדשה</Label>
                  <div className="relative">
                    <Input
                      type={showPw2 ? "text" : "password"}
                      dir="ltr"
                      autoComplete="new-password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw2((v) => !v)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPw2 ? "הסתרת סיסמה" : "הצגת סיסמה"}
                    >
                      {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {resetError && <p className="text-xs text-destructive">{resetError}</p>}
                <Button variant="outline" onClick={resetPassword} disabled={resetting}>
                  {resetting ? "מאפס..." : "איפוס סיסמה"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "שומר..." : "שמירה"}
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
        title="האם למחוק את המשתמש?"
        description={toDelete ? `המשתמש "${toDelete.fullName}" יימחק.` : undefined}
        onConfirm={() => {
          if (toDelete) {
            adminStore.deleteUser(toDelete.id);
            toast({ title: "המשתמש נמחק" });
            setToDelete(null);
          }
        }}
      />

      <AdminUserProgressDialog
        userId={progressUser?.id ?? null}
        userName={progressUser?.fullName}
        userRole={progressUser?.role}
        onClose={() => setProgressUser(null)}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
