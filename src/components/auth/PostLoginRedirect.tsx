import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useIsMobile';

/**
 * After OAuth redirect, user lands on homepage with session but AuthModal isn't open.
 * If we have a pending prompt in localStorage, redirect to builder (desktop) or continue-on-desktop (mobile).
 */
export function PostLoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isMobile = useIsMobile();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (didRedirect.current) return;
    if (location.pathname !== '/') return;

    const pendingPrompt = localStorage.getItem('clasly_pending_prompt');
    const hasPendingPrompt = pendingPrompt && pendingPrompt.trim() !== '';
    const mobileOAuthPending = sessionStorage.getItem('clasly_mobile_oauth_pending');

    didRedirect.current = true;
    if (isMobile && (hasPendingPrompt || mobileOAuthPending)) {
      sessionStorage.removeItem('clasly_mobile_oauth_pending');
      navigate('/continue-on-desktop', { replace: true });
    } else if (!isMobile && hasPendingPrompt) {
      navigate(`/builder?prompt=${encodeURIComponent(pendingPrompt)}&audience=general`, { replace: true });
    } else {
      didRedirect.current = false;
    }
  }, [user, isAuthLoading, isMobile, location.pathname, navigate]);

  return null;
}
