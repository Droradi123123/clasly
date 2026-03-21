import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
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
  const [isGenerating, setIsGenerating] = useState(false);
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
    <div className="min-h-screen bg-background">
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

      {/* Interactive Sync Demo */}
      <div data-section="interactive-demo">
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
