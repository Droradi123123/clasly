import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE =
  Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secretKey = Deno.env.get("PAYPAL_SECRET_KEY");

  if (!clientId || !secretKey) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${secretKey}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const captureResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${order_id}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!captureResponse.ok) {
      const error = await captureResponse.text();
      console.error("PayPal capture error:", error);
      throw new Error("Failed to capture PayPal order");
    }

    const captureData = await captureResponse.json();
    console.log("Order captured:", captureData.id, captureData.status);

    if (captureData.status === "COMPLETED") {
      // Process the payment
      const purchaseUnit = captureData.purchase_units?.[0];
      const customId = purchaseUnit?.payments?.captures?.[0]?.custom_id ||
        purchaseUnit?.custom_id;

      if (customId) {
        const metadata = JSON.parse(customId);
        console.log("Processing payment metadata:", metadata);

        if (metadata.type === "credits_topup") {
          // Handle credits top-up
          const { user_id, ai_tokens, vibe_credits, pack_id } = metadata;

          const { data: currentCredits } = await supabase
            .from("user_credits")
            .select("*")
            .eq("user_id", user_id)
            .single();

          if (currentCredits) {
            await supabase
              .from("user_credits")
              .update({
                ai_tokens_balance: currentCredits.ai_tokens_balance + ai_tokens,
                vibe_credits_balance:
                  currentCredits.vibe_credits_balance + vibe_credits,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user_id);
          } else {
            await supabase.from("user_credits").insert({
              user_id,
              ai_tokens_balance: ai_tokens,
              vibe_credits_balance: vibe_credits,
            });
          }

          // Log transactions
          await supabase.from("credit_transactions").insert([
            {
              user_id,
              credit_type: "ai_tokens",
              transaction_type: "purchase",
              amount: ai_tokens,
              description: `Purchased ${pack_id} pack`,
            },
            {
              user_id,
              credit_type: "vibe_credits",
              transaction_type: "purchase",
              amount: vibe_credits,
              description: `Purchased ${pack_id} pack`,
            },
          ]);

          console.log(`Credits added for user ${user_id}`);
        } else {
          // Handle subscription payment
          const { user_id, plan_id, interval } = metadata;

          const periodEnd = new Date();
          if (interval === "year") {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          // Update subscription
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .single();

          if (existingSub) {
            await supabase
              .from("user_subscriptions")
              .update({
                plan_id,
                status: "active",
                current_period_end: periodEnd.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user_id);
          } else {
            await supabase.from("user_subscriptions").insert({
              user_id,
              plan_id,
              status: "active",
              current_period_end: periodEnd.toISOString(),
            });
          }

          // Fetch plan and refill credits
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", plan_id)
            .single();

          if (plan) {
            const { data: existingCredits } = await supabase
              .from("user_credits")
              .select("*")
              .eq("user_id", user_id)
              .single();

            if (existingCredits) {
              await supabase
                .from("user_credits")
                .update({
                  ai_tokens_balance: plan.monthly_ai_tokens,
                  vibe_credits_balance: plan.monthly_vibe_credits,
                  last_refill_date: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user_id);
            } else {
              await supabase.from("user_credits").insert({
                user_id,
                ai_tokens_balance: plan.monthly_ai_tokens,
                vibe_credits_balance: plan.monthly_vibe_credits,
                last_refill_date: new Date().toISOString(),
              });
            }

            await supabase.from("credit_transactions").insert({
              user_id,
              credit_type: "ai_tokens",
              transaction_type: "refill",
              amount: plan.monthly_ai_tokens,
              description: `Subscription activated - ${plan.name} plan`,
            });
          }

          console.log(`Subscription activated for user ${user_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: captureData.status,
        order_id: captureData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Capture order error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
