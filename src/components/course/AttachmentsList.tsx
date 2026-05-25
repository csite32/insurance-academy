import { Download, Eye } from "lucide-react";
import type { Attachment } from "@/data/courseDetail";
import { Button } from "@/components/ui/button";

const fileTypeLabel = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "PDF",
    doc: "Word",
    docx: "Word",
    xls: "Excel",
    xlsx: "Excel",
    ppt: "מצגת",
    pptx: "מצגת",
  };
  return map[ext] ?? ext.toUpperCase();
};

const AttachmentsList = ({ items }: { items: Attachment[] }) => (
  <div className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => {
        const Icon = a.icon;
        return (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="h-5 w-5 text-foreground/80" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{a.name}</div>
              <div className="text-xs text-muted-foreground">
                {fileTypeLabel(a.name)}
                {a.size ? ` · ${a.size}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button asChild size="sm" variant="outline" className="gap-1 px-2.5">
                <a href={a.url} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">צפייה</span>
                </a>
              </Button>
              <Button asChild size="sm" className="gap-1 px-2.5">
                <a href={a.url} download>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">הורדה</span>
                </a>
              </Button>
            </div>
          </div>
        );
      })}
  </div>
);

export default AttachmentsList;