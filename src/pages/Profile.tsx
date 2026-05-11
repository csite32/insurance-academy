import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { courses } from "@/data/courses";
import { UserCircle2 } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  if (!user) return null;

  const assigned = courses.filter((c) => user.assignedCourses.includes(c.id));

  // Aggregate progress across assigned courses (mock from localStorage)
  let totalLessons = 0;
  let totalCompleted = 0;
  assigned.forEach((c) => {
    totalLessons += c.lessons;
    try {
      const raw = localStorage.getItem(`progress:${user.id}:${c.id}`);
      if (raw) {
        const p = JSON.parse(raw);
        totalCompleted += (p.completedLessonIds ?? []).length;
      }
    } catch {
      /* ignore */
    }
  });
  const overall = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="max-w-2xl mx-auto rounded-3xl border border-border bg-card p-8 shadow-card animate-in fade-in duration-300">
          <div className="flex items-center gap-4 mb-8">
            <UserCircle2 className="h-16 w-16 text-muted-foreground" strokeWidth={1.4} />
            <div>
              <h1 className="text-2xl font-bold">{user.fullName}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-muted p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">קורסים משויכים</p>
              <p className="text-3xl font-bold text-primary">{assigned.length}</p>
            </div>
            <div className="rounded-2xl bg-muted p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">התקדמות כללית</p>
              <p className="text-3xl font-bold text-primary">{overall}%</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
