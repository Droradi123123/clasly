import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useReferralCode(): { code: string | null; isLoading: boolean } {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCode(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_referral_codes")
        .select("code")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && !error && data?.code) {
        setCode(data.code);
      } else {
        setCode(null);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { code, isLoading };
}
