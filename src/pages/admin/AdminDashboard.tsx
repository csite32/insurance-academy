import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Users, ListOrdered, PlayCircle, ChevronLeft, Key, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminStore } from "@/data/adminStore";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { courses, chapters, lessons, users } = useAdminStore((s) => s);
  const [status, setStatus] = useState<{ groq: boolean; vimeo: boolean } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    // Migration: purge any legacy keys that used to live in the browser.
    try {
      localStorage.removeItem('groq_api_key');
      localStorage.removeItem('vimeo_token');
    } catch { /* ignore */ }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke('ai-secrets-status');
      if (cancelled) return;
      if (error) {
        setStatusError('לא ניתן לבדוק את סטטוס המפתחות בשרת');
        return;
      }
      setStatus(data as { groq: boolean; vimeo: boolean });
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { label: "קורסים", value: courses.length, icon: BookOpen },
    { label: "פרקים", value: chapters.length, icon: ListOrdered },
    { label: "שיעורים", value: lessons.length, icon: PlayCircle },
    { label: "משתמשים", value: users.length, icon: Users },
  ];

  const recentCourses = courses.slice(-5).reverse();
  const recentUsers = users.slice(-5).reverse();

  return (
    <AdminLayout title="Dashboard" subtitle="סקירה כללית של המערכת">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-card flex items-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">קורסים אחרונים</h2>
            <Link
              to="/admin/courses"
              className="text-xs text-primary font-semibold inline-flex items-center"
            >
              לכל הקורסים
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {recentCourses.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">אין קורסים</li>
            )}
            {recentCourses.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <span className="font-medium">{c.title}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    c.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.status === "active" ? "פעיל" : "טיוטה"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">משתמשים אחרונים</h2>
            <Link
              to="/admin/users"
              className="text-xs text-primary font-semibold inline-flex items-center"
            >
              לכל המשתמשים
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {recentUsers.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-semibold">
                  {u.role === "admin" ? "מנהל" : "לומד"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">סטטוס מפתחות API</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          המפתחות מאוחסנים בצד השרת בלבד (Supabase Secrets) ואינם נחשפים לדפדפן.
          לעדכון או החלפה יש לפנות לניהול ה-Secrets בפרויקט.
        </p>
        <div className="max-w-md space-y-3">
          <SecretRow label="Groq API Key (GROQ_API_KEY)" state={status?.groq} loading={status === null && !statusError} />
          <SecretRow label="Vimeo API Token (VIMEO_API_TOKEN)" state={status?.vimeo} loading={status === null && !statusError} />
          {statusError && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {statusError}
            </p>
          )}
        </div>
      </section>
    </AdminLayout>
  );
};

const SecretRow = ({ label, state, loading }: { label: string; state?: boolean; loading: boolean }) => (
  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
    <span className="text-sm font-medium">{label}</span>
    {loading ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        בודק...
      </span>
    ) : state ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        מוגדר
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
        <AlertCircle className="h-3.5 w-3.5" />
        לא מוגדר
      </span>
    )}
  </div>
);

export default AdminDashboard;
