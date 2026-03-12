import * as React from "react";
import { Bold, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoResizeTextarea, AutoResizeTextareaProps } from "./AutoResizeTextarea";

export interface RichTextInputProps extends Omit<AutoResizeTextareaProps, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  showFormatBar?: boolean;
}

/**
 * Textarea with Bold and Underline formatting bar.
 * Uses ** for bold and __ for underline - stored in plain text, rendered via FormattedText.
 */
export const RichTextInput = React.forwardRef<HTMLTextAreaElement, RichTextInputProps>(
  function RichTextInput({ value, onChange, showFormatBar = true, ...props }, ref) {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const wrapSelection = (before: string, after: string) => {
      const el = innerRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const beforeText = value.slice(0, start);
      const selected = value.slice(start, end);
      const afterText = value.slice(end);
      const newValue = beforeText + before + selected + after + afterText;
      onChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        const newStart = start + before.length;
        const newEnd = newStart + selected.length;
        el.setSelectionRange(newStart, newEnd);
      });
    };

    return (
      <div className="flex flex-col gap-1 w-full">
        {showFormatBar && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => wrapSelection("**", "**")}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => wrapSelection("__", "__")}
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </Button>
          </div>
        )}
        <AutoResizeTextarea
          {...props}
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
);
