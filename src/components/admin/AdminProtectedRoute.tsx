import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-background px-6"
      >
        <div className="max-w-md text-center rounded-3xl border border-border bg-card p-10 shadow-card">
          <h1 className="text-2xl font-bold text-foreground">גישה חסומה</h1>
          <p className="mt-3 text-muted-foreground">
            אין לך הרשאה לצפות באזור הניהול. נא לפנות למנהל המערכת.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            חזרה לעמוד הבית
          </a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminProtectedRoute;
