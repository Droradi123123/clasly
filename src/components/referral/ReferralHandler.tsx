import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REFERRAL_STORAGE_KEY = "clasly_referral_code";

/**
 * 1. On load: if URL has ?ref=CODE, store in localStorage.
 * 2. After sign-in: if we have a stored ref code, call record_referral and clear.
 */
export function ReferralHandler() {
  const location = useLocation();
  const { user } = useAuth();
  const didRecordForSession = useRef(false);

  // Capture ref from URL (any page)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref")?.trim();
    if (ref) {
      try {
        localStorage.setItem(REFERRAL_STORAGE_KEY, ref);
      } catch {
        // ignore
      }
    }
  }, [location.search]);

  // After sign-in: record referral and grant 20 credits to referrer
  useEffect(() => {
    if (!user) {
      didRecordForSession.current = false;
      return;
    }
    const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!code || didRecordForSession.current) return;

    didRecordForSession.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("record_referral", {
          referral_code: code,
        });
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        if (error) {
          console.warn("[Referral] record_referral error:", error.message);
          return;
        }
        const result = data as { ok?: boolean; reason?: string };
        if (result?.ok) {
          toast.success("Welcome! Your referrer received 20 bonus credits.");
        }
      } catch (e) {
        console.warn("[Referral] record_referral exception:", e);
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
    })();
  }, [user]);

  return null;
}
