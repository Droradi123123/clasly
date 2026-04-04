import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { Check, Sparkles, Users, Zap, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/types/subscription";
import { normalizePlanNameForFeatures } from "@/types/subscription";
import type { PlanProduct } from "@/types/subscription";
import { CONTACT_EMAIL } from "@/lib/constants";

function resolveProductLine(pathname: string, searchParams: URLSearchParams): PlanProduct {
  if (pathname.startsWith("/webinar/pricing")) return "webinar";
  const p = searchParams.get("product");
  if (p === "education" || p === "webinar") return p;
  return "webinar";
}

const Pricing = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { planName, currentPlanId } = useSubscriptionContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const productLine = useMemo(
    () => resolveProductLine(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  // Canonical URL: /pricing?product=webinar|education ; redirect legacy /webinar/pricing
  useEffect(() => {
    if (location.pathname === "/webinar/pricing") {
      navigate({ pathname: "/pricing", search: "?product=webinar" }, { replace: true });
      return;
    }
    if (location.pathname === "/pricing" && !searchParams.get("product")) {
      setSearchParams({ product: "webinar" }, { replace: true });
    }
  }, [location.pathname, navigate, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("product", productLine)
          .order("price_monthly_usd", { ascending: true });

        if (error) throw error;
        if (!cancelled) setPlans(data || []);
      } catch (error) {
        console.error("Error fetching plans:", error);
        if (!cancelled) toast.error("Failed to load pricing plans");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productLine]);

  const setProductTab = (value: string) => {
    const line = value === "education" ? "education" : "webinar";
    setSearchParams({ product: line }, { replace: true });
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    if (normalizePlanNameForFeatures(plan.name) === "Free") {
      toast.info("You're already on the Free plan");
      return;
    }

    if (plan.id === currentPlanId) {
      toast.info(`You're already on the ${planName} plan`);
      return;
    }

    setCheckoutLoading(plan.id);

    const origin = window.location.origin;
    const cancelPath = `/pricing?product=${productLine}&canceled=true`;

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            plan_id: plan.id,
            interval: billingInterval,
            return_url: `${origin}/billing?success=true`,
            cancel_url: `${origin}${cancelPath}`,
          },
        },
      );

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getPlanIcon = (name: string) => {
    const tier = normalizePlanNameForFeatures(name);
    switch (tier) {
      case "Free":
        return Zap;
      case "Standard":
        return Users;
      case "Pro":
        return Sparkles;
      default:
        return Zap;
    }
  };

  const getEducatorTierFeatures = (tier: string, plan: SubscriptionPlan): string[] => {
    const out: string[] = [];
    if (tier === "Free") {
      out.push("15 slides free");
    } else if (plan.max_slides) {
      out.push(`Up to ${plan.max_slides} slides per presentation`);
    } else {
      out.push("Unlimited slides");
    }

    if (tier === "Free") {
      out.push("15 AI credits to start (one-time)");
    } else {
      out.push(`${plan.monthly_ai_tokens.toLocaleString()} AI credits/month`);
    }

    if (tier === "Free") {
      out.push("Basic slide types (Poll, WordCloud)");
      out.push("7-day analytics retention");
    } else if (tier === "Standard") {
      out.push("Advanced AI model");
      out.push("Import PowerPoint & PDF");
      out.push("All basic slide types + Scale, Sentiment");
      out.push("30-day analytics retention");
      out.push("Buy additional credits");
    } else if (tier === "Pro") {
      out.push("Advanced AI model");
      out.push("All slide types (Quiz, Timeline, etc.)");
      out.push("Import PowerPoint & PDF");
      out.push("Premium themes");
      out.push("Export reports (Excel, PDF)");
      out.push("90-day analytics retention");
      out.push("Priority support");
    }
    return out;
  };

  const getPlanFeatures = (plan: SubscriptionPlan): string[] => {
    const tier = normalizePlanNameForFeatures(plan.name);
    const educator = getEducatorTierFeatures(tier, plan);
    if (plan.product !== "webinar") {
      return educator;
    }
    return [
      ...educator,
      "Registration form & lead capture before attendees join",
      "Live CTA broadcast to attendees' phones during the session",
      "Webinar dashboard: leads and session analytics",
    ];
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (plan.price_monthly_usd === 0) return "Free";
    const price =
      billingInterval === "year"
        ? (plan.price_yearly_usd / 12).toFixed(0)
        : plan.price_monthly_usd.toFixed(0);
    return `$${price}`;
  };

  const getYearlySavings = (plan: SubscriptionPlan) => {
    if (plan.price_monthly_usd === 0) return null;
    const monthlyCost = plan.price_monthly_usd * 12;
    const yearlyCost = plan.price_yearly_usd;
    const savings = Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
    return savings > 0 ? savings : null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pageTitle = "Pricing – Clasly";
  const pageDescription =
    "Clasly pricing for Educator and Webinar: interactive slides, AI credits per tier, polls and quizzes—and on Webinar, lead capture, live CTA to phones, and webinar analytics.";

  return (
    <div className="min-h-screen bg-gradient-hero">
      <DocumentHead title={pageTitle} description={pageDescription} path="/pricing" />
      <Header />

      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              <strong className="text-foreground">Educator</strong> is built for teaching and training: AI
              decks, interactive slide types, import, and classroom-focused analytics.{" "}
              <strong className="text-foreground">Webinar</strong> adds lead capture before join, a live CTA
              broadcast to attendees&apos; phones, and webinar-focused analytics—on top of the same slide
              limits and AI credits per tier. One paid subscription at a time per account.
            </p>

            <div className="flex flex-col items-center gap-4 mb-8">
              <Tabs
                value={productLine}
                onValueChange={setProductTab}
                className="w-full max-w-md"
              >
                <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="webinar" className="text-sm sm:text-base">
                    Clasly for Webinar
                  </TabsTrigger>
                  <TabsTrigger value="education" className="text-sm sm:text-base">
                    Clasly for Educator
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-sm text-muted-foreground max-w-xl text-center leading-relaxed">
                {productLine === "webinar"
                  ? "Registration form before the room, leads in your dashboard, and a one-tap CTA you send during the session—plus the same AI-built interactive decks and slide limits as Educator, listed in the cards below."
                  : "AI-built presentations, polls, quizzes, word clouds, and analytics tuned for class and training. Switch to the Webinar tab for lead capture, live CTA, and webinar analytics."}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-muted/50 p-1 rounded-full">
              <button
                type="button"
                onClick={() => setBillingInterval("month")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  billingInterval === "month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("year")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingInterval === "year"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                  Save 10%
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = getPlanIcon(plan.name);
              const tier = normalizePlanNameForFeatures(plan.name);
              const isPopular = tier === "Standard";
              const isCurrent = plan.id === currentPlanId;
              const features = getPlanFeatures(plan);
              const savings = billingInterval === "year" ? getYearlySavings(plan) : null;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`relative h-full flex flex-col ${
                      isPopular
                        ? "border-primary shadow-lg shadow-primary/20 scale-105"
                        : "border-border/50"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    {isCurrent && (
                      <div className="absolute -top-3 right-4">
                        <span className="bg-success text-success-foreground text-xs font-semibold px-3 py-1 rounded-full">
                          Current Plan
                        </span>
                      </div>
                    )}

                    <CardHeader className="pb-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                          isPopular ? "bg-gradient-primary" : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isPopular ? "text-primary-foreground" : "text-foreground"
                          }`}
                        />
                      </div>
                      <CardTitle className="font-display">{plan.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-display font-bold text-foreground">
                          {getPrice(plan)}
                        </span>
                        {plan.price_monthly_usd > 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                        {savings && billingInterval === "year" && (
                          <div className="text-sm text-success mt-1">
                            Save {savings}% with yearly billing
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-3 flex-1 mb-6">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={isPopular ? "hero" : "outline"}
                        className="w-full"
                        onClick={() => handleSubscribe(plan)}
                        disabled={
                          checkoutLoading === plan.id || isCurrent || tier === "Free"
                        }
                      >
                        {checkoutLoading === plan.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isCurrent ? (
                          "Current Plan"
                        ) : tier === "Free" ? (
                          "Free Forever"
                        ) : (
                          "Get Started"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 max-w-2xl mx-auto text-left space-y-4"
          >
            <h2 className="text-xl font-display font-bold text-foreground text-center">
              Product lines & billing
            </h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>
                <strong className="text-foreground">One subscription at a time.</strong> Your account has one
                active plan. A paid Webinar plan unlocks the webinar dashboard; a paid Educator plan unlocks
                the educator dashboard. Education Free can open both dashboards for trying either product.
              </li>
              <li>
                <strong className="text-foreground">What Webinar adds on top of Educator.</strong> Lead
                capture (email and custom fields), live CTA to attendees&apos; phones, and webinar/lead
                analytics—same slide caps and monthly AI credits as the matching Educator tier. List prices
                differ by product line; compare the numbers above when you switch tabs.
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">Questions?</h2>
            <p className="text-muted-foreground mb-6">
              We&apos;re here to help. Contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
