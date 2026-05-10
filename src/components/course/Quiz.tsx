import { useMemo, useState } from "react";
import { Check, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Quiz as QuizType } from "@/data/courseDetail";

type Props = {
  quiz: QuizType;
  lessonCompleted: boolean;
};

const Quiz = ({ quiz, lessonCompleted }: Props) => {
  const locked = quiz.isUnlockedAfterLessonCompletion && !lessonCompleted;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const allAnswered = quiz.questions.every((q) => answers[q.id]);
  const score = useMemo(
    () => quiz.questions.filter((q) => answers[q.id] === q.correctAnswer).length,
    [answers, quiz.questions]
  );
  const allCorrect = checked && score === quiz.questions.length;

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

  const onSelect = (qid: string, ans: string) => {
    if (checked) return;
    setAnswers((p) => ({ ...p, [qid]: ans }));
  };

  const onCheck = () => setChecked(true);
  const onReset = () => {
    setChecked(false);
    setAnswers({});
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{quiz.title}</h3>
          <p className="text-xs text-muted-foreground">
            {quiz.questions.length} שאלות
          </p>
        </div>
        {checked && allCorrect && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            <Check className="h-3.5 w-3.5" />
            החידון הושלם
          </span>
        )}
      </div>

      <ol className="space-y-5">
        {quiz.questions.map((q, idx) => {
          const selected = answers[q.id];
          return (
            <li key={q.id} className="space-y-2">
              <p className="font-semibold">
                {idx + 1}. {q.question}
              </p>
              <ul className="space-y-2">
                {q.answers.map((ans) => {
                  const isSelected = selected === ans;
                  const showCorrect = checked && ans === q.correctAnswer;
                  const showWrong =
                    checked && isSelected && ans !== q.correctAnswer;
                  return (
                    <li key={ans}>
                      <button
                        type="button"
                        onClick={() => onSelect(q.id, ans)}
                        disabled={checked}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-right text-sm transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:bg-muted",
                          showCorrect && "border-accent bg-accent/10",
                          showWrong && "border-destructive bg-destructive/10"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-primary"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {isSelected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </span>
                        <span className="flex-1">{ans}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!checked ? (
          <Button onClick={onCheck} disabled={!allAnswered}>
            בדיקת תשובות
          </Button>
        ) : (
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            נסה שוב
          </Button>
        )}

        {checked && (
          <span
            className={cn(
              "text-sm font-semibold",
              allCorrect ? "text-accent" : "text-destructive"
            )}
          >
            {allCorrect
              ? `כל הכבוד! ${score}/${quiz.questions.length} תשובות נכונות 🎉`
              : `ענית נכון על ${score} מתוך ${quiz.questions.length}, נסה שוב.`}
          </span>
        )}
      </div>
    </section>
  );
};

export default Quiz;