import { createContext, useContext, type ReactNode } from "react";

type SlideChrome = {
  /** When true, SlideWrapper skips the corner logo (e.g. Student shows a header strip instead). */
  hideCornerLogo: boolean;
};

const SlideChromeContext = createContext<SlideChrome>({ hideCornerLogo: false });

export function SlideChromeProvider({
  hideCornerLogo,
  children,
}: {
  hideCornerLogo: boolean;
  children: ReactNode;
}) {
  return (
    <SlideChromeContext.Provider value={{ hideCornerLogo }}>{children}</SlideChromeContext.Provider>
  );
}

export function useSlideChrome(): SlideChrome {
  return useContext(SlideChromeContext);
}
