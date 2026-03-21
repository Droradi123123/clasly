import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins, Sparkles } from "lucide-react";

interface OutOfCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OutOfCreditsModal({ open, onOpenChange }: OutOfCreditsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Out of credits</DialogTitle>
          <DialogDescription>
            You've used all your AI credits. Add more credits or upgrade to a plan to keep creating.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/billing" onClick={() => onOpenChange(false)}>
              <Coins className="w-4 h-4 mr-2" />
              Buy credits
            </Link>
          </Button>
          <Button variant="hero" className="w-full sm:w-auto" asChild>
            <Link to="/pricing" onClick={() => onOpenChange(false)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade plan
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
