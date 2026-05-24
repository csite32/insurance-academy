import CourseCard from "./CourseCard";
import SectionTitle from "./SectionTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStore, useAdminStoreHydration, getIcon } from "@/data/adminStore";
import type { Course } from "@/data/courses";
import { getCourseAccess } from "@/lib/access";

const CoursesSection = () => {
  useAdminStoreHydration();
  const { user } = useAuth();
  const courses = useAdminStore((s) => s.courses);
  const lessons = useAdminStore((s) => s.lessons);
  const assigned = user?.assignedCourses ?? [];
  const assignedLessons = user?.assignedLessons ?? [];
  const isAdmin = user?.role === "admin";
  const visible: Course[] = courses
    .filter((c) => c.status === "active")
    .map((c) => {
      const access = getCourseAccess(c.id, assigned, assignedLessons, isAdmin);
      if (access.kind === "none") return null;
      const totalLessons =
        access.kind === "partial"
          ? access.lessonIds.size
          : lessons.filter((l) => l.courseId === c.id).length;
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        lessons: totalLessons,
        icon: getIcon(c.iconKey),
        locked: false,
        accessTag: access.kind === "partial" ? "selected" : "full",
      } as Course;
    })
    .filter((c): c is Course => c !== null);
  return (
    <section id="courses" className="container py-14 lg:py-20">
      <SectionTitle title="הקורסים שלי" subtitle="בחרו תחום והתחילו ללמוד" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </section>
  );
};

export default CoursesSection;