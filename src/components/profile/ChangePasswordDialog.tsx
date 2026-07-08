import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ChangePasswordDialog = ({ open, onOpenChange }: Props) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirm("");
    setShowPassword(false);
    setShowConfirm(false);
    setError(null);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      setSaving(false);
      setError("נדרשת התחברות מחדש כדי לשנות סיסמה");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      console.error("[password] update failed", updateError);
      const msg = updateError.message?.toLowerCase() || "";
      if (
        msg.includes("weak") ||
        msg.includes("strength") ||
        msg.includes("pwned") ||
        msg.includes("hibp") ||
        msg.includes("compromised")
      ) {
        setError(
          "הסיסמה חלשה מדי. יש לבחור סיסמה חזקה יותר הכוללת אותיות, מספרים ותו מיוחד."
        );
      } else if (msg.includes("same")) {
        setError("לא ניתן לבחור בסיסמה הזהה לסיסמה הנוכחית.");
      } else {
        setError("שינוי הסיסמה נכשל, נסה שוב.");
      }
      return;
    }

    toast.success("הסיסמה עודכנה בהצלחה");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 justify-start">
            <KeyRound className="h-5 w-5 text-primary" />
            שינוי סיסמה
          </DialogTitle>
          <DialogDescription>
            בחרי סיסמה חדשה באורך 8 תווים לפחות.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-sm font-medium">
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-10 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              אימות סיסמה חדשה
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-10 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "הסתרת סיסמה" : "הצגת סיסמה"}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 transition disabled:opacity-60"
            >
              {saving ? "מעדכן..." : "שמירת סיסמה"}
            </button>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
              className="rounded-full border border-border px-5 py-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              ביטול
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;