import { Download, Eye } from "lucide-react";
import { useState } from "react";
import type { Attachment } from "@/data/courseDetail";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

const AttachmentsList = ({ items, lessonId }: { items: Attachment[]; lessonId?: string }) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAttachmentObjectUrl = async (
    a: Attachment,
    mode: "view" | "download",
  ): Promise<string | null> => {
    const lid = lessonId ?? a.lessonId;
    if (!a.storagePath || !lid) return null;
    setBusyId(a.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast({
          title: "לא ניתן לפתוח את הקובץ",
          description: "אין התחברות פעילה",
          variant: "destructive",
        });
        return null;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-attachment-url`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ lessonId: lid, path: a.storagePath, mode }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || contentType.includes("application/json")) {
        let message = "שגיאה";
        try {
          const j = await res.json();
          message = j?.error ?? message;
        } catch {
          /* ignore */
        }
        toast({
          title: "לא ניתן לפתוח את הקובץ",
          description: message,
          variant: "destructive",
        });
        return null;
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      toast({
        title: "שגיאה",
        description: e instanceof Error ? e.message : "שגיאה לא ידועה",
        variant: "destructive",
      });
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const handleView = async (a: Attachment) => {
    if (!a.storagePath) {
      window.open(a.url, "_blank", "noopener,noreferrer");
      return;
    }
    const url = await fetchAttachmentObjectUrl(a, "view");
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDownload = async (a: Attachment) => {
    if (!a.storagePath) {
      const link = document.createElement("a");
      link.href = a.url;
      link.download = a.name;
      link.click();
      return;
    }
    const url = await fetchAttachmentObjectUrl(a, "download");
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((a) => {
        const Icon = a.icon;
        const busy = busyId === a.id;
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
              <Button
                size="sm"
                variant="outline"
                className="gap-1 px-2.5"
                onClick={() => handleView(a)}
                disabled={busy}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">צפייה</span>
              </Button>
              {!a.isLink && (
                <Button
                  size="sm"
                  className="gap-1 px-2.5"
                  onClick={() => handleDownload(a)}
                  disabled={busy}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">הורדה</span>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttachmentsList;