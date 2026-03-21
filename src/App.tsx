import { useEffect, lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import WebinarLanding from "./pages/WebinarLanding";
import Join from "./pages/Join";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import ContinueOnDesktop from "./pages/ContinueOnDesktop";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Changelog from "./pages/Changelog";
import NotFound from "./pages/NotFound";
import { PostLoginRedirect } from "./components/auth/PostLoginRedirect";
import { ReferralHandler } from "./components/referral/ReferralHandler";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const Present = lazy(() => import("./pages/Present"));
const Student = lazy(() => import("./pages/Student"));
const ConversationalBuilder = lazy(() => import("./pages/ConversationalBuilder"));
const LectureAnalytics = lazy(() => import("./pages/LectureAnalytics"));
const AdminConversations = lazy(() => import("./pages/AdminConversations"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
  </div>
);

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
      <HelmetProvider>
        <TooltipProvider>
          <SubscriptionProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <ReferralHandler />
            <PostLoginRedirect />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/webinar" element={<WebinarLanding />} />
              <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="/editor" element={<Navigate to="/editor/new" replace />} />
              <Route path="/editor/:lectureId" element={<Suspense fallback={<PageLoader />}><Editor /></Suspense>} />
              <Route path="/present/:lectureId" element={<Suspense fallback={<PageLoader />}><Present /></Suspense>} />
              <Route path="/lecture/:lectureId/analytics" element={<Suspense fallback={<PageLoader />}><LectureAnalytics /></Suspense>} />
              <Route path="/join" element={<Join />} />
              <Route path="/student/:lectureCode" element={<Suspense fallback={<PageLoader />}><Student /></Suspense>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/builder" element={<BuilderRedirect />} />
              <Route path="/continue-on-desktop" element={<ContinueOnDesktop />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/admin/conversations" element={<Suspense fallback={<PageLoader />}><AdminConversations /></Suspense>} />
              <Route path="/changelog" element={<Changelog />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </SubscriptionProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
