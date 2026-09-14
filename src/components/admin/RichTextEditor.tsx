import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo2,
  Redo2,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toEditorHtml, isEmptyHtml } from "@/lib/richText";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const ToolbarButton = ({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      active && "border-primary/30 bg-primary/10 text-primary"
    )}
  >
    {children}
  </button>
);

const Toolbar = ({ editor }: { editor: Editor }) => (
  <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 px-2 py-1.5">
    <ToolbarButton
      title="פסקה"
      active={editor.isActive("paragraph")}
      onClick={() => editor.chain().focus().setParagraph().run()}
    >
      <Pilcrow className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      title="כותרת ראשית"
      active={editor.isActive("heading", { level: 2 })}
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
    >
      <Heading2 className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      title="כותרת משנה"
      active={editor.isActive("heading", { level: 3 })}
      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
    >
      <Heading3 className="h-4 w-4" />
    </ToolbarButton>
    <span className="mx-1 h-5 w-px bg-border" />
    <ToolbarButton
      title="מודגש"
      active={editor.isActive("bold")}
      onClick={() => editor.chain().focus().toggleBold().run()}
    >
      <Bold className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      title="רשימת בולטים"
      active={editor.isActive("bulletList")}
      onClick={() => editor.chain().focus().toggleBulletList().run()}
    >
      <List className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      title="רשימה ממוספרת"
      active={editor.isActive("orderedList")}
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
    >
      <ListOrdered className="h-4 w-4" />
    </ToolbarButton>
    <span className="mx-1 h-5 w-px bg-border" />
    <ToolbarButton
      title="הוספת קישור"
      active={editor.isActive("link")}
      onClick={() => {
        const prev = (editor.getAttributes("link").href as string) ?? "";
        const url = window.prompt("כתובת הקישור:", prev);
        if (url === null) return;
        if (!url.trim()) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        const href = /^(https?:|mailto:|tel:)/i.test(url.trim())
          ? url.trim()
          : `https://${url.trim()}`;
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }}
    >
      <LinkIcon className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton
      title="הסרת קישור"
      onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
    >
      <Unlink className="h-4 w-4" />
    </ToolbarButton>
    <span className="mx-1 h-5 w-px bg-border" />
    <ToolbarButton title="בטל" onClick={() => editor.chain().focus().undo().run()}>
      <Undo2 className="h-4 w-4" />
    </ToolbarButton>
    <ToolbarButton title="בצע שוב" onClick={() => editor.chain().focus().redo().run()}>
      <Redo2 className="h-4 w-4" />
    </ToolbarButton>
  </div>
);

/**
 * Lightweight rich-text editor (Tiptap) for the lesson "content" field.
 * Accepts either HTML or legacy plain text and always emits HTML.
 */
const RichTextEditor = ({ value, onChange, placeholder }: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        dir: "rtl",
        class:
          "prose prose-sm max-w-none min-h-[9rem] px-3 py-2 focus:outline-none prose-headings:font-bold prose-a:text-primary prose-li:marker:text-primary",
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(isEmptyHtml(html) ? "" : html);
    },
  });

  // Sync external value changes (opening a lesson, AI "replace content", reset).
  useEffect(() => {
    if (!editor) return;
    const incoming = toEditorHtml(value);
    const current = editor.getHTML();
    const bothEmpty = isEmptyHtml(incoming) && isEmptyHtml(current);
    if (!bothEmpty && incoming !== current) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {placeholder && isEmptyHtml(value) && (
        <p className="pointer-events-none -mt-8 px-3 text-sm text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
};

export default RichTextEditor;
