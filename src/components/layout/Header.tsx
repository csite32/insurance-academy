import { Bell, ChevronDown, LogOut, UserCircle2, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

const navItems = [
  { label: "עמוד בית", href: "/", active: true },
  { label: "הקורסים שלי", href: "#courses" },
  { label: "אזור אישי", href: "#profile" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center shrink-0">
          <img src={logo} alt="מנדי גפנר סוכנות לביטוח" className="h-12 w-auto" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`relative text-[15px] font-medium transition-colors hover:text-primary ${
                item.active ? "text-primary" : "text-foreground"
              }`}
            >
              {item.label}
              {item.active && (
                <span className="absolute -bottom-2 right-0 left-0 h-0.5 rounded-full bg-primary" />
              )}
            </a>
          ))}
        </nav>

        {/* Right cluster (user, bell, logout) */}
        <div className="hidden lg:flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 transition-shadow hover:shadow-card">
            <UserCircle2 className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm font-medium">שלום, יוסי לוי</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            aria-label="התראות"
            className="relative rounded-full border border-border bg-card p-2 transition-colors hover:border-primary"
          >
            <Bell className="h-5 w-5 text-foreground" strokeWidth={1.5} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary">
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
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`rounded-lg px-3 py-3 text-base font-medium ${
                  item.active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm font-medium">שלום, יוסי לוי</span>
              </div>
              <button className="flex items-center gap-2 text-sm text-muted-foreground">
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