import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { Check, Sparkles, Users, Zap, Loader2, Timer } from "lucide-react";
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

/** Launch discount shown on page and applied at checkout. */
const DISPLAY_LAUNCH_OFFER_PCT = 20;

function resolveProductLine(pathname: string, searchParams: URLSearchParams): PlanProduct {
  if (pathname.startsWith("/webinar/pricing")) return "webinar";
  const p = searchParams.get("product");
  if (p === "education" || p === "webinar") return p;
  return "education";
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

  useEffect(() => {
    if (location.pathname === "/webinar/pricing") {
      navigate({ pathname: "/pricing", search: "?product=webinar" }, { replace: true });
      return;
    }
    if (location.pathname === "/pricing" && !searchParams.get("product")) {
      setSearchParams({ product: "education" }, { replace: true });
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
    if (plan.max_slides) {
      out.push(`Up to ${plan.max_slides} slides per presentation`);
    } else {
      out.push("Unlimited slides per presentation");
    }

    if (tier === "Free") {
      out.push("Starter AI credits included");
    } else {
      out.push(`${plan.monthly_ai_tokens.toLocaleString()} AI credits/month`);
    }

    if (tier === "Free") {
      out.push("Basic editor + Present mode");
      out.push("Interactive slides + live results");
    } else if (tier === "Standard") {
      out.push("Import PowerPoint & PDF");
      out.push("Buy additional AI credits");
    } else if (tier === "Pro") {
      out.push("Premium themes");
      out.push("Custom colors + logo branding");
      out.push("Import PowerPoint & PDF");
      out.push("Buy additional AI credits");
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

  /** List (catalog) effective $/mo for display; free → null. */
  const getListMonthlyUsd = (plan: SubscriptionPlan): number | null => {
    if (plan.price_monthly_usd === 0) return null;
    return billingInterval === "year"
      ? plan.price_yearly_usd / 12
      : plan.price_monthly_usd;
  };

  /** Marketing-only discounted $/mo (checkout unchanged). */
  const getDisplayMonthlyUsd = (plan: SubscriptionPlan): number | null => {
    const list = getListMonthlyUsd(plan);
    if (list == null) return null;
    return Math.round(list * (1 - DISPLAY_LAUNCH_OFFER_PCT / 100) * 100) / 100;
  };

  const getPriceBlock = (plan: SubscriptionPlan) => {
    if (plan.price_monthly_usd === 0) {
      return { main: "Free", listLabel: null as string | null, suffix: "" as string };
    }
    const list = getListMonthlyUsd(plan)!;
    const shown = getDisplayMonthlyUsd(plan)!;
    const listRounded = Math.round(list * 100) / 100;
    const same = Math.abs(listRounded - shown) < 0.01;
    return {
      main: `$${shown % 1 === 0 ? shown.toFixed(0) : shown.toFixed(2)}`,
      listLabel: same ? null : `$${listRounded % 1 === 0 ? listRounded.toFixed(0) : listRounded.toFixed(2)}`,
      suffix: "/month",
    };
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
    "Clasly plans for educators and webinar hosts: AI slides, interactive polls and quizzes, fair monthly pricing.";

  return (
    <div className="min-h-screen bg-gradient-hero">
      <DocumentHead title={pageTitle} description={pageDescription} path="/pricing" />
      <Header />

      <main className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Pricing
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto mb-6">
              Choose a product line, then a plan. One subscription per account.
            </p>

            <div
              className="mx-auto mb-5 max-w-lg rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 px-4 py-3 shadow-md"
              role="note"
            >
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
                <Timer className="h-4 w-4 shrink-0" aria-hidden />
                <span>48-hour welcome: {DISPLAY_LAUNCH_OFFER_PCT}% off shown below</span>
              </div>
              <p className="mt-1 text-center text-[11px] text-muted-foreground leading-snug">
                Discount is applied at checkout.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product line
              </p>
              <Tabs
                value={productLine}
                onValueChange={setProductTab}
                className="w-full max-w-lg"
              >
                <TabsList className="grid h-14 w-full grid-cols-2 gap-1 rounded-xl border-2 border-primary/25 bg-muted/70 p-1.5 shadow-lg">
                  <TabsTrigger
                    value="education"
                    className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:text-base"
                  >
                    Clasly for Educator
                  </TabsTrigger>
                  <TabsTrigger
                    value="webinar"
                    className="rounded-lg text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:text-base"
                  >
                    Clasly for Webinar
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground max-w-md">
                {productLine === "webinar"
                  ? "Lead capture, live CTA to phones, webinar analytics — same slide & AI limits per tier."
                  : "Classrooms & training: AI decks, live polls & quizzes, analytics."}
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
              const priceBlock = getPriceBlock(plan);

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
                        {priceBlock.listLabel ? (
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="text-xl text-muted-foreground line-through decoration-destructive/60">
                              {priceBlock.listLabel}
                            </span>
                            <span className="text-4xl font-display font-bold text-foreground">
                              {priceBlock.main}
                            </span>
                            {priceBlock.suffix && (
                              <span className="text-muted-foreground">{priceBlock.suffix}</span>
                            )}
                          </div>
                        ) : (
                          <>
                            <span className="text-4xl font-display font-bold text-foreground">
                              {priceBlock.main}
                            </span>
                            {priceBlock.suffix && (
                              <span className="text-muted-foreground">{priceBlock.suffix}</span>
                            )}
                          </>
                        )}
                        {plan.price_monthly_usd > 0 && (
                          <div className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                            {DISPLAY_LAUNCH_OFFER_PCT}% welcome display
                          </div>
                        )}
                        {savings && billingInterval === "year" && (
                          <div className="text-sm text-success mt-1">
                            Save {savings}% vs paying monthly all year
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2 flex-1 mb-6">
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
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center text-sm text-muted-foreground"
          >
            Questions?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
              {CONTACT_EMAIL}
            </a>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
