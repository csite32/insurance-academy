import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Upload, Loader2, GripVertical, Sparkles } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  adminStore,
  useAdminStore,
  type AdminLesson,
} from "@/data/adminStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { QuizData, QuizQuestionData } from "@/lib/db/lessonsDb";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  description: string;
  videoUrl: string;
  content: string;
  courseId: string;
  chapterId: string;
  hasQuiz: boolean;
  isLocked: boolean;
  attachments: AttachmentEntry[];
  quizTitle: string;
  quizQuestions: QuizQuestionData[];
};

type AttachmentType = "pdf" | "doc" | "ppt" | "link";
type AttachmentEntry = { name: string; url: string; type: AttachmentType };

const ATTACHMENT_TYPE_LABEL: Record<AttachmentType, string> = {
  pdf: "PDF",
  doc: "מסמך",
  ppt: "מצגת",
  link: "קישור חיצוני",
};

const parseAttachmentRaw = (raw: string): AttachmentEntry => {
  try {
    if (raw.trim().startsWith("{")) {
      const o = JSON.parse(raw) as Partial<AttachmentEntry>;
      return {
        name: o.name ?? "",
        url: o.url ?? "",
        type: (o.type as AttachmentType) ?? "link",
      };
    }
  } catch { /* ignore */ }
  return { name: raw, url: "", type: "link" };
};

const serializeAttachment = (a: AttachmentEntry): string =>
  JSON.stringify({ name: a.name.trim(), url: a.url.trim(), type: a.type });

const inferTypeFromName = (name: string): AttachmentType => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "doc";
  if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
  return "link";
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^\w.\-]+/g, "_").slice(0, 120);

const DEFAULT_CORRECT_FEEDBACK = "כל הכבוד! התשובה שלך נכונה.";
const DEFAULT_WRONG_FEEDBACK = "כמעט... כדאי לעבור שוב על הנושא ולנסות שנית.";

const newBlankQuestion = (): QuizQuestionData => ({
  id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  question: "",
  answers: ["", "", "", ""],
  correctAnswer: "",
  correctFeedback: DEFAULT_CORRECT_FEEDBACK,
  wrongFeedback: DEFAULT_WRONG_FEEDBACK,
});

const isValidQuestion = (q: QuizQuestionData): boolean => {
  if (!q.question.trim()) return false;
  const answers = (q.answers ?? []).map((a) => a.trim());
  if (answers.length < 2 || answers.some((a) => !a)) return false;
  if (!q.correctAnswer.trim()) return false;
  return answers.includes(q.correctAnswer.trim());
};

type SortableLessonRowProps = {
  lesson: AdminLesson;
  chapterTitle: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const SortableLessonRow = ({
  lesson,
  chapterTitle,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: SortableLessonRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    background: isDragging ? "hsl(var(--muted))" : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-t border-border">
      <td className="p-3 font-bold text-muted-foreground">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            aria-label="גרור לסידור"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span>{lesson.order}</span>
        </div>
      </td>
      <td className="p-3 font-semibold">{lesson.title}</td>
      <td className="p-3 text-muted-foreground">{chapterTitle || "—"}</td>
      <td className="p-3">
        {lesson.hasQuiz ? (
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
            כן
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">לא</span>
        )}
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="rounded-lg p-2 hover:bg-muted disabled:opacity-40 transition"
            aria-label="למעלה"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="rounded-lg p-2 hover:bg-muted disabled:opacity-40 transition"
            aria-label="למטה"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-2 hover:bg-muted hover:text-primary transition"
            aria-label="עריכה"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive transition"
            aria-label="מחיקה"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const AdminLessons = () => {
  const courses = useAdminStore((s) => s.courses);
  const chapters = useAdminStore((s) => s.chapters);
  const lessons = useAdminStore((s) => s.lessons);

  const [filterCourseId, setFilterCourseId] = useState(courses[0]?.id ?? "");

  // Sync the course filter with the hydrated courses list. After
  // logout/login the store rehydrates async, so the initial useState value
  // may be "" or a stale id — fall back to the first available course.
  useEffect(() => {
    if (courses.length === 0) return;
    const exists = courses.some((c) => c.id === filterCourseId);
    if (!filterCourseId || !exists) {
      setFilterCourseId(courses[0].id);
    }
  }, [courses, filterCourseId]);
  const [editing, setEditing] = useState<AdminLesson | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    videoUrl: "",
    content: "",
    courseId: filterCourseId,
    chapterId: "",
    hasQuiz: false,
    isLocked: false,
    attachments: [],
    quizTitle: "",
    quizQuestions: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [quizError, setQuizError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminLesson | null>(null);
  const { toast } = useToast();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadIdx = useRef<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  const generateQuiz = async () => {
    const groqKey = localStorage.getItem('groq_api_key') ?? '';
    const vimeoToken = localStorage.getItem('vimeo_token') ?? '';
    const vimeoUrl = form.videoUrl.trim();
    if (!groqKey) {
      toast({ title: "יש להגדיר Groq API Key בדשבורד", variant: "destructive" });
      return;
    }
    if (!vimeoToken) {
      toast({ title: "יש להגדיר Vimeo API Token בדשבורד", variant: "destructive" });
      return;
    }
    if (!vimeoUrl) {
      toast({ title: "יש להוסיף קישור Vimeo לשיעור לפני יצירת חידון", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiStatus("מוריד כתוביות מהסרטון...");
    try {
      const { data: tData, error: tErr } = await supabase.functions.invoke('vimeo-transcribe', {
        body: { vimeo_url: vimeoUrl, vimeo_token: vimeoToken },
      });
      if (tErr) {
    const serverError = (tData as { error?: string })?.error;
    throw new Error(serverError || tErr.message);
  }
  if ((tData as { error?: string })?.error) throw new Error((tData as { error: string }).error);

      setAiStatus("יוצר שאלות עם AI...");
      const prompt = `צור חידון של 5 שאלות רב-ברירה בעברית בהתבסס על התמלול הבא.
החזר JSON בלבד. פורמט: [{"q":"שאלה","o":["א","ב","ג","ד"],"a":0,"f":["פידבק א","פידבק ב","פידבק ג","פידבק ד"]}]
כללים: a = אינדקס התשובה הנכונה (0-3). f = 4 פידבקים אחד לכל תשובה. הכל בעברית.
תמלול:\n${((tData as { transcript?: string }).transcript ?? '').slice(0, 6000)}`;

      const qRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });
      if (!qRes.ok) throw new Error('Groq API error: ' + qRes.statusText);
      const qData = await qRes.json() as { choices: { message: { content: string } }[] };
      let parsed = JSON.parse(qData.choices[0].message.content.trim()) as
        Array<{ q: string; o: string[]; a: number; f?: string[] }> | Record<string, unknown>;
      if (!Array.isArray(parsed)) {
        parsed = (parsed as Record<string, unknown>).questions as typeof parsed
               ?? Object.values(parsed)[0] as typeof parsed;
      }
      const questions: QuizQuestionData[] = (parsed as Array<{ q: string; o: string[]; a: number; f?: string[] }>)
        .map((raw) => ({
          id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          question: raw.q,
          answers: raw.o,
          correctAnswer: raw.o[raw.a] ?? raw.o[0] ?? '',
          correctFeedback: raw.f?.[raw.a] ?? DEFAULT_CORRECT_FEEDBACK,
          wrongFeedback: DEFAULT_WRONG_FEEDBACK,
          optionFeedbacks: raw.f,
        }));
      setForm((f) => ({
        ...f,
        quizQuestions: questions,
        quizTitle: f.quizTitle.trim() || 'חידון השיעור',
      }));
      setAiStatus(null);
      toast({ title: `נוצרו ${questions.length} שאלות בהצלחה` });
    } catch (e) {
      setAiStatus(`שגיאה: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const uploadFileForRow = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const safe = sanitizeFileName(file.name);
      const path = `lessons/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("lesson-attachments")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("lesson-attachments").getPublicUrl(path);
      const next = [...form.attachments];
      const prev = next[idx] ?? { name: "", url: "", type: "link" as AttachmentType };
      next[idx] = {
        name: prev.name?.trim() ? prev.name : file.name,
        url: data.publicUrl,
        type: inferTypeFromName(file.name),
      };
      setForm({ ...form, attachments: next });
      toast({ title: "הקובץ הועלה" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "שגיאה בהעלאת קובץ";
      toast({ title: "העלאה נכשלה", description: msg, variant: "destructive" });
    } finally {
      setUploadingIdx(null);
    }
  };

  const courseChapters = useMemo(
    () => chapters.filter((c) => c.courseId === filterCourseId).sort((a, b) => a.order - b.order),
    [chapters, filterCourseId]
  );

  const courseLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.courseId === filterCourseId)
        .sort((a, b) => {
          const ca = chapters.find((c) => c.id === a.chapterId)?.order ?? 0;
          const cb = chapters.find((c) => c.id === b.chapterId)?.order ?? 0;
          if (ca !== cb) return ca - cb;
          return a.order - b.order;
        }),
    [lessons, chapters, filterCourseId]
  );

  // Group lessons by chapter (chapters in order) for per-chapter DnD.
  const lessonGroups = useMemo(() => {
    return courseChapters.map((ch) => ({
      chapter: ch,
      lessons: lessons
        .filter((l) => l.chapterId === ch.id)
        .sort((a, b) => a.order - b.order),
    }));
  }, [courseChapters, lessons]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeLesson = lessons.find((l) => l.id === activeId);
    const overLesson = lessons.find((l) => l.id === overId);
    if (!activeLesson || !overLesson) return;
    // Restrict drags to within the same chapter.
    if (activeLesson.chapterId !== overLesson.chapterId) return;
    const sameChapter = lessons
      .filter((l) => l.chapterId === activeLesson.chapterId)
      .sort((a, b) => a.order - b.order);
    const oldIndex = sameChapter.findIndex((l) => l.id === activeId);
    const newIndex = sameChapter.findIndex((l) => l.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sameChapter, oldIndex, newIndex).map((l) => l.id);
    void adminStore.reorderLessons(activeLesson.chapterId, reordered);
  };

  const formChapters = chapters
    .filter((c) => c.courseId === form.courseId)
    .sort((a, b) => a.order - b.order);

  const openCreate = () => {
    setForm({
      title: "",
      description: "",
      videoUrl: "",
      content: "",
      courseId: filterCourseId,
      chapterId: courseChapters[0]?.id ?? "",
      hasQuiz: false,
      isLocked: false,
      attachments: [],
      quizTitle: "",
      quizQuestions: [],
    });
    setErrors({});
    setQuizError(null);
    setCreating(true);
  };

  const openEdit = (l: AdminLesson) => {
    setForm({
      title: l.title,
      description: l.description,
      videoUrl: l.videoUrl ?? "",
      content: l.content ?? "",
      courseId: l.courseId,
      chapterId: l.chapterId,
      hasQuiz: l.hasQuiz,
      isLocked: l.isLocked,
      attachments: (l.attachments ?? []).map(parseAttachmentRaw),
      quizTitle: l.quiz?.title ?? "",
      quizQuestions: (l.quiz?.questions ?? []).map((q) => ({
        id: q.id,
        question: q.question,
        answers: [q.answers[0] ?? "", q.answers[1] ?? "", q.answers[2] ?? "", q.answers[3] ?? ""],
        correctAnswer: q.correctAnswer,
        correctFeedback: q.correctFeedback?.trim() ? q.correctFeedback : DEFAULT_CORRECT_FEEDBACK,
        wrongFeedback: q.wrongFeedback?.trim() ? q.wrongFeedback : DEFAULT_WRONG_FEEDBACK,
      })),
    });
    setErrors({});
    setQuizError(null);
    setEditing(l);
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) e.title = "שדה חובה";
    if (!form.courseId) e.courseId = "יש לבחור קורס";
    if (!form.chapterId) e.chapterId = "יש לבחור פרק";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const attachments = form.attachments
      .filter((a) => a.name.trim() && a.url.trim())
      .map(serializeAttachment);

    // Build quiz payload (or null) with validation.
    let quizPayload: QuizData | null = null;
    if (form.hasQuiz) {
      const cleaned = form.quizQuestions
        .map((q) => ({
          ...q,
          question: q.question.trim(),
          answers: q.answers.map((a) => a.trim()),
          correctAnswer: q.correctAnswer.trim(),
          correctFeedback: q.correctFeedback?.trim() || "",
          wrongFeedback: q.wrongFeedback?.trim() || "",
        }))
        .filter(isValidQuestion);
      if (cleaned.length === 0) {
        const msg =
          "יש להוסיף לפחות שאלה אחת תקינה (טקסט שאלה, 3 תשובות, תשובה נכונה מסומנת), או לבטל את 'כולל חידון'.";
        setQuizError(msg);
        toast({ title: "לא ניתן לשמור חידון ריק", description: msg, variant: "destructive" });
        return;
      }
      quizPayload = {
        title: form.quizTitle.trim() || "חידון השיעור",
        questions: cleaned,
      };
    }
    setQuizError(null);

    if (editing) {
      adminStore.updateLesson(editing.id, {
        title: form.title,
        description: form.description,
        videoUrl: form.videoUrl,
        content: form.content,
        courseId: form.courseId,
        chapterId: form.chapterId,
        hasQuiz: form.hasQuiz,
        isLocked: form.isLocked,
        attachments,
        quiz: quizPayload,
      });
      toast({ title: "השיעור עודכן" });
      setEditing(null);
    } else {
      adminStore.createLesson({
        title: form.title,
        description: form.description,
        videoUrl: form.videoUrl,
        content: form.content,
        attachments,
        courseId: form.courseId,
        chapterId: form.chapterId,
        hasQuiz: form.hasQuiz,
        isLocked: form.isLocked,
        quiz: quizPayload,
      });
      toast({ title: "שיעור חדש נוצר" });
      setCreating(false);
    }
  };

  const dialogOpen = creating || !!editing;

  return (
    <AdminLayout title="ניהול שיעורים" subtitle="יצירה, עריכה וסידור שיעורים">
      <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between mb-5">
        <div className="space-y-1.5 md:w-72">
          <Label>סינון לפי קורס</Label>
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate} disabled={courseChapters.length === 0}>
          <Plus className="h-4 w-4 ml-1" />
          שיעור חדש
        </Button>
      </div>

      {courseChapters.length === 0 && (
        <div className="mb-4 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          יש להוסיף תחילה פרק לקורס לפני יצירת שיעורים.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold w-20">סדר</th>
                <th className="p-3 font-semibold">שם השיעור</th>
                <th className="p-3 font-semibold">פרק</th>
                <th className="p-3 font-semibold">חידון</th>
                <th className="p-3 font-semibold w-44">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {courseLessons.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    אין שיעורים
                  </td>
                </tr>
              )}
              {lessonGroups.map((group) => (
                <SortableContext
                  key={group.chapter.id}
                  items={group.lessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {group.lessons.map((l, idx) => (
                    <SortableLessonRow
                      key={l.id}
                      lesson={l}
                      chapterTitle={group.chapter.title}
                      isFirst={idx === 0}
                      isLast={idx === group.lessons.length - 1}
                      onMoveUp={() => adminStore.moveLesson(l.id, "up")}
                      onMoveDown={() => adminStore.moveLesson(l.id, "down")}
                      onEdit={() => openEdit(l)}
                      onDelete={() => setToDelete(l)}
                    />
                  ))}
                </SortableContext>
              ))}
            </tbody>
          </table>
         </DndContext>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent dir="rtl" className="text-right max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "עריכת שיעור" : "שיעור חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>קורס</Label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value, chapterId: "" })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {errors.courseId && (
                  <p className="text-xs text-destructive">{errors.courseId}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>פרק</Label>
                <select
                  value={form.chapterId}
                  onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">בחר פרק</option>
                  {formChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {errors.chapterId && (
                  <p className="text-xs text-destructive">{errors.chapterId}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>שם השיעור</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>תיאור קצר</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>קישור וידאו (Vimeo embed)</Label>
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://player.vimeo.com/video/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>תוכן השיעור</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.hasQuiz}
                  onChange={(e) => setForm({ ...form, hasQuiz: e.target.checked })}
                />
                כולל חידון
              </label>
            </div>

            {form.hasQuiz && (
              <div className="space-y-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-accent">חידון השיעור</Label>
                  <Button
                    type="button" size="sm" disabled={aiLoading} onClick={generateQuiz}
                    className="gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 shadow-none"
                    variant="outline"
                  >
                    {aiLoading
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />יוצר...</>
                      : <><Sparkles className="h-3.5 w-3.5" />צור חידון מהסרטון</>}
                  </Button>
                </div>

                {aiStatus && (
                  <div className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    aiLoading
                      ? "border-primary/20 bg-primary/5 text-primary"
                      : "border-destructive/20 bg-destructive/5 text-destructive"
                  )}>
                    {aiLoading && <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />}
                    {aiStatus}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">כותרת החידון</Label>
                  <Input
                    value={form.quizTitle}
                    onChange={(e) => setForm({ ...form, quizTitle: e.target.value })}
                    placeholder="חידון השיעור"
                  />
                </div>

                {form.quizQuestions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    אין שאלות. הוסף לפחות שאלה אחת.
                  </p>
                )}

                {form.quizQuestions.map((q, qi) => (
                  <div
                    key={q.id}
                    className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        שאלה {qi + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = form.quizQuestions.filter((_, i) => i !== qi);
                          setForm({ ...form, quizQuestions: next });
                        }}
                        className="rounded-lg p-1.5 hover:bg-destructive/10 hover:text-destructive transition"
                        aria-label="מחיקת שאלה"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      value={q.question}
                      placeholder="טקסט השאלה"
                      onChange={(e) => {
                        const next = [...form.quizQuestions];
                        next[qi] = { ...q, question: e.target.value };
                        setForm({ ...form, quizQuestions: next });
                      }}
                    />
                    <div className="space-y-1.5">
                      {[0, 1, 2, 3].map((ai) => {
                        const ans = q.answers[ai] ?? "";
                        const isCorrect = q.correctAnswer && q.correctAnswer === ans;
                        return (
                          <div key={ai} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={!!isCorrect}
                              disabled={!ans.trim()}
                              onChange={() => {
                                const next = [...form.quizQuestions];
                                next[qi] = { ...q, correctAnswer: ans };
                                setForm({ ...form, quizQuestions: next });
                              }}
                              aria-label="סמן כתשובה נכונה"
                            />
                            <Input
                              value={ans}
                              placeholder={`תשובה ${ai + 1}`}
                              onChange={(e) => {
                                const next = [...form.quizQuestions];
                                const answers = [...q.answers];
                                const prev = answers[ai] ?? "";
                                answers[ai] = e.target.value;
                                let correctAnswer = q.correctAnswer;
                                if (correctAnswer && correctAnswer === prev) {
                                  correctAnswer = e.target.value;
                                }
                                next[qi] = { ...q, answers, correctAnswer };
                                setForm({ ...form, quizQuestions: next });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          פידבק לתשובה נכונה
                        </label>
                        <Textarea
                          rows={2}
                          value={q.correctFeedback ?? ""}
                          onChange={(e) => {
                            const next = [...form.quizQuestions];
                            next[qi] = { ...q, correctFeedback: e.target.value };
                            setForm({ ...form, quizQuestions: next });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          פידבק לתשובה שגויה
                        </label>
                        <Textarea
                          rows={2}
                          value={q.wrongFeedback ?? ""}
                          onChange={(e) => {
                            const next = [...form.quizQuestions];
                            next[qi] = { ...q, wrongFeedback: e.target.value };
                            setForm({ ...form, quizQuestions: next });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      quizQuestions: [...form.quizQuestions, newBlankQuestion()],
                    })
                  }
                >
                  <Plus className="h-4 w-4 ml-1" />
                  הוספת שאלה
                </Button>

                {quizError && (
                  <p className="text-xs font-semibold text-destructive">{quizError}</p>
                )}
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">קבצים נלווים</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      pendingUploadIdx.current = form.attachments.length;
                      setForm({
                        ...form,
                        attachments: [
                          ...form.attachments,
                          { name: "", url: "", type: "pdf" },
                        ],
                      });
                      // open picker on next tick
                      setTimeout(() => fileInputRef.current?.click(), 0);
                    }}
                  >
                    <Upload className="h-4 w-4 ml-1" />
                    העלאת קובץ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({
                        ...form,
                        attachments: [
                          ...form.attachments,
                          { name: "", url: "", type: "link" },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוספת קישור
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,.key,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  const idx = pendingUploadIdx.current;
                  pendingUploadIdx.current = null;
                  if (!file || idx === null) return;
                  void uploadFileForRow(idx, file);
                }}
              />
              {form.attachments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  לא נוספו קבצים. ניתן להוסיף PDF, מסמך, מצגת או קישור חיצוני.
                </p>
              )}
              {form.attachments.map((a, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-muted/30 p-2 md:grid-cols-[1fr_1.4fr_140px_auto] md:items-center"
                >
                  <Input
                    value={a.name}
                    placeholder="שם הקובץ"
                    onChange={(e) => {
                      const next = [...form.attachments];
                      next[idx] = { ...a, name: e.target.value };
                      setForm({ ...form, attachments: next });
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={a.url}
                      placeholder="כתובת קובץ או קישור"
                      onChange={(e) => {
                        const next = [...form.attachments];
                        next[idx] = { ...a, url: e.target.value };
                        setForm({ ...form, attachments: next });
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingIdx === idx}
                      onClick={() => {
                        pendingUploadIdx.current = idx;
                        fileInputRef.current?.click();
                      }}
                      aria-label="העלאת קובץ"
                      className="shrink-0"
                    >
                      {uploadingIdx === idx ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <select
                    value={a.type}
                    onChange={(e) => {
                      const next = [...form.attachments];
                      next[idx] = { ...a, type: e.target.value as AttachmentType };
                      setForm({ ...form, attachments: next });
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {(Object.keys(ATTACHMENT_TYPE_LABEL) as AttachmentType[]).map((t) => (
                      <option key={t} value={t}>
                        {ATTACHMENT_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const next = form.attachments.filter((_, i) => i !== idx);
                      setForm({ ...form, attachments: next });
                    }}
                    className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive transition justify-self-end"
                    aria-label="הסרה"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <Button onClick={submit}>שמירה</Button>
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="האם למחוק את השיעור?"
        description={toDelete ? `השיעור "${toDelete.title}" יימחק.` : undefined}
        onConfirm={() => {
          if (toDelete) {
            adminStore.deleteLesson(toDelete.id);
            toast({ title: "השיעור נמחק" });
            setToDelete(null);
          }
        }}
      />
    </AdminLayout>
  );
};

export default AdminLessons;
