import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Quiz as QuizType } from "@/data/courseDetail";

const Quiz = ({ quiz }: { quiz: QuizType }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isCorrect = checked && selected === quiz.correctOptionId;
  const isWrong = checked && selected !== quiz.correctOptionId;

  const onCheck = () => {
    if (!selected) return;
    setChecked(true);
    if (selected === quiz.correctOptionId) setCompleted(true);
  };

  const onReset = () => {
    setChecked(false);
    setSelected(null);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">חידון קצר</h3>
        {completed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            <Check className="h-3.5 w-3.5" />
            החידון הושלם
          </span>
        )}
      </div>

      <p className="mb-4 font-semibold text-foreground">{quiz.question}</p>

      <ul className="space-y-2">
        {quiz.options.map((opt) => {
          const isSelected = selected === opt.id;
          const showCorrect = checked && opt.id === quiz.correctOptionId;
          const showWrong = checked && isSelected && opt.id !== quiz.correctOptionId;
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => !checked && setSelected(opt.id)}
                disabled={checked}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted",
                  showCorrect && "border-accent bg-accent/10",
                  showWrong && "border-destructive bg-destructive/10"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border",
                    isSelected ? "border-primary" : "border-muted-foreground/40"
                  )}
                >
                  {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <span className="flex-1">{opt.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        {!checked ? (
          <Button onClick={onCheck} disabled={!selected}>
            בדיקת תשובה
          </Button>
        ) : (
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            נסה שוב
          </Button>
        )}

        {isCorrect && (
          <span className="text-sm font-semibold text-accent">תשובה נכונה! כל הכבוד 🎉</span>
        )}
        {isWrong && (
          <span className="text-sm font-semibold text-destructive">התשובה אינה נכונה, נסה שוב.</span>
        )}
      </div>
    </section>
  );
};

export default Quiz;