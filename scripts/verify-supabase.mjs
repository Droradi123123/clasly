#!/usr/bin/env node
/**
 * Verify Supabase connection and Edge Functions configuration.
 * Run from project root: node scripts/verify-supabase.mjs
 *
 * Requires: .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) {
    console.error("❌ .env.local not found. Create it with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY");
    process.exit(1);
  }
  const content = readFileSync(path, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*VITE_SUPABASE_(URL|PUBLISHABLE_KEY)\s*=\s*["']?([^"'\s#]+)/);
    if (m) env[`VITE_SUPABASE_${m[1]}`] = m[2].trim();
  }
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    console.error("❌ .env.local must define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY");
    process.exit(1);
  }
  return env;
}

async function main() {
  console.log("🔍 Verifying Supabase connection...\n");

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  console.log("  URL:", url);
  console.log("  Key:", key.substring(0, 20) + "...");
  console.log("");

  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(url, key);

  // 1. Auth health (reachability)
  try {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log("⚠️  Auth getSession:", sessionError.message, "(connection may still be OK)");
    } else {
      console.log("✅ Auth: OK (session:", session?.session ? "exists" : "none", ")");
    }
  } catch (e) {
    console.error("❌ Auth request failed:", e.message);
    process.exit(1);
  }

  // 2. REST / DB reachability (public table if exists)
  try {
    const { data, error } = await supabase.from("subscription_plans").select("id").limit(1);
    if (error) {
      if (error.code === "PGRST116" || error.message?.includes("relation")) {
        console.log("⚠️  Table subscription_plans: not found or no rows (run migrations if needed)");
      } else {
        console.log("⚠️  Database query:", error.message);
      }
    } else {
      console.log("✅ Database (subscription_plans): OK");
    }
  } catch (e) {
    console.log("⚠️  Database query failed:", e.message);
  }

  // 3. Edge Functions base URL (only check that the functions URL is reachable)
  const functionsUrl = `${url.replace(/\/$/, "")}/functions/v1`;
  try {
    const res = await fetch(functionsUrl, { method: "OPTIONS" });
    if (res.ok || res.status === 404) {
      console.log("✅ Edge Functions endpoint: reachable");
    } else {
      console.log("⚠️  Edge Functions endpoint:", res.status);
    }
  } catch (e) {
    console.error("❌ Edge Functions endpoint unreachable:", e.message);
  }

  console.log("\n📋 Edge Functions in this project:");
  const functions = [
    "chat-builder",
    "generate-image",
    "generate-slides",
    "parse-presentation",
    "convert-to-images",
    "create-checkout-session",
    "create-credits-checkout",
    "capture-paypal-order",
    "paypal-webhook",
  ];
  functions.forEach((name) => console.log("   -", name));

  console.log("\n📌 Required Supabase Dashboard secrets (Settings → Edge Functions → Secrets):");
  console.log("   - GEMINI_API_KEY          (for chat-builder, generate-image, generate-slides, parse-presentation)");
  console.log("   - PAYPAL_CLIENT_ID        (for PayPal functions)");
  console.log("   - PAYPAL_SECRET_KEY       (for PayPal functions)");
  console.log("   - PAYPAL_WEBHOOK_ID       (for paypal-webhook only)");
  console.log("   - PAYPAL_MODE             (optional: 'sandbox' or 'live')");
  console.log("\n✅ Verification done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
