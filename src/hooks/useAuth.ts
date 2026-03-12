import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout - never stay loading for more than 5 seconds
    const timeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('Auth loading timeout - forcing ready state');
        setIsLoading(false);
      }
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession()
      .then(({ data: { session: existingSession } }) => {
        if (!isMounted) return;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.warn('Failed to get session:', error?.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out error:', error);
    }
    setUser(null);
    setSession(null);
  }, []);

  return { user, session, isLoading, signOut };
};
