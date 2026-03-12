import { createContext, useContext, ReactNode } from "react";
import type { TextAlign } from "@/types/slides";
import { getEffectiveDirection, getEffectiveTextAlign } from "@/lib/designDefaults";
import type { Slide } from "@/types/slides";

export interface SlideLayoutContextValue {
  direction: "ltr" | "rtl";
  textAlign: TextAlign;
}

const SlideLayoutContext = createContext<SlideLayoutContextValue | null>(null);

export function SlideLayoutProvider({
  slide,
  children,
}: {
  slide: Slide;
  children: ReactNode;
}) {
  const direction = getEffectiveDirection(slide);
  const textAlign = getEffectiveTextAlign(slide, direction);
  return (
    <SlideLayoutContext.Provider value={{ direction, textAlign }}>
      {children}
    </SlideLayoutContext.Provider>
  );
}

export function useSlideLayout(): SlideLayoutContextValue {
  const ctx = useContext(SlideLayoutContext);
  if (!ctx) {
    return {
      direction: "ltr",
      textAlign: "center",
    };
  }
  return ctx;
}
