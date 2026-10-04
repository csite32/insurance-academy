import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CourseActionButtonProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
};

const CourseActionButton = ({ to, children, className }: CourseActionButtonProps) => (
  <Button asChild className={cn("course-action-button group/course-action", className)}>
    <Link to={to}>
      <span className="course-action-button__label">{children}</span>
      <span className="course-action-button__pill" aria-hidden="true">
        <ChevronLeft className="course-action-button__icon" />
      </span>
    </Link>
  </Button>
);

export default CourseActionButton;