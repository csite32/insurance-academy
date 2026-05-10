import { Check, Lock } from "lucide-react";
import type { Chapter } from "@/data/courseDetail";
import { cn } from "@/lib/utils";

type Props = {
  chapters: Chapter[];
  activeLessonId: string;
  completedIds: string[];
  isLessonLocked: (id: string) => boolean;
  onSelect: (id: string) => void;
};

const LessonSidebar = ({ chapters, activeLessonId, completedIds, isLessonLocked, onSelect }: Props) => {
  // Build a continuous numbering across chapters
  const numbering = new Map<string, number>();
  let counter = 0;
  chapters.forEach((ch) => ch.lessons.forEach((l) => numbering.set(l.id, ++counter)));

  return (
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
                const num = numbering.get(l.id) ?? 0;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(l.id)}
                      disabled={locked}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground",
                        locked && "cursor-not-allowed"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          isActive && "bg-primary text-primary-foreground",
                          !isActive && isDone && "bg-accent text-accent-foreground",
                          !isActive && !isDone && !locked && "bg-foreground text-background",
                          locked && "bg-muted text-muted-foreground"
                        )}
                      >
                        {num}
                      </span>
                      <span className={cn("flex-1 truncate", locked && "text-muted-foreground")}>
                        {l.title}
                      </span>
                      {isDone && !locked && (
                        <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={3} />
                      )}
                      {locked && (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
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
};

export default LessonSidebar;