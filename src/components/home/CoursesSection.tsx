import { courses } from "@/data/courses";
import CourseCard from "./CourseCard";
import SectionTitle from "./SectionTitle";

const CoursesSection = () => (
  <section id="courses" className="container py-14 lg:py-20">
    <SectionTitle title="הקורסים שלי" subtitle="בחרו תחום והתחילו ללמוד" />
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  </section>
);

export default CoursesSection;