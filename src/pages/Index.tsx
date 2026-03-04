import JournalHeader from "@/components/JournalHeader";
import HeroSection from "@/components/HeroSection";
import ArticleList from "@/components/ArticleList";
import SubmissionGuidelines from "@/components/SubmissionGuidelines";
import JournalScope from "@/components/JournalScope";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <JournalHeader />
      <HeroSection />
      <JournalScope />
      <ArticleList />
      <SubmissionGuidelines />
    </div>
  );
};

export default Index;
