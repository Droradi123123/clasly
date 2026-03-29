import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { StructuredData } from "@/components/seo/StructuredData";
import HeroSection from "@/components/landing/HeroSection";
import AIGenerationPreview from "@/components/landing/AIGenerationPreview";
import InteractiveSyncDemo from "@/components/landing/InteractiveSyncDemo";
import AIFeaturesSection from "@/components/landing/AIFeaturesSection";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const WebinarLanding = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const desc = searchParams.get("error_description");
    if (error || desc) {
      const msg = desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "ההרשמה נכשלה. נסה שוב מאוחר יותר.";
      toast.error(msg);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleGenerate = (prompt: string) => {
    setGenerationPrompt(prompt);
    setIsGenerating(true);
  };

  const handleGenerationComplete = () => {};

  const handleReset = () => {
    setIsGenerating(false);
    setGenerationPrompt("");
  };

  const handleSeeExample = () => {
    const demoSection = document.querySelector('[data-section="interactive-demo"]');
    demoSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <DocumentHead
        title="Clasly for Webinar – Interactive Webinars & Lead Capture"
        description="Turn your topic into an interactive webinar in seconds. AI builds the deck, attendees participate from their phones—no downloads."
        path="/webinar"
      />
      <StructuredData />
      <Header />
      
      <HeroSection 
        onGenerate={handleGenerate} 
        onSeeExample={handleSeeExample}
        variant="webinar"
      />
      
      <AnimatePresence>
        {isGenerating && (
          <AIGenerationPreview
            prompt={generationPrompt}
            isGenerating={isGenerating}
            onComplete={handleGenerationComplete}
            onReset={handleReset}
            variant="webinar"
          />
        )}
      </AnimatePresence>

      <div data-section="interactive-demo" className="hidden lg:block">
        <InteractiveSyncDemo variant="webinar" />
      </div>

      <AIFeaturesSection variant="webinar" />

      <TrustSection variant="webinar" />

      <CTASection variant="webinar" />

      <Footer variant="webinar" />
    </div>
  );
};

export default WebinarLanding;
