import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

const translateAuthError = (msg: string): string => {
  const m = (msg || "").toLowerCase();
  if (m.includes("weak") && m.includes("password"))
    return "הסיסמה שבחרת חלשה וקלה לניחוש. יש לבחור סיסמה אחרת.";
  if (m.includes("should be at least") || m.includes("at least 6"))
    return "הסיסמה חייבת להכיל לפחות 6 תווים.";
  if (m.includes("same as the old") || m.includes("same_password") || m.includes("different from the old"))
    return "הסיסמה החדשה חייבת להיות שונה מהסיסמה הקיימת.";
  if (m.includes("session") && (m.includes("expired") || m.includes("missing") || m.includes("invalid")))
    return "פג תוקף קישור האיפוס. יש לבקש קישור חדש.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "בוצעו יותר מדי ניסיונות. יש לנסות שוב מאוחר יותר.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "שגיאת רשת. יש לבדוק את החיבור ולנסות שוב.";
  return "שגיאה בעדכון הסיסמה. יש לנסות שוב.";
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let recovered = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recovered = true;
        setHasRecoverySession(true);
        setReady(true);
      } else if (session && !ready) {
        // Recovery link auto-signs the user in; treat as valid recovery context
        setHasRecoverySession(true);
        setReady(true);
      }
    });

    // Fallback: check existing session after a short delay
    const timer = setTimeout(async () => {
      if (!recovered) {
        const { data } = await supabase.auth.getSession();
        setHasRecoverySession(!!data.session);
        setReady(true);
      }
    }, 800);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [ready]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    setSubmitting(true);
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (upErr) {
      setError(translateAuthError(upErr.message));
      return;
    }
    setSuccess("הסיסמה עודכנה בהצלחה");
    try {
      localStorage.removeItem("auth.rememberedCredentials");
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 1500);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background flex items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-md animate-in fade-in duration-500">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="האקדמיה הדיגיטלית לביטוח" className="h-14 w-auto" />
        </div>
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              איפוס סיסמה
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              בחר/י סיסמה חדשה לחשבונך
            </p>
          </div>

          {!ready ? (
            <div className="text-center text-muted-foreground text-sm">טוען…</div>
          ) : !hasRecoverySession ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                קישור האיפוס אינו תקף או שפג תוקפו. נסה/י לבקש קישור חדש.
              </div>
              <Button onClick={() => navigate("/login", { replace: true })} className="w-full">
                חזרה להתחברות
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">סיסמה חדשה</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">אימות סיסמה</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive text-center">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-foreground text-center">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full text-base font-semibold"
                disabled={submitting || !!success}
              >
                עדכון סיסמה
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;