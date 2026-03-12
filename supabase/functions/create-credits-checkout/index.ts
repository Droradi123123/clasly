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

// Credit packs configuration – AI credits only (single credit type)
const CREDIT_PACKS = {
  small: {
    name: "Small Pack",
    ai_tokens: 100,
    price_usd: 3,
  },
  medium: {
    name: "Medium Pack",
    ai_tokens: 500,
    price_usd: 12,
  },
  large: {
    name: "Large Pack",
    ai_tokens: 2000,
    price_usd: 40,
  },
};

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

    const { pack_id, return_url, cancel_url } = await req.json();

    if (!pack_id || !CREDIT_PACKS[pack_id as keyof typeof CREDIT_PACKS]) {
      return new Response(
        JSON.stringify({
          error: "Invalid pack_id. Use: small, medium, or large",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pack = CREDIT_PACKS[pack_id as keyof typeof CREDIT_PACKS];
    const accessToken = await getPayPalAccessToken();

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: pack.price_usd.toFixed(2),
          },
          description: `Clasly ${pack.name} - ${pack.ai_tokens} AI Credits`,
          custom_id: JSON.stringify({
            user_id: user.id,
            pack_id: pack_id,
            ai_tokens: pack.ai_tokens,
            type: "credits_topup",
          }),
        },
      ],
      application_context: {
        brand_name: "Clasly",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: return_url || `${req.headers.get("origin")}/billing?credits_success=true`,
        cancel_url: cancel_url || `${req.headers.get("origin")}/billing?canceled=true`,
      },
    };

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

    console.log("PayPal credits order created:", orderData.id);

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        checkout_url: approveLink?.href,
        pack: pack,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Credits checkout error:", error);
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
