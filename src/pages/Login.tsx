import { useState, FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "שגיאה בהתחברות");
      return;
    }
    navigate("/", { replace: true });
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
              ברוכים הבאים, שנתחבר לאזור האישי?
            </p>
          </div>

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

            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-semibold"
              disabled={submitting}
            >
              התחברות למערכת
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
          <p>משתמש דמו: demo@academy.co.il / 123456</p>
          <p>מנהל: admin@academy.co.il / 123456</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
