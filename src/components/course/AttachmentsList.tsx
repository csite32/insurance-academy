import { Download } from "lucide-react";
import type { Attachment } from "@/data/courseDetail";

const AttachmentsList = ({ items }: { items: Attachment[] }) => (
  <section>
    <h3 className="mb-3 text-lg font-bold">מסמכים מצורפים</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => {
        const Icon = a.icon;
        return (
          <a
            key={a.id}
            href={a.url}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
              <Icon className="h-5 w-5 text-foreground/80" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold">{a.name}</div>
              {a.size && <div className="text-xs text-muted-foreground">{a.size}</div>}
            </div>
            <Download className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          </a>
        );
      })}
    </div>
  </section>
);

export default AttachmentsList;