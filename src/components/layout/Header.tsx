import { LogOut, UserCircle2, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "עמוד בית", href: "/", activePattern: /^\/$/ },
  { label: "הקורסים שלי", href: "#courses", activePattern: /^\/course/ },
  { label: "אזור אישי", href: "/profile", activePattern: /^\/profile$/ },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  const displayName = user?.fullName ?? "";
  const isAdmin = user?.role === "admin";

  const handleCoursesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === "/") {
      document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#courses");
      setTimeout(() => {
        document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center shrink-0">
          <img src={logo} alt="מנדי גפנר סוכנות לביטוח" className="h-12 w-auto" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = item.activePattern.test(location.pathname);
            const isCourses = item.href === "#courses";
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={isCourses ? handleCoursesClick : undefined}
                className={`group relative text-[15px] font-medium transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-foreground"
                }`}
              >
                {item.label}
                <span
                  className={`absolute -bottom-2 right-0 left-0 h-0.5 rounded-full bg-primary transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        {/* Right cluster (user, logout) */}
        <div className="hidden lg:flex items-center gap-4">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              אזור ניהול
            </Link>
          )}
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 transition-shadow hover:shadow-card"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <UserCircle2 className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            )}
            <span className="text-sm font-medium">שלום, {displayName}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            התנתקות
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden rounded-lg border border-border bg-card p-2"
          aria-label="תפריט"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-border bg-card">
          <div className="container flex flex-col gap-1 py-4">
            {navItems.map((item) => {
              const isActive = item.activePattern.test(location.pathname);
              const isCourses = item.href === "#courses";
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    setOpen(false);
                    if (isCourses) handleCoursesClick(e);
                  }}
                  className={`rounded-lg px-3 py-3 text-base font-medium ${
                    isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-primary hover:bg-primary/10"
              >
                אזור ניהול
              </Link>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                )}
                <span className="text-sm font-medium">שלום, {displayName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                התנתקות
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
