import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { sanitizeHtml, toEditorHtml } from "@/lib/richText";

type Props = {
  /** Raw stored content: either rich HTML or legacy plain text. */
  content: string;
  className?: string;
};

/**
 * Renders lesson content for the student side. Legacy plain text is converted
 * to paragraphs; HTML is sanitized before being rendered.
 */
const RichContent = ({ content, className }: Props) => {
  const html = useMemo(() => sanitizeHtml(toEditorHtml(content ?? "")), [content]);
  if (!html) return null;
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none leading-7 text-foreground/90 md:prose-base",
        "prose-headings:font-bold prose-headings:text-foreground",
        "prose-strong:text-foreground prose-a:text-primary prose-li:marker:text-primary",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default RichContent;
