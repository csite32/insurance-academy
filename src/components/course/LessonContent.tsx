import { Check, ChevronRight, ChevronLeft, Lock } from "lucide-react";
import type { Lesson } from "@/data/courseDetail";
import { Button } from "@/components/ui/button";
import VideoPlayer from "./VideoPlayer";
import AttachmentsList from "./AttachmentsList";

type Props = {
  lesson: Lesson;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  nextLocked: boolean;
};

const LessonContent = ({
  lesson,
  isCompleted,
  onToggleComplete,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  nextLocked,
}: Props) => (
  <article className="space-y-6">
    <header>
      <h2 className="text-2xl font-bold md:text-3xl">{lesson.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">{lesson.shortDescription}</p>
    </header>

    {lesson.videoUrl && <VideoPlayer url={lesson.videoUrl} title={lesson.title} />}

    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="leading-7 text-foreground/90">{lesson.content}</p>
    </section>

    {lesson.attachments && lesson.attachments.length > 0 && (
      <AttachmentsList items={lesson.attachments} />
    )}

    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button
        variant={isCompleted ? "secondary" : "default"}
        onClick={onToggleComplete}
        className="gap-2"
      >
        <Check className="h-4 w-4" />
        {isCompleted ? "סומן כהושלם" : "סמן כהושלם"}
      </Button>

      <div className="ms-auto flex items-center gap-2">
        <Button variant="outline" onClick={onPrev} disabled={!hasPrev} className="gap-1">
          <ChevronRight className="h-4 w-4" />
          הקודם
        </Button>
        <Button onClick={onNext} disabled={!hasNext || nextLocked} className="gap-1">
          {nextLocked ? <Lock className="h-4 w-4" /> : null}
          הבא
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </article>
);

export default LessonContent;