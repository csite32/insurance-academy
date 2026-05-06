import { ChevronLeft, PlayCircle } from "lucide-react";

const ContinueLearning = () => (
  <section className="container py-10">
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[auto,1fr,auto] lg:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <PlayCircle className="h-8 w-8" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            המשך מהמקום בו עצרת
          </span>
          <h3 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
            קורס מכירות · שיעור 7 — סגירת עסקה אפקטיבית
          </h3>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-primary"
                style={{ width: "64%" }}
              />
            </div>
            <span className="shrink-0 text-sm font-semibold text-foreground">64%</span>
          </div>
        </div>

        <button className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all duration-300 hover:bg-primary">
          המשך שיעור
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>
    </div>
  </section>
);

export default ContinueLearning;