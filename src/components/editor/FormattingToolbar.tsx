/**
 * Inline formatting toolbar - Bold and Underline.
 * Wraps selected text with ** or __ for WYSIWYG display.
 */
import { Bold, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormattingToolbarProps {
  onFormat: (wrapper: string) => void;
  disabled?: boolean;
}

export function FormattingToolbar({ onFormat, disabled }: FormattingToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-muted/60 border border-border/50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
            onMouseDown={(e) => { e.preventDefault(); onFormat("**"); }}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Bold (Ctrl+B)</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
            onMouseDown={(e) => { e.preventDefault(); onFormat("__"); }}
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Underline</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
