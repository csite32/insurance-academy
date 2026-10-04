import { BookOpen, Lock } from "lucide-react";
import type { Course } from "@/data/courses";
import CourseActionButton from "@/components/course/CourseActionButton";
import { Button } from "@/components/ui/button";

const courseCardTones = ["course-card--orange", "course-card--olive", "course-card--yellow"] as const;

const getCourseCardTone = (courseId: string) => {
  const hash = Array.from(courseId).reduce((total, character) => total + character.charCodeAt(0), 0);
  return courseCardTones[hash % courseCardTones.length];
};

const CourseCard = ({ course }: { course: Course }) => {
  const Icon = course.icon;
  const locked = course.locked;
  const tone = getCourseCardTone(course.id);
  return (
    <article
      className={`course-card group relative flex h-full min-h-[21rem] flex-col overflow-hidden rounded-[20px] border border-border bg-card p-[22px] text-right shadow-card transition-all duration-300 ${tone} ${
        locked
          ? "opacity-75"
          : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover"
      }`}
    >
      <span className="course-card__shape" aria-hidden="true" />
      {course.accessTag === "selected" && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-accent/40 px-3 py-1 text-[11px] font-semibold text-foreground ring-1 ring-accent/60">
          שיעורים נבחרים
        </span>
      )}

      <div className="course-card__icon relative flex h-14 w-14 items-center justify-center rounded-[18px]">
        <Icon className="h-7 w-7" strokeWidth={1.8} />
      </div>

      <h3 className="relative mt-4 text-xl font-bold text-foreground">{course.title}</h3>
      <p className="relative mt-2 min-h-[2.625rem] text-sm leading-relaxed text-muted-foreground">
        {course.description}
      </p>

      <div className="relative mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <BookOpen className="h-4 w-4" strokeWidth={1.5} />
        <span>{course.lessons} שיעורים</span>
      </div>

      <div className="relative mt-auto pt-5">
        {locked ? (
          <Button
            disabled
            className="h-12 w-full cursor-not-allowed rounded-full bg-muted px-5 text-sm font-medium text-muted-foreground"
          >
            <Lock className="h-4 w-4" />
            אין לך גישה לקורס
          </Button>
        ) : (
          <CourseActionButton to={`/course/${course.id}`}>
            כניסה לקורס
          </CourseActionButton>
        )}
      </div>
    </article>
  );
};

export default CourseCard;