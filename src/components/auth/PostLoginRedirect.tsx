import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * After OAuth redirect, user lands on homepage with session but AuthModal isn't open.
 * If we have a pending prompt in localStorage, redirect to builder (desktop) or continue-on-desktop (mobile).
 */
export function PostLoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (didRedirect.current) return;
    if (location.pathname !== '/') return;

    // Use media query directly to avoid useIsMobile race (hook returns false on first render)
    const isMobileView = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

    const pendingPrompt = localStorage.getItem('clasly_pending_prompt');
    const ts = localStorage.getItem('clasly_pending_prompt_ts');
    const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
    const hasPendingPrompt = pendingPrompt?.trim() !== '' &&
      (!ts || (Date.now() - parseInt(ts, 10)) < MAX_AGE_MS);
    const mobileOAuthPending = sessionStorage.getItem('clasly_mobile_oauth_pending');

    didRedirect.current = true;
    if (isMobileView && (hasPendingPrompt || mobileOAuthPending)) {
      sessionStorage.removeItem('clasly_mobile_oauth_pending');
      navigate('/continue-on-desktop', { replace: true });
    } else if (!isMobileView && hasPendingPrompt && pendingPrompt) {
      const pendingTrack = localStorage.getItem('clasly_pending_track');
      localStorage.removeItem('clasly_pending_prompt');
      localStorage.removeItem('clasly_pending_prompt_ts');
      localStorage.removeItem('clasly_pending_track');
      const trackQ =
        pendingTrack === 'webinar' ? '&track=webinar' : '';
      navigate(
        `/builder?prompt=${encodeURIComponent(pendingPrompt)}&audience=general${trackQ}`,
        { replace: true },
      );
    } else {
      // Logged-in user on homepage -> redirect to Dashboard (their "home")
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAuthLoading, location.pathname, navigate]);

  return null;
}
