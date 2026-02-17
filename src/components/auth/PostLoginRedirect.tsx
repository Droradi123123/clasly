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
    const pendingPrompt = localStorage.getItem('clasly_pending_prompt');
    if (!pendingPrompt || pendingPrompt.trim() === '') return;
    // Only run when we're on the homepage (returned from OAuth)
    if (location.pathname !== '/') return;

    didRedirect.current = true;
    if (isMobile) {
      navigate('/continue-on-desktop', { replace: true });
    } else {
      navigate(`/builder?prompt=${encodeURIComponent(pendingPrompt)}&audience=general`, { replace: true });
    }
  }, [user, isAuthLoading, isMobile, location.pathname, navigate]);

  return null;
}
