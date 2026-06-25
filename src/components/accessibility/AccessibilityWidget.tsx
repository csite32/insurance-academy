import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Accessibility,
  X,
  Plus,
  Minus,
  RotateCcw,
  Link as LinkIcon,
  Heading1,
  MousePointer2,
  Ruler,
  PauseCircle,
  ImageOff,
  Keyboard,
  Type,
  Contrast,
  Moon,
  Sun,
  Palette,
  AlignJustify,
} from "lucide-react";

/**
 * Accessibility Widget — תואם ת"י 5568 רמה AA, WCAG 2.1 AA.
 * Self-contained: state persists in localStorage and is re-applied
 * on every page load / route change via <html> classes & CSS vars.
 */

type Settings = {
  fontScale: number; // 1, 1.15, 1.3, 1.5, 1.75
  lineHeight: number; // 1, 1.5, 2
  letterSpacing: number; // 0, 0.05, 0.1 em
  wordSpacing: number; // 0, 0.1, 0.2 em
  readableFont: boolean;
  contrast: "none" | "high" | "dark" | "light" | "mono";
  invert: boolean;
  highlightLinks: boolean;
  highlightHeadings: boolean;
  bigCursor: boolean;
  readingGuide: boolean;
  readingMask: boolean;
  stopAnimations: boolean;
  hideImages: boolean;
  keyboardNav: boolean;
};

const DEFAULTS: Settings = {
  fontScale: 1,
  lineHeight: 1,
  letterSpacing: 0,
  wordSpacing: 0,
  readableFont: false,
  contrast: "none",
  invert: false,
  highlightLinks: false,
  highlightHeadings: false,
  bigCursor: false,
  readingGuide: false,
  readingMask: false,
  stopAnimations: false,
  hideImages: false,
  keyboardNav: false,
};

const STORAGE_KEY = "a11y-settings-v1";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function applySettings(s: Settings) {
  const html = document.documentElement;
  // Reset classes we own
  const cls = [
    "a11y-readable-font",
    "a11y-contrast-high",
    "a11y-contrast-dark",
    "a11y-contrast-light",
    "a11y-contrast-mono",
    "a11y-invert",
    "a11y-highlight-links",
    "a11y-highlight-headings",
    "a11y-big-cursor",
    "a11y-stop-animations",
    "a11y-hide-images",
    "a11y-keyboard-nav",
    "a11y-reading-mask",
  ];
  cls.forEach((c) => html.classList.remove(c));

  html.style.setProperty("--a11y-font-scale", String(s.fontScale));
  html.style.setProperty("--a11y-line-height", String(s.lineHeight));
  html.style.setProperty("--a11y-letter-spacing", `${s.letterSpacing}em`);
  html.style.setProperty("--a11y-word-spacing", `${s.wordSpacing}em`);

  if (s.readableFont) html.classList.add("a11y-readable-font");
  if (s.contrast !== "none") html.classList.add(`a11y-contrast-${s.contrast}`);
  if (s.invert) html.classList.add("a11y-invert");
  if (s.highlightLinks) html.classList.add("a11y-highlight-links");
  if (s.highlightHeadings) html.classList.add("a11y-highlight-headings");
  if (s.bigCursor) html.classList.add("a11y-big-cursor");
  if (s.stopAnimations) html.classList.add("a11y-stop-animations");
  if (s.hideImages) html.classList.add("a11y-hide-images");
  if (s.keyboardNav) html.classList.add("a11y-keyboard-nav");
  if (s.readingMask) html.classList.add("a11y-reading-mask");
}

const FONT_LEVELS = [1, 1.15, 1.3, 1.5, 1.75];
const LINE_LEVELS = [1, 1.5, 2];
const SPACING_LEVELS = [0, 0.05, 0.1];
const WORD_SPACING_LEVELS = [0, 0.1, 0.2];

function cycle<T>(arr: T[], current: T, dir: 1 | -1 = 1): T {
  const i = arr.indexOf(current);
  const next = (i + dir + arr.length) % arr.length;
  return arr[next];
}

const AccessibilityWidget = () => {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const maskTopRef = useRef<HTMLDivElement>(null);
  const maskBottomRef = useRef<HTMLDivElement>(null);

  // Apply on mount + whenever settings change
  useEffect(() => {
    applySettings(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Re-apply on route change (in case other code resets <html> classes)
  useEffect(() => {
    const onPop = () => applySettings(loadSettings());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Reading guide ruler
  useEffect(() => {
    if (!settings.readingGuide) return;
    const guide = guideRef.current;
    if (!guide) return;
    guide.style.display = "block";
    const move = (e: MouseEvent) => {
      guide.style.top = `${e.clientY}px`;
    };
    const focusMove = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.getBoundingClientRect) return;
      const r = t.getBoundingClientRect();
      guide.style.top = `${r.top + r.height / 2}px`;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("focusin", focusMove);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("focusin", focusMove);
      if (guide) guide.style.display = "none";
    };
  }, [settings.readingGuide]);

  // Reading mask
  useEffect(() => {
    if (!settings.readingMask) return;
    const top = maskTopRef.current;
    const bottom = maskBottomRef.current;
    if (!top || !bottom) return;
    const STRIP = 140;
    top.style.display = "block";
    bottom.style.display = "block";
    const move = (e: MouseEvent) => {
      top.style.height = `${Math.max(0, e.clientY - STRIP / 2)}px`;
      bottom.style.top = `${e.clientY + STRIP / 2}px`;
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      if (top) top.style.display = "none";
      if (bottom) bottom.style.display = "none";
    };
  }, [settings.readingMask]);

  // Focus trap + Esc + restore focus
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    focusables[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const list = Array.from(focusables);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      buttonRef.current?.focus();
    };
  }, [open]);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = () => {
    setSettings(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {/* Skip to main content link */}
      <a href="#main-content" className="a11y-skip-link">
        דלג לתוכן המרכזי
      </a>

      {/* Floating trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="תפריט נגישות"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="a11y-fab"
      >
        <Accessibility className="h-7 w-7" aria-hidden="true" />
      </button>

      {/* Reading guide ruler */}
      <div ref={guideRef} className="a11y-reading-guide" aria-hidden="true" />
      {/* Reading mask top/bottom */}
      <div ref={maskTopRef} className="a11y-mask a11y-mask-top" aria-hidden="true" />
      <div ref={maskBottomRef} className="a11y-mask a11y-mask-bottom" aria-hidden="true" />

      {/* Panel */}
      {open && (
        <div
          className="a11y-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-title"
            className="a11y-panel"
            dir="rtl"
          >
            <div className="a11y-panel-header">
              <h2 id="a11y-title" className="text-lg font-bold">
                תפריט נגישות
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירת תפריט נגישות"
                className="a11y-icon-btn"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="a11y-panel-body">
              <Section title="גודל טקסט">
                <Stepper
                  label="גודל גופן"
                  value={settings.fontScale}
                  onDec={() => update("fontScale", cycle(FONT_LEVELS, settings.fontScale, -1))}
                  onInc={() => update("fontScale", cycle(FONT_LEVELS, settings.fontScale, 1))}
                  display={`${Math.round(settings.fontScale * 100)}%`}
                />
                <Stepper
                  label="גובה שורה"
                  value={settings.lineHeight}
                  onDec={() => update("lineHeight", cycle(LINE_LEVELS, settings.lineHeight, -1))}
                  onInc={() => update("lineHeight", cycle(LINE_LEVELS, settings.lineHeight, 1))}
                  display={settings.lineHeight === 1 ? "רגיל" : `×${settings.lineHeight}`}
                />
                <Stepper
                  label="מרווח אותיות"
                  value={settings.letterSpacing}
                  onDec={() =>
                    update("letterSpacing", cycle(SPACING_LEVELS, settings.letterSpacing, -1))
                  }
                  onInc={() =>
                    update("letterSpacing", cycle(SPACING_LEVELS, settings.letterSpacing, 1))
                  }
                  display={settings.letterSpacing === 0 ? "רגיל" : `+${settings.letterSpacing}em`}
                />
                <Stepper
                  label="מרווח מילים"
                  value={settings.wordSpacing}
                  onDec={() =>
                    update("wordSpacing", cycle(WORD_SPACING_LEVELS, settings.wordSpacing, -1))
                  }
                  onInc={() =>
                    update("wordSpacing", cycle(WORD_SPACING_LEVELS, settings.wordSpacing, 1))
                  }
                  display={settings.wordSpacing === 0 ? "רגיל" : `+${settings.wordSpacing}em`}
                />
              </Section>

              <Section title="ניגודיות וצבע">
                <Toggle
                  icon={<Contrast className="h-4 w-4" aria-hidden="true" />}
                  label="ניגודיות גבוהה"
                  active={settings.contrast === "high"}
                  onClick={() =>
                    update("contrast", settings.contrast === "high" ? "none" : "high")
                  }
                />
                <Toggle
                  icon={<Moon className="h-4 w-4" aria-hidden="true" />}
                  label="מצב כהה"
                  active={settings.contrast === "dark"}
                  onClick={() =>
                    update("contrast", settings.contrast === "dark" ? "none" : "dark")
                  }
                />
                <Toggle
                  icon={<Sun className="h-4 w-4" aria-hidden="true" />}
                  label="מצב בהיר"
                  active={settings.contrast === "light"}
                  onClick={() =>
                    update("contrast", settings.contrast === "light" ? "none" : "light")
                  }
                />
                <Toggle
                  icon={<Palette className="h-4 w-4" aria-hidden="true" />}
                  label="גווני אפור"
                  active={settings.contrast === "mono"}
                  onClick={() =>
                    update("contrast", settings.contrast === "mono" ? "none" : "mono")
                  }
                />
                <Toggle
                  icon={<Contrast className="h-4 w-4" aria-hidden="true" />}
                  label="היפוך צבעים"
                  active={settings.invert}
                  onClick={() => update("invert", !settings.invert)}
                />
              </Section>

              <Section title="תוכן וקריאות">
                <Toggle
                  icon={<Type className="h-4 w-4" aria-hidden="true" />}
                  label="גופן קריא"
                  active={settings.readableFont}
                  onClick={() => update("readableFont", !settings.readableFont)}
                />
                <Toggle
                  icon={<LinkIcon className="h-4 w-4" aria-hidden="true" />}
                  label="הדגשת קישורים"
                  active={settings.highlightLinks}
                  onClick={() => update("highlightLinks", !settings.highlightLinks)}
                />
                <Toggle
                  icon={<Heading1 className="h-4 w-4" aria-hidden="true" />}
                  label="הדגשת כותרות"
                  active={settings.highlightHeadings}
                  onClick={() => update("highlightHeadings", !settings.highlightHeadings)}
                />
                <Toggle
                  icon={<ImageOff className="h-4 w-4" aria-hidden="true" />}
                  label="הסתרת תמונות"
                  active={settings.hideImages}
                  onClick={() => update("hideImages", !settings.hideImages)}
                />
              </Section>

              <Section title="ניווט וסיוע">
                <Toggle
                  icon={<MousePointer2 className="h-4 w-4" aria-hidden="true" />}
                  label="סמן מוגדל"
                  active={settings.bigCursor}
                  onClick={() => update("bigCursor", !settings.bigCursor)}
                />
                <Toggle
                  icon={<Ruler className="h-4 w-4" aria-hidden="true" />}
                  label="קו עזר לקריאה"
                  active={settings.readingGuide}
                  onClick={() => update("readingGuide", !settings.readingGuide)}
                />
                <Toggle
                  icon={<AlignJustify className="h-4 w-4" aria-hidden="true" />}
                  label="מסכת קריאה"
                  active={settings.readingMask}
                  onClick={() => update("readingMask", !settings.readingMask)}
                />
                <Toggle
                  icon={<PauseCircle className="h-4 w-4" aria-hidden="true" />}
                  label="עצירת אנימציות"
                  active={settings.stopAnimations}
                  onClick={() => update("stopAnimations", !settings.stopAnimations)}
                />
                <Toggle
                  icon={<Keyboard className="h-4 w-4" aria-hidden="true" />}
                  label="ניווט מקלדת מוגבר"
                  active={settings.keyboardNav}
                  onClick={() => update("keyboardNav", !settings.keyboardNav)}
                />
              </Section>

              <div className="a11y-footer-row">
                <button type="button" onClick={reset} className="a11y-reset-btn">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  איפוס הגדרות
                </button>
                <Link
                  to="/accessibility"
                  onClick={() => setOpen(false)}
                  className="a11y-statement-link"
                >
                  הצהרת נגישות
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="a11y-section">
    <h3 className="a11y-section-title">{title}</h3>
    <div className="a11y-section-grid">{children}</div>
  </section>
);

const Toggle = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`a11y-toggle ${active ? "a11y-toggle-on" : ""}`}
  >
    <span className="a11y-toggle-icon">{icon}</span>
    <span className="a11y-toggle-label">{label}</span>
  </button>
);

const Stepper = ({
  label,
  onDec,
  onInc,
  display,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  display: string;
}) => (
  <div className="a11y-stepper" role="group" aria-label={label}>
    <span className="a11y-stepper-label">{label}</span>
    <div className="a11y-stepper-controls">
      <button type="button" onClick={onDec} aria-label={`${label} - הקטנה`} className="a11y-icon-btn">
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="a11y-stepper-value" aria-live="polite">
        {display}
      </span>
      <button type="button" onClick={onInc} aria-label={`${label} - הגדלה`} className="a11y-icon-btn">
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
);

export default AccessibilityWidget;