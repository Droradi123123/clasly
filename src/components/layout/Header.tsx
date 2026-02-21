import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Presentation, LayoutDashboard, LogOut, Sparkles, Coins, Crown, Zap, AlertCircle, MessageSquare } from "lucide-react";
import { useState } from "react";
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

const Header = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user, isLoading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Subscription data
  const { 
    planName, 
    isFree, 
    aiTokensRemaining, 
    isLoading: isSubLoading,
    plan
  } = useSubscriptionContext();
  
  // Free plan has 0 monthly refill; show balance vs initial 10-credit grant for progress
  const monthlyTokens = plan?.monthly_ai_tokens ?? 0;
  const displayCap = isFree ? 10 : (monthlyTokens || 1);
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
    if (planName === "Pro") return "default";
    if (planName === "Standard") return "secondary";
    return "outline";
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 min-h-16 h-16 flex items-center justify-between gap-2 overflow-hidden">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
              <Presentation className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">Clasly</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors hover:text-primary ${isHome ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Home
            </Link>
            <Link 
              to="/pricing" 
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
                        {planName === "Pro" && <Crown className="w-3 h-3 mr-1" />}
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
                          {aiTokensRemaining} remaining
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
                            <Link to="/pricing">
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
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="hero" size="sm" asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                </Button>
              </>
            ) : (
              <Button variant="hero" size="sm" onClick={() => setShowAuthModal(true)}>
                <Sparkles className="w-4 h-4" />
                Get Started
              </Button>
            )}
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

export default Header;
