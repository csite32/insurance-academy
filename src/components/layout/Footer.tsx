import { useLocation, useNavigate } from "react-router-dom";

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === "/") {
      scrollToTop();
    } else {
      navigate("/");
      setTimeout(scrollToTop, 100);
    }
  };

  const handleProfileClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === "/profile") {
      scrollToTop();
    } else {
      navigate("/profile");
      setTimeout(scrollToTop, 100);
    }
  };

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
    <footer className="relative mt-10 overflow-hidden bg-footer text-footer-foreground">
      {/* Decorative blob */}
      <div className="pointer-events-none absolute -bottom-16 right-4 opacity-80">
        <svg width="220" height="180" viewBox="0 0 220 180" fill="none" aria-hidden>
          <ellipse cx="80" cy="100" rx="55" ry="80" fill="hsl(var(--primary))" opacity="0.6" transform="rotate(-20 80 100)" />
          <ellipse cx="120" cy="120" rx="50" ry="70" fill="hsl(var(--accent))" opacity="0.55" transform="rotate(15 120 120)" />
          <ellipse cx="160" cy="100" rx="45" ry="60" fill="hsl(var(--accent-light))" opacity="0.5" transform="rotate(-10 160 100)" />
        </svg>
      </div>

      <div className="container relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <h4 className="text-lg font-bold text-accent-light">קישורים מהירים</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href="/" onClick={handleHomeClick} className="hover:text-primary transition-colors">עמוד בית</a></li>
            <li><a href="#courses" onClick={handleCoursesClick} className="hover:text-primary transition-colors">הקורסים שלי</a></li>
            <li><a href="/profile" onClick={handleProfileClick} className="hover:text-primary transition-colors">אזור אישי</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-bold text-accent-light">מידע נוסף</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary transition-colors">מדיניות פרטיות</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">תנאי שימוש</a></li>
            <li><a href="/accessibility" className="hover:text-primary transition-colors">הצהרת נגישות</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col-reverse items-center justify-between gap-3 py-5 text-xs text-footer-foreground/70 sm:flex-row">
           <span>© 2026 כל הזכויות שמורות · מנדי גפנר סוכנות לביטוח</span>
           <a
             href="https://www.c-site.co.il/"
             target="_blank"
             rel="noopener noreferrer"
             className="hover:text-primary transition-colors"
           >
             עיצוב ופיתוח אתר: חיה פוגל Csite
           </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;