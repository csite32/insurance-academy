import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  IDLE_LIMIT_MS,
  IDLE_WARN_MS,
  ensureActivityStamp,
  idleElapsed,
  markActivity,
  resetActivity,
} from "@/lib/idleTracker";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const LOGOUT_KEY = "idle:logout-signal";
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll", "input"] as const;

/** Auto sign-out after 30 min without real activity (per browser, synced across tabs). */
const IdleGuard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [remaining, setRemaining] = useState<number | null>(null);
  const loggingOut = useRef(false);
  const uid = user?.id ?? null;

  // Route change = activity.
  useEffect(() => {
    if (uid) markActivity();
  }, [uid, location.pathname]);

  useEffect(() => {
    if (!uid) {
      setRemaining(null);
      return;
    }
    loggingOut.current = false;
    ensureActivityStamp();

    const doLogout = async (broadcast: boolean) => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      setRemaining(null);
      if (broadcast) localStorage.setItem(LOGOUT_KEY, String(Date.now()));
      sessionStorage.setItem("idle:logged-out", "1");
      try {
        await logout({ local: true });
      } finally {
        navigate("/login?idle=1", { replace: true });
      }
    };

    const check = () => {
      const elapsed = idleElapsed();
      if (elapsed >= IDLE_LIMIT_MS) {
        void doLogout(true);
      } else if (elapsed >= IDLE_WARN_MS) {
        setRemaining(Math.ceil((IDLE_LIMIT_MS - elapsed) / 1000));
      } else {
        setRemaining(null);
      }
    };

    const onEvent = () => markActivity();
    EVENTS.forEach((e) => window.addEventListener(e, onEvent, { passive: true, capture: true }));
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_KEY && e.newValue) void doLogout(false);
      else check();
    };
    window.addEventListener("storage", onStorage);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    check();
    const timer = window.setInterval(check, 1000);

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onEvent, { capture: true }));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [uid, logout, navigate]);

  if (remaining === null) return null;
  const m = Math.floor(remaining / 60);
  const s = String(remaining % 60).padStart(2, "0");

  return (
    <AlertDialog open>
      <AlertDialogContent dir="rtl" className="max-w-md text-right">
        <AlertDialogHeader className="text-right sm:text-right">
          <AlertDialogTitle>החיבור עומד להסתיים</AlertDialogTitle>
          <AlertDialogDescription>
            לא זוהתה פעילות באתר. מטעמי אבטחה, המערכת תנתק אותך בעוד דקה.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-center text-3xl font-bold tabular-nums text-primary" aria-live="polite">
          {m}:{s}
        </p>
        <AlertDialogFooter className="sm:justify-start">
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              resetActivity();
              setRemaining(null);
            }}
          >
            המשך התחברות
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default IdleGuard;
