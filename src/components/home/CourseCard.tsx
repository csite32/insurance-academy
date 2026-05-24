import { ChevronLeft, BookOpen, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import type { Course } from "@/data/courses";

const CourseCard = ({ course }: { course: Course }) => {
  const Icon = course.icon;
  const locked = course.locked;
  return (
    <article
      className={`group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 ${
        locked
          ? "opacity-75"
          : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover"
      }`}
    >
      {course.accessTag === "selected" && (
        <span className="absolute right-4 top-4 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold text-accent-foreground ring-1 ring-accent/30">
          שיעורים נבחרים
        </span>
      )}
      {/* Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-foreground/80" strokeWidth={1.5} />
      </div>

      {/* Title + desc */}
      <h3 className="mt-5 text-center text-xl font-bold text-foreground">{course.title}</h3>
      <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
        {course.description}
      </p>

      {/* Meta */}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" strokeWidth={1.5} />
        <span>{course.lessons} שיעורים</span>
      </div>

      {/* Action */}
      <div className="mt-5">
        {locked ? (
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-medium text-muted-foreground cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            אין לך גישה לקורס
          </button>
        ) : (
          <Link
            to={`/course/${course.id}`}
            className="group/btn flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:brightness-110"
          >
            כניסה לקורס
            <ChevronLeft className="h-4 w-4 transition-transform group-hover/btn:-translate-x-1" />
          </Link>
        )}
      </div>
    </article>
  );
};

export default CourseCard;