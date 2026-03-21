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
        <p className="text-sm text-muted-foreground">
          © 2024 Clasly. Making presentations interactive.
        </p>
      </div>
    </footer>
  );
}
