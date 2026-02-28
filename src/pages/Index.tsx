import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/landing/HeroSection";
import AIGenerationPreview from "@/components/landing/AIGenerationPreview";
import InteractiveSyncDemo from "@/components/landing/InteractiveSyncDemo";
import AIFeaturesSection from "@/components/landing/AIFeaturesSection";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);

  // Show auth error when user returns from failed signup (e.g. Database error saving new user)
  useEffect(() => {
    const error = searchParams.get("error");
    const desc = searchParams.get("error_description");
    if (error || desc) {
      const msg = desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "ההרשמה נכשלה. נסה שוב מאוחר יותר.";
      toast.error(msg);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [generationPrompt, setGenerationPrompt] = useState("");

  const handleGenerate = (prompt: string) => {
    setGenerationPrompt(prompt);
    setIsGenerating(true);
  };

  const handleGenerationComplete = () => {
    // After the WOW moment, user can continue to dashboard
  };

  const handleReset = () => {
    setIsGenerating(false);
    setGenerationPrompt("");
  };

  const handleSeeExample = () => {
    // Scroll to interactive demo section
    const demoSection = document.querySelector('[data-section="interactive-demo"]');
    demoSection?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContinueEditing = () => {
    // Save prompt and navigate to dashboard to create for real
    if (generationPrompt) {
      localStorage.setItem("clasly_ai_prompt", generationPrompt);
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      {/* Hero Section with AI Input */}
      <HeroSection 
        onGenerate={handleGenerate} 
        onSeeExample={handleSeeExample}
      />
      
      {/* AI Generation Preview (WOW Moment) */}
      <AnimatePresence>
        {isGenerating && (
          <AIGenerationPreview
            prompt={generationPrompt}
            isGenerating={isGenerating}
            onComplete={handleGenerationComplete}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>

      {/* Interactive Sync Demo - hidden on mobile per design */}
      <div data-section="interactive-demo" className="hidden lg:block">
        <InteractiveSyncDemo />
      </div>

      {/* AI Features / Differentiation */}
      <AIFeaturesSection />

      {/* Trust Section */}
      <TrustSection />

      {/* Final CTA */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
