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
    const error = await response.text();
    console.error("PayPal auth error:", error);
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan_id, interval, return_url, cancel_url } = await req.json();

    if (!plan_id || !interval) {
      return new Response(
        JSON.stringify({ error: "plan_id and interval are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const price =
      interval === "year" ? plan.price_yearly_usd : plan.price_monthly_usd;

    if (price === 0) {
      return new Response(
        JSON.stringify({ error: "Cannot checkout free plan" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = await getPayPalAccessToken();

    // Create PayPal subscription product if not exists, then create subscription
    // For simplicity, we'll use PayPal Orders API for one-time style, 
    // but for recurring we need Subscriptions API
    const subscriptionPayload = {
      plan_id: `CLASLY_${plan.name.toUpperCase()}_${interval.toUpperCase()}`,
      subscriber: {
        email_address: user.email,
      },
      application_context: {
        brand_name: "Clasly",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: return_url || `${req.headers.get("origin")}/billing?success=true`,
        cancel_url: cancel_url || `${req.headers.get("origin")}/pricing?canceled=true`,
      },
      custom_id: JSON.stringify({
        user_id: user.id,
        plan_id: plan_id,
        interval: interval,
      }),
    };

    // First, ensure we have a PayPal product and plan
    // For MVP, we'll create an order instead (simpler setup)
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: price.toFixed(2),
          },
          description: `Clasly ${plan.name} Plan (${interval}ly)`,
          custom_id: JSON.stringify({
            user_id: user.id,
            plan_id: plan_id,
            interval: interval,
          }),
        },
      ],
      application_context: {
        brand_name: "Clasly",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: return_url || `${req.headers.get("origin")}/billing?success=true`,
        cancel_url: cancel_url || `${req.headers.get("origin")}/pricing?canceled=true`,
      },
    };

    console.log("Creating PayPal order with payload:", JSON.stringify(orderPayload, null, 2));

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error("PayPal order creation error:", error);
      throw new Error("Failed to create PayPal order");
    }

    const orderData = await orderResponse.json();
    const approveLink = orderData.links.find(
      (link: { rel: string }) => link.rel === "approve"
    );

    console.log("PayPal order created:", orderData.id);

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        checkout_url: approveLink?.href,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Checkout session error:", error);
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
