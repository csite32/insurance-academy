import { useState } from "react";
import { Check, ChevronLeft, Lock, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Quiz as QuizType } from "@/data/courseDetail";

type Props = {
  quiz: QuizType;
  lessonCompleted: boolean;
};

const Quiz = ({ quiz, lessonCompleted }: Props) => {
  const locked = quiz.isUnlockedAfterLessonCompletion && !lessonCompleted;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const reset = () => {
    setCurrentIdx(0);
    setSelected(null);
    setChecked(false);
    setCorrectCount(0);
    setFinished(false);
  };

  if (locked) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-center shadow-card">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold">{quiz.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          החידון ייפתח לאחר השלמת השיעור
        </p>
      </section>
    );
  }

  const total = quiz.questions.length;

  if (finished) {
    const percent = Math.round((correctCount / total) * 100);
    const success = percent >= 60;
    return (
      <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <div
          className={cn(
            "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
            success ? "bg-accent/15 text-accent" : "bg-destructive/10 text-destructive"
          )}
        >
          {success ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
        </div>
        <h3 className="text-xl font-bold">סיכום החידון</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          ענית נכון על {correctCount} מתוך {total} שאלות
        </p>
        <p className={cn("mt-1 text-2xl font-bold", success ? "text-accent" : "text-destructive")}>
          {percent}%
        </p>
        <p className="mt-2 text-sm font-semibold">
          {success ? "כל הכבוד! עברת את החידון בהצלחה 🎉" : "כמעט שם — נסה שוב"}
        </p>
        <Button onClick={reset} variant="outline" className="mt-4 gap-2">
          <RotateCcw className="h-4 w-4" />
          נסה שוב
        </Button>
      </section>
    );
  }

  const q = quiz.questions[currentIdx];
  const progress = Math.round(((currentIdx + (checked ? 1 : 0)) / total) * 100);
  const isCorrect = checked && selected === q.correctAnswer;
  const isWrong = checked && selected !== q.correctAnswer;

  const onCheck = () => {
    if (!selected) return;
    setChecked(true);
    if (selected === q.correctAnswer) setCorrectCount((c) => c + 1);
  };

  const onNext = () => {
    if (currentIdx + 1 >= total) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setChecked(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">{quiz.title}</h3>
        <span className="text-xs font-semibold text-muted-foreground">
          שאלה {currentIdx + 1} מתוך {total}
        </span>
      </div>

      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mb-4 font-semibold">{q.question}</p>

      <ul className="space-y-2">
        {q.answers.map((ans) => {
          const isSelected = selected === ans;
          const showCorrect = checked && ans === q.correctAnswer;
          const showWrong = checked && isSelected && ans !== q.correctAnswer;
          return (
            <li key={ans}>
              <button
                type="button"
                onClick={() => !checked && setSelected(ans)}
                disabled={checked}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-right text-sm transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted",
                  showCorrect && "border-accent bg-accent/10",
                  showWrong && "border-destructive bg-destructive/10",
                  checked && "cursor-not-allowed"
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
                <span className="flex-1">{ans}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {checked && (
        <div
          className={cn(
            "mt-4 rounded-xl border p-3 text-sm font-semibold",
            isCorrect
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          {isCorrect ? (
            <span>{q.correctFeedback?.trim() || "כל הכבוד! התשובה שלך נכונה."}</span>
          ) : (
            <span>
              {q.wrongFeedback?.trim() || "כמעט... כדאי לעבור שוב על הנושא ולנסות שנית."}
            </span>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {!checked ? (
          <Button onClick={onCheck} disabled={!selected}>
            בדיקת תשובה
          </Button>
        ) : (
          <Button onClick={onNext} className="gap-1">
            {currentIdx + 1 >= total ? "סיום החידון" : "לשאלה הבאה"}
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
    </section>
  );
};

export default Quiz;