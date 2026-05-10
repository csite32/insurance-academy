import { Lock, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const SimulatorCard = () => (
  <section className="rounded-2xl border border-dashed border-primary/40 bg-card p-6 shadow-card">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
        <MessagesSquare className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold">סימולטור שיחה מול לקוח</h3>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            בפיתוח עתידי
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          מודול זה יאפשר בעתיד לתרגל שיחה מקצועית מול לקוח בהתאם לחומר שנלמד בקורס.
        </p>
        <Button disabled className="mt-4 gap-2" variant="secondary">
          <Lock className="h-4 w-4" />
          הסימולטור ייפתח בהמשך
        </Button>
      </div>
    </div>
  </section>
);

export default SimulatorCard;