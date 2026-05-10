import { Trophy } from "lucide-react";

const CompletionCard = () => (
  <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
      <Trophy className="h-6 w-6 text-primary" />
    </div>
    <h3 className="text-xl font-bold">כל הכבוד! סיימת את הקורס</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      בקרוב יתווסף כאן מודול סימולציה מבוסס AI לתרגול מעשי של החומר.
    </p>
  </section>
);

export default CompletionCard;