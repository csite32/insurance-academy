import { useState, FormEvent, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/logo.png";

const REMEMBER_KEY = "auth.rememberedCredentials";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { email?: string; password?: string };
        if (saved.email) setEmail(saved.email);
        if (saved.password) setPassword(saved.password);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "שגיאה בהתחברות");
      return;
    }
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      /* ignore */
    }
    navigate("/", { replace: true });
  };

  const onForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    setForgotSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      /* ignore — never reveal */
    }
    setForgotSubmitting(false);
    setForgotMessage(
      "אם כתובת האימייל קיימת במערכת, נשלח אליה קישור לאיפוס סיסמה."
    );
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
              האקדמיה הדיגיטלית לביטוח
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {mode === "login"
                ? "ברוכים הבאים, שנתחבר לאזור האישי?"
                : "איפוס סיסמה"}
            </p>
          </div>

          {mode === "login" ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                זכור סיסמה
              </Label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-semibold"
              disabled={submitting}
            >
              התחברות למערכת
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setForgotEmail(email);
                  setForgotMessage(null);
                }}
                className="text-sm text-primary hover:underline"
              >
                שכחת סיסמה?
              </button>
            </div>
          </form>
          ) : (
          <form onSubmit={onForgotSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">אימייל</Label>
              <Input
                id="forgot-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="text-right"
              />
            </div>
            {forgotMessage && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-foreground text-center">
                {forgotMessage}
              </div>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-semibold"
              disabled={forgotSubmitting}
            >
              שליחת קישור לאיפוס סיסמה
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setForgotMessage(null);
                }}
                className="text-sm text-primary hover:underline"
              >
                חזרה להתחברות
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
