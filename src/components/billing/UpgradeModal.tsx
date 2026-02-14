import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  title?: string;
  description?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  feature = "this feature",
  title,
  description,
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4"
          >
            <Lock className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <DialogTitle className="text-xl font-display">
            {title || `Upgrade to unlock ${feature}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description ||
              `You've reached your limit on the Free plan. Upgrade to continue using ${feature} and unlock more powerful features.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-medium mb-2">Free Plan</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 5 slides max</li>
                <li>• 50 AI tokens</li>
                <li>• Basic features</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Pro Plan</p>
              </div>
              <ul className="text-xs space-y-1">
                <li className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Unlimited slides
                </li>
                <li className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-success" />
                  2000 AI tokens
                </li>
                <li className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-success" />
                  All features
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="w-full"
            variant="hero"
            size="lg"
          >
            View Plans & Upgrade
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Starting at just $9/month. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to easily use the modal
export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalProps, setModalProps] = useState<{
    feature?: string;
    title?: string;
    description?: string;
  }>({});

  const showUpgradeModal = (props?: {
    feature?: string;
    title?: string;
    description?: string;
  }) => {
    setModalProps(props || {});
    setIsOpen(true);
  };

  const UpgradeModalComponent = () => (
    <UpgradeModal
      open={isOpen}
      onOpenChange={setIsOpen}
      {...modalProps}
    />
  );

  return {
    showUpgradeModal,
    UpgradeModal: UpgradeModalComponent,
    isOpen,
  };
}
