import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Presentation, LayoutDashboard, LogOut, Sparkles, Coins, Crown, Zap, AlertCircle, MessageSquare, Gift, Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useReferralCode } from "@/hooks/useReferralCode";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const trackWebinar = searchParams.get("track") === "webinar";
  const isHome = location.pathname === "/";
  const isWebinar = location.pathname === "/webinar";
  const path = location.pathname;
  const isWebinarProductContext =
    path === "/webinar" ||
    path.startsWith("/webinar/") ||
    (path.startsWith("/editor") && trackWebinar) ||
    (path.startsWith("/present") && trackWebinar);
  const dashboardPath = isWebinarProductContext ? "/webinar/dashboard" : "/dashboard";
  const dashboardLabelFull = isWebinarProductContext ? "Webinar dashboard" : "Educator dashboard";

  /** In-app surfaces where we show product badge + chrome (not marketing-only pages). */
  const showProductBadge =
    path === "/dashboard" ||
    path.startsWith("/webinar/dashboard") ||
    path.startsWith("/editor") ||
    path.startsWith("/present") ||
    path.includes("/lecture/");

  const { user, isLoading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { code: referralCode, isLoading: isReferralLoading } = useReferralCode();
  
  // Subscription data
  const { 
    planName, 
    isFree,
    isPro,
    isStandard,
    aiTokensRemaining, 
    isLoading: isSubLoading,
    plan,
    canAccessWebinarDashboard,
    canAccessEducatorDashboard,
  } = useSubscriptionContext();

  const hasBothProducts =
    !!user && !isSubLoading && canAccessWebinarDashboard && canAccessEducatorDashboard;

  const isWebinarSurfaceActive =
    path.startsWith("/webinar/dashboard") ||
    (path.startsWith("/editor") && trackWebinar) ||
    (path.startsWith("/present") && trackWebinar);

  const isEducatorSurfaceActive =
    path === "/dashboard" ||
    (path.startsWith("/editor") && !trackWebinar) ||
    (path.startsWith("/present") && !trackWebinar) ||
    /^\/lecture\/[^/]+\/analytics$/.test(path);
  
  // Free plan has 0 monthly refill; show balance vs initial 15-credit grant for progress
  const monthlyTokens = plan?.monthly_ai_tokens ?? 0;
  const displayCap = isFree ? 15 : (monthlyTokens || 1);
  const tokenPercentage = displayCap > 0 ? Math.min(100, (aiTokensRemaining / displayCap) * 100) : 0;
  const isLowCredits = isFree ? aiTokensRemaining <= 2 : (monthlyTokens > 0 && (aiTokensRemaining / monthlyTokens) < 0.2);

  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const getPlanBadgeVariant = () => {
    if (isPro) return "default";
    if (isStandard) return "secondary";
    return "outline";
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b",
          isWebinarProductContext
            ? "border-teal-500/35"
            : showProductBadge && (path === "/dashboard" || path.startsWith("/editor") || path.startsWith("/present") || path.includes("/lecture/"))
              ? "border-violet-500/25"
              : "border-border/50",
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 min-h-16 h-16 flex items-center justify-between gap-2 overflow-hidden">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
              <Presentation className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">Clasly</span>
            {showProductBadge && (
              <Badge
                variant="outline"
                className={cn(
                  "hidden sm:inline-flex text-[10px] uppercase tracking-wide font-semibold shrink-0",
                  isWebinarSurfaceActive
                    ? "border-teal-500/50 text-teal-700 dark:text-teal-300"
                    : "border-violet-500/40 text-violet-800 dark:text-violet-200",
                )}
              >
                {isWebinarSurfaceActive ? "Webinar" : "Educator"}
              </Badge>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${isHome ? "text-primary" : "text-muted-foreground"}`}
            >
              For Educator
            </Link>
            <Link
              to="/webinar"
              className={`text-sm font-medium transition-colors hover:text-primary ${isWebinar ? "text-primary" : "text-muted-foreground"}`}
            >
              For Webinar
            </Link>
            <Link
              to={isWebinarProductContext ? "/webinar/pricing" : "/pricing"}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/join">
                Join Session
              </Link>
            </Button>
            
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <>
                {/* Referral: share link, get 20 credits per signup */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Share & earn 20 credits">
                      <Gift className="h-5 w-5 text-primary" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary shrink-0" />
                        <h4 className="font-semibold text-sm">Share & earn credits</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share your link. When someone signs up with it, you get <strong>20 AI credits</strong>.
                      </p>
                      {isReferralLoading ? (
                        <div className="h-9 rounded-md bg-muted animate-pulse" />
                      ) : referralCode ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full justify-start gap-2 font-mono text-xs"
                          onClick={() => {
                            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${referralCode}`;
                            navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy my link
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">Loading your link…</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(user.user_metadata?.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Low credits indicator */}
                      {!isSubLoading && isLowCredits && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {/* User info */}
                    <div className="flex items-center gap-2 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(user.user_metadata?.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {user.user_metadata?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </div>
                      <Badge variant={getPlanBadgeVariant()} className="shrink-0">
                        {isPro && <Crown className="w-3 h-3 mr-1" />}
                        {planName}
                      </Badge>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Credits section */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Zap className="w-3.5 h-3.5" />
                          AI credits
                        </span>
                        <span className={`font-medium ${isLowCredits ? 'text-destructive' : ''}`}>
                          {isSubLoading ? "..." : `${aiTokensRemaining} remaining`}
                        </span>
                      </div>
                      <Progress 
                        value={tokenPercentage} 
                        className={`h-1.5 ${isLowCredits ? '[&>div]:bg-destructive' : ''}`} 
                      />
                      
                      {/* Low credits warning */}
                      {isLowCredits && (
                        <div className="flex items-center gap-1.5 text-xs text-destructive mt-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Running low on credits</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Upgrade CTA for free users */}
                    {isFree && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                          <Button 
                            variant="hero" 
                            size="sm" 
                            className="w-full" 
                            asChild
                          >
                            <Link to={isWebinarProductContext ? "/webinar/pricing" : "/pricing"}>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Upgrade to Pro
                            </Link>
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {/* Buy credits link for non-free */}
                    {!isFree && isLowCredits && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="p-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full" 
                            asChild
                          >
                            <Link to="/billing">
                              <Coins className="w-4 h-4 mr-2" />
                              Buy More Credits
                            </Link>
                          </Button>
                        </div>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/conversations" className="cursor-pointer">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          View User Conversations
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {hasBothProducts ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/dashboard"
                            className={cn(
                              "cursor-pointer flex items-center gap-2 w-full",
                              isEducatorSurfaceActive && "bg-accent",
                            )}
                          >
                            <LayoutDashboard className="w-4 h-4 shrink-0" />
                            <span className="flex-1">Educator dashboard</span>
                            {isEducatorSurfaceActive && <Check className="w-4 h-4 shrink-0" />}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            to="/webinar/dashboard"
                            className={cn(
                              "cursor-pointer flex items-center gap-2 w-full",
                              isWebinarSurfaceActive && "bg-accent",
                            )}
                          >
                            <LayoutDashboard className="w-4 h-4 shrink-0" />
                            <span className="flex-1">Webinar dashboard</span>
                            {isWebinarSurfaceActive && <Check className="w-4 h-4 shrink-0" />}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem asChild>
                        <Link to={dashboardPath} className="cursor-pointer">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          {dashboardLabelFull}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {hasBothProducts ? (
                  <div className="flex items-center gap-1.5">
                    <Button variant="hero" size="sm" asChild>
                      <Link to={dashboardPath} title={dashboardLabelFull}>
                        <LayoutDashboard className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline max-w-[9rem] truncate">{dashboardLabelFull}</span>
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="hidden md:inline-flex px-2">
                      <Link
                        to={isWebinarProductContext ? "/dashboard" : "/webinar/dashboard"}
                        title={isWebinarProductContext ? "Open Educator dashboard" : "Open Webinar dashboard"}
                      >
                        {isWebinarProductContext ? "Educator" : "Webinar"}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button variant="hero" size="sm" asChild>
                    <Link to={dashboardPath} title={dashboardLabelFull}>
                      <LayoutDashboard className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline max-w-[11rem] truncate">{dashboardLabelFull}</span>
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <Button variant="hero" size="sm" onClick={() => setShowAuthModal(true)}>
                <Sparkles className="w-4 h-4" />
                Start for free
              </Button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        signInProduct={isWebinarProductContext ? "webinar" : "education"}
      />
    </>
  );
};

export default Header;
