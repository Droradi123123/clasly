import * as React from "react";

const CONSTRAINED_VIEWPORT_HEIGHT = 850;

export function useConstrainedViewport() {
  const [constrained, setConstrained] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-height: ${CONSTRAINED_VIEWPORT_HEIGHT}px)`
    );
    const handler = () => setConstrained(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return constrained;
}
