import { createContext, useContext, ReactNode } from 'react';

interface BuilderPreviewContextValue {
  allowContentScroll: boolean;
}

const BuilderPreviewContext = createContext<BuilderPreviewContextValue>({
  allowContentScroll: false,
});

export function BuilderPreviewProvider({
  children,
  allowContentScroll = false,
}: {
  children: ReactNode;
  allowContentScroll?: boolean;
}) {
  return (
    <BuilderPreviewContext.Provider value={{ allowContentScroll }}>
      {children}
    </BuilderPreviewContext.Provider>
  );
}

export function useBuilderPreview() {
  return useContext(BuilderPreviewContext);
}
