import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-border/50">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">Clasly</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Terms and Conditions
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <p className="text-sm text-muted-foreground">
            © 2026 Clasly. Making presentations interactive.
          </p>
        </div>
      </div>
    </footer>
  );
}
