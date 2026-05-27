import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ListOrdered,
  PlayCircle,
  Users,
  LinkIcon,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStoreHydration, useAdminHydrated } from "@/data/adminStore";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/courses", label: "קורסים", icon: BookOpen },
  { to: "/admin/chapters", label: "פרקים", icon: ListOrdered },
  { to: "/admin/lessons", label: "שיעורים", icon: PlayCircle },
  { to: "/admin/users", label: "משתמשים", icon: Users },
  { to: "/admin/assignments", label: "שיוך קורסים", icon: LinkIcon },
];

const AdminLayout = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useAdminStoreHydration();
  const hydrated = useAdminHydrated();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-muted/40">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden rounded-lg border border-border bg-card p-2"
              onClick={() => setOpen(!open)}
              aria-label="תפריט"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/admin" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold">אזור ניהול</p>
                <p className="text-[11px] text-muted-foreground">
                  האקדמיה הדיגיטלית לביטוח
                </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold">{user?.fullName}</span>
              <span className="text-[11px] text-muted-foreground">
                {user?.email}
              </span>
            </div>
            <Link
              to="/"
              className="hidden md:inline-flex rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition"
            >
              חזרה לאתר
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              יציאה
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky lg:top-16 inset-y-0 right-0 z-30 w-64 border-l border-border bg-card transition-transform duration-200 lg:translate-x-0 lg:h-[calc(100vh-4rem)] ${
            open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <nav className="flex flex-col gap-1 p-4">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <LogOut className="h-4 w-4" />
              יציאה
            </button>
          </nav>
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-20 bg-foreground/30 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-10">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="animate-in fade-in duration-300">{children}</div>
          {!hydrated && (
            <div
              className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center"
              aria-live="polite"
            >
              <div className="rounded-full border border-border bg-card/90 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-card">
                טוען נתונים...
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
