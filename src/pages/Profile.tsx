import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserCircle2,
  Camera,
  Library,
  Rocket,
  Trophy,
  Activity,
  ChevronLeft,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStore, useAdminStoreHydration, getIcon } from "@/data/adminStore";
import type { CourseProgress, CourseStatus } from "@/hooks/useCourseProgress";
import { getCourseAccess } from "@/lib/access";

type CourseRow = {
  id: string;
  title: string;
  description: string;
  icon: any;
  totalLessons: number;
  completedLessons: number;
  percent: number;
  status: CourseStatus;
  lastLessonId: string | null;
  startedAt: string | null;
  accessKind: "full" | "partial";
};

const readProgress = (userId: string, courseId: string): CourseProgress | null => {
  try {
    const raw = localStorage.getItem(`progress:${userId}:${courseId}`);
    return raw ? (JSON.parse(raw) as CourseProgress) : null;
  } catch {
    return null;
  }
};

const statusLabel: Record<CourseStatus, string> = {
  not_started: "לא התחיל",
  in_progress: "בתהליך",
  completed: "הושלם",
};

const statusClasses: Record<CourseStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-emerald-100 text-emerald-700",
};

const Profile = () => {
  useAdminStoreHydration();
  const { user, uploadAvatar, removeAvatar } = useAuth();
  const adminCourses = useAdminStore((s) => s.courses);
  const adminLessons = useAdminStore((s) => s.lessons);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const rows: CourseRow[] = useMemo(() => {
    if (!user) return [];
    const assigned = user.assignedCourses ?? [];
    const assignedLessons = user.assignedLessons ?? [];
    const isAdmin = user.role === "admin";
    return adminCourses
      .filter((c) => c.status === "active")
      .map((c) => {
        const access = getCourseAccess(c.id, assigned, assignedLessons, isAdmin);
        if (access.kind === "none") return null;
        const courseLessonIds = adminLessons
          .filter((l) => l.courseId === c.id)
          .map((l) => l.id);
        const availableIds =
          access.kind === "partial"
            ? courseLessonIds.filter((id) => access.lessonIds.has(id))
            : courseLessonIds;
        const totalLessons = availableIds.length;
        const p = readProgress(user.id, c.id);
        const completedLessons =
          p?.completedLessonIds.filter((id) => availableIds.includes(id)).length ?? 0;
        const percent =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const status: CourseStatus =
          completedLessons === 0
            ? "not_started"
            : completedLessons >= totalLessons && totalLessons > 0
              ? "completed"
              : "in_progress";
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          icon: getIcon(c.iconKey),
          totalLessons,
          completedLessons,
          percent,
          status,
          lastLessonId: p?.lastLessonId ?? null,
          startedAt: p?.startedAt ?? null,
          accessKind: access.kind,
        } as CourseRow;
      })
      .filter((r): r is CourseRow => r !== null);
  }, [user, adminCourses, adminLessons]);

  if (!user) return null;

  const totalLessons = rows.reduce((s, r) => s + r.totalLessons, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completedLessons, 0);
  const overall = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;

  const continueCourse =
    rows
      .filter((r) => r.status === "in_progress")
      .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))[0] ??
    rows.find((r) => r.status === "not_started") ??
    rows[0];

  let continueLessonTitle = "";
  if (continueCourse) {
    const courseLessons = adminLessons
      .filter((l) => l.courseId === continueCourse.id)
      .sort((a, b) => a.order - b.order);
    const lesson =
      courseLessons.find((l) => l.id === continueCourse.lastLessonId) ??
      courseLessons[0];
    continueLessonTitle = lesson?.title ?? "";
  }

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("יש לבחור קובץ תמונה בלבד");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("גודל מקסימלי לתמונה הוא 2MB");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);
    try {
      await uploadAvatar(file);
      setPreviewUrl(null);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error("[avatar] upload failed", err);
      setUploadError("העלאת התמונה נכשלה, נסי שוב");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const onRemoveAvatar = async () => {
    setUploadError(null);
    setPreviewUrl(null);
    try {
      await removeAvatar();
    } catch (err) {
      console.error("[avatar] remove failed", err);
      setUploadError("הסרת התמונה נכשלה");
    }
  };

  const displayedAvatar = previewUrl ?? user.avatarUrl;

  const roleLabel = user.role === "admin" ? "מנהל מערכת" : "לומד";

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 md:py-12 space-y-6 md:space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-10 shadow-card animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              האזור האישי שלך
            </div>
            <h1 className="mt-3 text-2xl md:text-4xl font-extrabold text-foreground">
              שלום, {user.fullName}
            </h1>
            <p className="mt-2 text-base md:text-lg text-foreground/80">
              ברוך הבא לאזור הלמידה האישי שלך
            </p>
            <p className="mt-1 text-sm md:text-base text-muted-foreground max-w-2xl">
              כאן ניתן לעקוב אחר הקורסים שלך, לחזור לשיעור האחרון ולהמשיך להתקדם בקצב שלך.
            </p>
          </div>
        </section>

        {/* Profile + Stats grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {/* Profile card */}
          <div className="lg:col-span-1 rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {displayedAvatar ? (
                  <img
                    src={displayedAvatar}
                    alt={user.fullName}
                    className="h-24 w-24 rounded-full object-cover border-4 border-card shadow-card"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                    <UserCircle2 className="h-20 w-20 text-muted-foreground" strokeWidth={1.2} />
                  </div>
                )}
                <button
                  onClick={onPickFile}
                  disabled={uploading}
                  aria-label="עדכון תמונה"
                  className="absolute -bottom-1 -left-1 rounded-full bg-primary text-primary-foreground p-2 shadow-glow hover:brightness-110 transition disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
              <h2 className="mt-4 text-xl font-bold">{user.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
                {roleLabel}
              </span>

              <div className="mt-4 flex flex-col gap-2 w-full">
                <button
                  onClick={onPickFile}
                  disabled={uploading}
                  className="w-full rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 transition disabled:opacity-60"
                >
                  {uploading ? "מעלה..." : "עדכון תמונה"}
                </button>
                {(user.avatarUrl || previewUrl) && (
                  <button
                    onClick={onRemoveAvatar}
                    disabled={uploading}
                    className="w-full rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    הסרת תמונה
                  </button>
                )}
                {uploadError && (
                  <p className="text-xs text-destructive">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4 md:gap-5 auto-rows-fr">
            {[
              { icon: Library, label: "קורסים משויכים", value: rows.length },
              { icon: Rocket, label: "קורסים בתהליך", value: inProgress },
              { icon: Trophy, label: "שיעורים שהושלמו", value: totalCompleted },
              { icon: Activity, label: "התקדמות כללית", value: `${overall}%` },
            ].map((s) => (
              <div
                key={s.label}
                className="group relative flex flex-col-reverse items-center text-center md:flex-row md:items-center md:text-right gap-3 md:gap-5 rounded-3xl border border-border bg-card p-5 md:p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-primary/40 overflow-hidden min-h-[130px] md:min-h-[160px]"
              >
                <div className="absolute -top-10 -left-10 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition-opacity duration-300 group-hover:opacity-80" aria-hidden />
                <div className="relative md:flex-1 w-full md:w-auto text-center md:text-right">
                  <p className="text-3xl md:text-5xl font-extrabold text-foreground leading-none tracking-tight">
                    {s.value}
                  </p>
                  <p className="text-muted-foreground mt-3 md:mt-4 md:text-base leading-tight text-sm min-h-[2.5em] flex items-center justify-center md:min-h-0 md:block">
                    {s.label}
                  </p>
                </div>
                <div className="relative flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
                  <s.icon className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.6} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Continue learning */}
        {continueCourse && (
          <section className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-card animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                  <PlayCircle className="h-7 w-7" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary tracking-wide">המשך למידה</p>
                  <h3 className="mt-1 text-xl font-bold truncate">{continueCourse.title}</h3>
                  {continueLessonTitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      שיעור אחרון: {continueLessonTitle}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all duration-700"
                        style={{ width: `${continueCourse.percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground/80 shrink-0">
                      {continueCourse.percent}%
                    </span>
                  </div>
                </div>
              </div>
              <Link
                to={`/course/${continueCourse.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 transition shrink-0"
              >
                {continueCourse.status === "not_started" ? "התחלת למידה" : "המשך לשיעור"}
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* My courses */}
        <section className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold">הקורסים שלי</h2>
            <span className="text-sm text-muted-foreground">{rows.length} קורסים</span>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              לא משויכים אליך כרגע קורסים.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {rows.map((row) => {
                const Icon = row.icon;
                const ctaLabel =
                  row.status === "completed"
                    ? "צפייה בקורס"
                    : row.status === "in_progress"
                      ? "המשך למידה"
                      : "התחלת קורס";
                return (
                  <article
                    key={row.id}
                    className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                        <Icon className="h-6 w-6 text-foreground/80" strokeWidth={1.6} />
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusClasses[row.status]}`}
                      >
                        {statusLabel[row.status]}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{row.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {row.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {row.completedLessons}/{row.totalLessons} שיעורים
                      </span>
                      <span className="font-semibold text-foreground">{row.percent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all duration-700"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>

                    <Link
                      to={`/course/${row.id}`}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 transition"
                    >
                      {ctaLabel}
                      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;