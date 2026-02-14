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

async function verifyWebhookSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  
  // CRITICAL: Fail securely if webhook ID is not configured
  if (!webhookId) {
    console.error("CRITICAL: PAYPAL_WEBHOOK_ID not configured - rejecting webhook");
    return false;
  }

  // Validate required headers are present
  const requiredHeaders = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];

  for (const header of requiredHeaders) {
    if (!req.headers.get(header)) {
      console.error(`Missing required PayPal header: ${header}`);
      return false;
    }
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const verifyResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      }
    );

    const result = await verifyResponse.json();
    const isValid = result.verification_status === "SUCCESS";
    
    if (!isValid) {
      console.error("PayPal webhook signature verification failed:", result);
    }
    
    return isValid;
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.text();
    const event = JSON.parse(body);

    console.log("PayPal webhook received:", event.event_type);

    // Verify webhook signature in production
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = event.event_type;
    const resource = event.resource;

    switch (eventType) {
      case "CHECKOUT.ORDER.APPROVED":
      case "PAYMENT.CAPTURE.COMPLETED": {
        // Handle completed payment
        const customId = resource.purchase_units?.[0]?.custom_id;
        if (!customId) {
          console.error("No custom_id in payment");
          break;
        }

        const metadata = JSON.parse(customId);
        console.log("Payment metadata:", metadata);

        if (metadata.type === "credits_topup") {
          // Handle credits top-up
          const { user_id, ai_tokens, vibe_credits, pack_id } = metadata;

          // Update user credits
          const { error: updateError } = await supabase.rpc(
            "increment_user_credits",
            {
              p_user_id: user_id,
              p_ai_tokens: ai_tokens,
              p_vibe_credits: vibe_credits,
            }
          );

          if (updateError) {
            // Fallback: direct update
            const { data: currentCredits } = await supabase
              .from("user_credits")
              .select("*")
              .eq("user_id", user_id)
              .single();

            if (currentCredits) {
              await supabase
                .from("user_credits")
                .update({
                  ai_tokens_balance:
                    currentCredits.ai_tokens_balance + ai_tokens,
                  vibe_credits_balance:
                    currentCredits.vibe_credits_balance + vibe_credits,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user_id);
            }
          }

          // Log transaction
          await supabase.from("credit_transactions").insert({
            user_id,
            credit_type: "ai_tokens",
            transaction_type: "purchase",
            amount: ai_tokens,
            description: `Purchased ${pack_id} pack`,
          });

          await supabase.from("credit_transactions").insert({
            user_id,
            credit_type: "vibe_credits",
            transaction_type: "purchase",
            amount: vibe_credits,
            description: `Purchased ${pack_id} pack`,
          });

          console.log(`Credits added for user ${user_id}`);
        } else {
          // Handle subscription payment
          const { user_id, plan_id, interval } = metadata;

          // Calculate period end based on interval
          const periodEnd = new Date();
          if (interval === "year") {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          // Update subscription
          await supabase
            .from("user_subscriptions")
            .upsert({
              user_id,
              plan_id,
              status: "active",
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user_id);

          // Fetch plan to get credit limits
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", plan_id)
            .single();

          if (plan) {
            // Refill credits based on plan
            await supabase
              .from("user_credits")
              .upsert({
                user_id,
                ai_tokens_balance: plan.monthly_ai_tokens,
                vibe_credits_balance: plan.monthly_vibe_credits,
                last_refill_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user_id);

            // Log refill transaction
            await supabase.from("credit_transactions").insert({
              user_id,
              credit_type: "ai_tokens",
              transaction_type: "refill",
              amount: plan.monthly_ai_tokens,
              description: `Monthly refill - ${plan.name} plan`,
            });
          }

          console.log(`Subscription activated for user ${user_id}`);
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        // Handle subscription cancellation
        const subscriptionId = resource.id;
        console.log("Subscription cancelled/suspended:", subscriptionId);

        // Find and update the subscription by PayPal subscription ID
        // For orders-based flow, we might not have this
        break;
      }

      default:
        console.log("Unhandled event type:", eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
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
