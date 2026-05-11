import { courses } from "@/data/courses";
import CourseCard from "./CourseCard";
import SectionTitle from "./SectionTitle";
import { useAuth } from "@/contexts/AuthContext";

const CoursesSection = () => {
  const { user } = useAuth();
  const assigned = user?.assignedCourses ?? [];
  const visible = courses.map((c) =>
    assigned.includes(c.id) ? c : { ...c, locked: true }
  );
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