import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Present from "./pages/Present";
import Join from "./pages/Join";
import Student from "./pages/Student";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import ConversationalBuilder from "./pages/ConversationalBuilder";
import LectureAnalytics from "./pages/LectureAnalytics";
import ContinueOnDesktop from "./pages/ContinueOnDesktop";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminConversations from "./pages/AdminConversations";
import NotFound from "./pages/NotFound";
import { PostLoginRedirect } from "./components/auth/PostLoginRedirect";
import { ReferralHandler } from "./components/referral/ReferralHandler";

const queryClient = new QueryClient();

/** Redirects /builder to /editor/new with same params + ai=1 (unified Editor) */
const BuilderRedirect = () => {
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams(searchParams);
  params.set('ai', '1');
  return <Navigate to={`/editor/new?${params.toString()}`} replace />;
};

// Global error handler for unhandled promise rejections
const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);
};

const App = () => {
  useGlobalErrorHandler();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SubscriptionProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ReferralHandler />
            <PostLoginRedirect />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/editor/:lectureId" element={<Editor />} />
              <Route path="/present/:lectureId" element={<Present />} />
              <Route path="/lecture/:lectureId/analytics" element={<LectureAnalytics />} />
              <Route path="/join" element={<Join />} />
              <Route path="/student/:lectureCode" element={<Student />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/builder" element={<BuilderRedirect />} />
              <Route path="/continue-on-desktop" element={<ContinueOnDesktop />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/admin/conversations" element={<AdminConversations />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SubscriptionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
