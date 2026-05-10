import { Check, Lock, PlayCircle } from "lucide-react";
import type { Chapter } from "@/data/courseDetail";
import { cn } from "@/lib/utils";

type Props = {
  chapters: Chapter[];
  activeLessonId: string;
  completedIds: string[];
  isLessonLocked: (id: string) => boolean;
  onSelect: (id: string) => void;
};

const LessonSidebar = ({ chapters, activeLessonId, completedIds, isLessonLocked, onSelect }: Props) => (
  <aside className="rounded-2xl border border-border bg-card p-4 shadow-card">
    <h2 className="mb-3 text-sm font-bold text-muted-foreground">תוכן הקורס</h2>
    <div className="space-y-5">
      {chapters.map((ch) => (
        <div key={ch.id}>
          <div className="mb-2 text-sm font-semibold">
            פרק {ch.order}: {ch.title}
          </div>
          <ul className="space-y-1">
            {ch.lessons.map((l) => {
              const isActive = l.id === activeLessonId;
              const isDone = completedIds.includes(l.id);
              const locked = isLessonLocked(l.id);
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(l.id)}
                    disabled={locked}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground",
                      locked && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center">
                      {locked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : isDone ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 truncate">{l.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  </aside>
);

export default LessonSidebar;