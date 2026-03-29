import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { Check, Sparkles, Users, Zap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/types/subscription";
import { normalizePlanNameForFeatures } from "@/types/subscription";
import { CONTACT_EMAIL } from "@/lib/constants";

const Pricing = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { planName, currentPlanId } = useSubscriptionContext();
  const { user } = useAuth();
  const location = useLocation();
  const isWebinarPricing = location.pathname.startsWith("/webinar/pricing");
  const productLine = isWebinarPricing ? "webinar" : "education";

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
    const cancelPath = isWebinarPricing ? "/webinar/pricing" : "/pricing";

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            plan_id: plan.id,
            interval: billingInterval,
            return_url: `${origin}/billing?success=true`,
            cancel_url: `${origin}${cancelPath}?canceled=true`,
          },
        }
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

  const getPlanFeatures = (plan: SubscriptionPlan): string[] => {
    const tier = normalizePlanNameForFeatures(plan.name);
    const baseFeatures: string[] = [];

    // Value prop: slide limit (e.g. "15 slides free" for Free)
    if (tier === "Free") {
      baseFeatures.push("15 slides free");
    } else if (plan.max_slides) {
      baseFeatures.push(`Up to ${plan.max_slides} slides per presentation`);
    } else {
      baseFeatures.push("Unlimited slides");
    }

    // Add AI credits – Free gets one-time 15, paid get monthly refill
    if (tier === "Free") {
      baseFeatures.push("15 AI credits to start (one-time)");
    } else {
      baseFeatures.push(`${plan.monthly_ai_tokens.toLocaleString()} AI credits/month`);
    }
    // Plan-specific features
    if (tier === "Free") {
      baseFeatures.push("Basic slide types (Poll, WordCloud)");
      baseFeatures.push("7-day analytics retention");
    } else if (tier === "Standard") {
      baseFeatures.push("Advanced AI model");
      baseFeatures.push("Import PowerPoint & PDF");
      baseFeatures.push("All basic slide types + Scale, Sentiment");
      baseFeatures.push("30-day analytics retention");
      baseFeatures.push("Buy additional credits");
    } else if (tier === "Pro") {
      baseFeatures.push("Advanced AI model");
      baseFeatures.push("All slide types (Quiz, Timeline, etc.)");
      baseFeatures.push("Import PowerPoint & PDF");
      baseFeatures.push("Premium themes");
      baseFeatures.push("Export reports (Excel, PDF)");
      baseFeatures.push("90-day analytics retention");
      baseFeatures.push("Priority support");
    }

    return baseFeatures;
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (plan.price_monthly_usd === 0) return "Free";
    const price = billingInterval === "year" 
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

  const docPath = isWebinarPricing ? "/webinar/pricing" : "/pricing";
  const pageTitle = isWebinarPricing
    ? "Pricing – Clasly for Webinar"
    : "Pricing – Clasly for Educator";
  const pageDescription = isWebinarPricing
    ? "Webinar plans and pricing. Separate product from Clasly for Educator."
    : "Educator plans and pricing. Free tier, Standard, and Pro.";

  return (
    <div className="min-h-screen bg-gradient-hero">
      <DocumentHead
        title={pageTitle}
        description={pageDescription}
        path={docPath}
      />
      <Header />

      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              {isWebinarPricing
                ? "Webinar pricing"
                : "Simple, transparent pricing"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {isWebinarPricing
                ? "Built for live webinars and large audiences. Billed separately from Clasly for Educator."
                : "Start free, upgrade when you need more power. 30% cheaper than competitors."}
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-2 bg-muted/50 p-1 rounded-full">
              <button
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

          {/* Pricing Cards */}
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
                            <span className="text-sm text-muted-foreground">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={isPopular ? "hero" : "outline"}
                        className="w-full"
                        onClick={() => handleSubscribe(plan)}
                        disabled={
                          checkoutLoading === plan.id ||
                          isCurrent ||
                          tier === "Free"
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

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">
              Questions?
            </h2>
            <p className="text-muted-foreground mb-6">
              We're here to help. Contact us at{" "}
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
