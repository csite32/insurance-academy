import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import StatsSection from "@/components/home/StatsSection";
import CoursesSection from "@/components/home/CoursesSection";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <main id="main-content">
        <Hero />
        <StatsSection />
        <CoursesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
