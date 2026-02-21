import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/layout/Header";
import {
  Sparkles,
  Zap,
  CreditCard,
  Calendar,
  Plus,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CREDIT_PACKS, type CreditPack } from "@/types/subscription";
import { format } from "date-fns";

const Billing = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    plan,
    subscription,
    credits,
    isLoading,
    planName,
    aiTokensRemaining,
  } = useSubscriptionContext();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  // Handle PayPal return
  useEffect(() => {
    const handlePayPalReturn = async () => {
      const success = searchParams.get("success");
      const creditsSuccess = searchParams.get("credits_success");
      const orderId = searchParams.get("token"); // PayPal uses 'token' param

      if ((success || creditsSuccess) && orderId) {
        toast.loading("Processing your payment...");
        try {
          const { data, error } = await supabase.functions.invoke(
            "capture-paypal-order",
            {
              body: { order_id: orderId },
            }
          );

          if (error) throw error;

          if (data?.success) {
            toast.dismiss();
            toast.success(
              creditsSuccess
                ? "Credits added successfully!"
                : "Subscription activated!"
            );
            // Clear URL params
            navigate("/billing", { replace: true });
          }
        } catch (error) {
          toast.dismiss();
          console.error("Payment capture error:", error);
          toast.error("Failed to process payment. Please contact support.");
        }
      }

      if (searchParams.get("canceled")) {
        toast.info("Payment was cancelled");
        navigate("/billing", { replace: true });
      }
    };

    handlePayPalReturn();
  }, [searchParams, navigate]);

  const handleBuyCredits = async (pack: CreditPack) => {
    if (!user) {
      toast.error("Please sign in to purchase credits");
      return;
    }

    setPurchaseLoading(pack.id);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-credits-checkout",
        {
          body: { pack_id: pack.id },
        }
      );

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error("Credits checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setPurchaseLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Header />
        <main className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-2xl font-display font-bold mb-4">
              Please sign in to view billing
            </h1>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Free plan has 0 monthly refill; show balance vs 15 (one-time signup grant)
  const aiTokensMax = (plan?.monthly_ai_tokens ?? 0) || (planName === "Free" ? 15 : (planName === "Standard" ? 100 : 250));
  const aiTokensPercent = aiTokensMax > 0 ? Math.min((aiTokensRemaining / aiTokensMax) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Billing & Usage
            </h1>
            <p className="text-muted-foreground">
              Manage your subscription and credits
            </p>
          </motion.div>

          <div className="grid gap-6">
            {/* Current Plan Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                      {planName === "Pro" ? (
                        <Sparkles className="w-5 h-5 text-primary-foreground" />
                      ) : (
                        <Zap className="w-5 h-5 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="font-display">{planName} Plan</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {subscription?.status === "active"
                          ? "Active subscription"
                          : "Free tier"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/pricing")}>
                    {planName === "Free" ? "Upgrade" : "Change Plan"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {subscription?.current_period_end && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Next billing:{" "}
                          {format(
                            new Date(subscription.current_period_end),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    {plan && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CreditCard className="w-4 h-4" />
                        <span>
                          ${plan.price_monthly_usd}/month
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Usage Cards */}
            <div className="grid sm:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      AI credits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-medium">
                          {aiTokensRemaining.toLocaleString()} / {planName === "Free" ? "15 (one-time)" : aiTokensMax.toLocaleString() + "/mo"}
                        </span>
                      </div>
                      <Progress value={aiTokensPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Used for AI-powered slide generation
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              </div>

            {/* Credit packs – one-time purchase (all plans) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    {planName === "Free" ? "Buy credits" : "Buy more credits"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {planName === "Free"
                      ? "One-time purchase – get AI credits now (no subscription)."
                      : "Top up your balance – get credits now, in addition to your monthly plan."}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {CREDIT_PACKS.map((pack) => (
                      <div
                        key={pack.id}
                        className={`relative p-4 rounded-xl border ${
                          pack.popular
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        {pack.popular && (
                          <div className="absolute -top-2 right-2">
                            <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          </div>
                        )}
                        <h3 className="font-semibold mb-1">{pack.name}</h3>
                        <p className="text-2xl font-bold mb-2">
                          ${pack.price_usd}
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                          <li>{pack.ai_tokens} AI credits</li>
                        </ul>
                        <Button
                          variant={pack.popular ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => handleBuyCredits(pack)}
                          disabled={purchaseLoading === pack.id}
                        >
                          {purchaseLoading === pack.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Buy now"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Free Plan: also show upgrade CTA */}
            {planName === "Free" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          Unlock more features
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Upgrade to Standard or Pro to buy additional credits
                          and access premium features.
                        </p>
                      </div>
                      <Button onClick={() => navigate("/pricing")}>
                        View Plans
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Billing;
