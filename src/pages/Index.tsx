import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import StatsSection from "@/components/home/StatsSection";
import ContinueLearning from "@/components/home/ContinueLearning";
import CoursesSection from "@/components/home/CoursesSection";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <StatsSection />
        <ContinueLearning />
        <CoursesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
