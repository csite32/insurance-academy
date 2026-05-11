import CourseCard from "./CourseCard";
import SectionTitle from "./SectionTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStore, getIcon } from "@/data/adminStore";
import type { Course } from "@/data/courses";

const CoursesSection = () => {
  const { user } = useAuth();
  const courses = useAdminStore((s) => s.courses);
  const lessons = useAdminStore((s) => s.lessons);
  const assigned = user?.assignedCourses ?? [];
  const isAdmin = user?.role === "admin";
  const visible: Course[] = courses
    .filter((c) => c.status === "active")
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      lessons: lessons.filter((l) => l.courseId === c.id).length,
      icon: getIcon(c.iconKey),
      locked: !isAdmin && !assigned.includes(c.id),
    }));
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