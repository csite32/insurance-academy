import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h1", "h2", "h3", "h4",
  "ul", "ol", "li", "blockquote", "a", "span", "code", "pre",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

/** Heuristic: does this stored value already contain rich-text HTML? */
export const isHtmlContent = (value: string): boolean =>
  /<(p|br|h[1-4]|ul|ol|li|strong|em|b|i|u|a|blockquote)\b[^>]*>/i.test(value);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Convert legacy plain-text content (or freshly generated AI text) into HTML
 * paragraphs, preserving blank-line paragraph breaks and single line breaks.
 * Content that is already HTML is returned untouched (only sanitized).
 */
export const toEditorHtml = (value: string): string => {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (isHtmlContent(raw)) return sanitizeHtml(raw);
  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
};

/** Sanitize stored HTML before rendering it anywhere in the app. */
export const sanitizeHtml = (value: string): string =>
  DOMPurify.sanitize(value ?? "", { ALLOWED_TAGS, ALLOWED_ATTR });

/** True when the HTML holds no visible content (empty editor output). */
export const isEmptyHtml = (value: string): boolean =>
  !value || value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
