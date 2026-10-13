// Shared, per-browser idle tracking. One timestamp in localStorage is shared by all tabs.
export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const IDLE_WARN_MS = 29 * 60 * 1000;

const KEY = "idle:last-activity";
const WRITE_THROTTLE_MS = 5000;

type Listener = () => void;
const activityListeners = new Set<Listener>();
let lastWrite = 0;

export function getLastActivity(): number {
  return Number(localStorage.getItem(KEY) || 0);
}

export function idleElapsed(): number {
  const last = getLastActivity();
  return last ? Date.now() - last : 0;
}

export function isIdleExpired(): boolean {
  const last = getLastActivity();
  return !!last && Date.now() - last >= IDLE_LIMIT_MS;
}

/** Force-reset (fresh login, "continue" button). */
export function resetActivity() {
  lastWrite = Date.now();
  localStorage.setItem(KEY, String(lastWrite));
  activityListeners.forEach((l) => l());
}

/**
 * Record real user/video activity. Ignored once the warning window has started —
 * only the explicit "continue" button may cancel it.
 */
export function markActivity() {
  const last = getLastActivity();
  if (last && Date.now() - last >= IDLE_WARN_MS) return;
  const now = Date.now();
  if (now - lastWrite < WRITE_THROTTLE_MS && last) return;
  lastWrite = now;
  localStorage.setItem(KEY, String(now));
  activityListeners.forEach((l) => l());
}

export function onActivity(l: Listener) {
  activityListeners.add(l);
  return () => {
    activityListeners.delete(l);
  };
}

export function ensureActivityStamp() {
  if (!getLastActivity()) resetActivity();
}

export function clearActivity() {
  localStorage.removeItem(KEY);
}
