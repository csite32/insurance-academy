import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ListOrdered, Lock } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CourseHeader from "@/components/course/CourseHeader";
import LessonSidebar from "@/components/course/LessonSidebar";
import LessonContent from "@/components/course/LessonContent";
import CompletionCard from "@/components/course/CompletionCard";
import SimulatorCard from "@/components/course/SimulatorCard";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { currentUser, getFlatLessons } from "@/data/courseDetail";
import { buildCourseDetailFromStore } from "@/data/courseFromStore";
import { useAdminStore } from "@/data/adminStore";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useAuth } from "@/contexts/AuthContext";

const CoursePage = () => {
  const { id = "" } = useParams();
  const { user } = useAuth();
  // Re-render when admin store changes
  useAdminStore((s) => s.courses);
  useAdminStore((s) => s.chapters);
  useAdminStore((s) => s.lessons);
  const resolvedCourse = buildCourseDetailFromStore(id);
  const notFound = !resolvedCourse;
  const isAdmin = user?.role === "admin";
  const hasAccess =
    !!resolvedCourse &&
    (isAdmin || (user?.assignedCourses ?? []).includes(resolvedCourse.id));
  const course =
    resolvedCourse ?? {
      id: id || "missing",
      title: "",
      description: "",
      learningMode: "free" as const,
      chapters: [],
      assignedUserIds: [],
      active: false,
    };

  const flatLessons = useMemo(() => getFlatLessons(course), [course]);
  const total = flatLessons.length;

  const { progress, setLastLesson, toggleComplete, percent, completedCount } =
    useCourseProgress(user?.id ?? currentUser.id, course.id, total);

  const initialLessonId = progress.lastLessonId ?? flatLessons[0]?.id ?? "";
  const [activeId, setActiveId] = useState(initialLessonId);

  useEffect(() => {
    if (activeId) setLastLesson(activeId);
  }, [activeId, setLastLesson]);

  const activeIndex = flatLessons.findIndex((l) => l.id === activeId);
  const activeLesson = flatLessons[activeIndex] ?? flatLessons[0];

  const isLessonLocked = (lessonId: string) => {
    if (course.learningMode === "free") return false;
    const idx = flatLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return false;
    for (let i = 0; i < idx; i++) {
      if (!progress.completedLessonIds.includes(flatLessons[i].id)) return true;
    }
    return false;
  };

  const goPrev = () => {
    if (activeIndex > 0) setActiveId(flatLessons[activeIndex - 1].id);
  };
  const goNext = () => {
    const next = flatLessons[activeIndex + 1];
    if (next && !isLessonLocked(next.id)) setActiveId(next.id);
  };

  const nextLesson = flatLessons[activeIndex + 1];
  const nextLocked = nextLesson ? isLessonLocked(nextLesson.id) : false;

  const handleSelect = (lid: string) => {
    if (isLessonLocked(lid)) return;
    setActiveId(lid);
  };

  const isCompleted = activeLesson
    ? progress.completedLessonIds.includes(activeLesson.id)
    : false;
  const courseDone = progress.status === "completed";

  const sidebar = (
    <LessonSidebar
      chapters={course.chapters}
      activeLessonId={activeId}
      completedIds={progress.completedLessonIds}
      isLessonLocked={isLessonLocked}
      onSelect={handleSelect}
    />
  );

  if (notFound) {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <Header />
        <main className="container py-20 text-center">
          <h1 className="text-3xl font-bold text-foreground">הקורס לא נמצא</h1>
          <p className="mt-3 text-muted-foreground">
            ייתכן שהקורס הוסר או שהקישור שגוי.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <Header />
        <main className="container py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-foreground">אין לך גישה לקורס</h1>
          <p className="mt-3 text-muted-foreground">
            הקורס לא שויך אליך. פנה למנהל המערכת לקבלת גישה.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:bg-primary"
          >
            חזרה לעמוד הבית
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <CourseHeader
        title={course.title}
        description={course.description}
        completed={completedCount}
        total={total}
        percent={percent}
      />

      <main className="container py-8">
        <div className="mb-4 lg:hidden">
          <Sheet>
            <SheetTrigger className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold shadow-card">
              <ListOrdered className="h-4 w-4" />
              רשימת שיעורים
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto bg-background p-4">
              <SheetHeader>
                <SheetTitle className="text-right">תוכן הקורס</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{sidebar}</div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="hidden lg:block">{sidebar}</div>
          <div className="min-w-0 space-y-8">
            {activeLesson && (
              <LessonContent
                lesson={activeLesson}
                isCompleted={isCompleted}
                onToggleComplete={() => toggleComplete(activeLesson.id)}
                onPrev={goPrev}
                onNext={goNext}
                hasPrev={activeIndex > 0}
                hasNext={!!nextLesson}
                nextLocked={nextLocked}
              />
            )}
            {courseDone && (
              <>
                <CompletionCard />
                <SimulatorCard />
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CoursePage;
