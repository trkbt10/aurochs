/**
 * @file Presentation preview context
 *
 * Manages slideshow preview state for the presentation editor.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type PresentationPreviewContextValue = {
  readonly isOpen: boolean;
  readonly startSlideIndex: number;
  readonly openPreview: (startSlideIndex: number) => void;
  readonly closePreview: () => void;
};

const PresentationPreviewContext = createContext<PresentationPreviewContextValue | null>(null);

/**
 * Provider for presentation preview state.
 */
export function PresentationPreviewProvider({ children }: { readonly children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [startSlideIndex, setStartSlideIndex] = useState(1);

  const value = useMemo<PresentationPreviewContextValue>(
    () => ({
      isOpen,
      startSlideIndex,
      openPreview: (nextStartSlideIndex: number) => {
        if (!Number.isFinite(nextStartSlideIndex) || nextStartSlideIndex < 1) {
          throw new Error("startSlideIndex must be a positive number.");
        }
        setStartSlideIndex(nextStartSlideIndex);
        setIsOpen(true);
      },
      closePreview: () => setIsOpen(false),
    }),
    [isOpen, startSlideIndex],
  );

  return (
    <PresentationPreviewContext.Provider value={value}>
      {children}
    </PresentationPreviewContext.Provider>
  );
}

/**
 * Hook to access presentation preview state.
 */
export function usePresentationPreview(): PresentationPreviewContextValue {
  const context = useContext(PresentationPreviewContext);
  if (!context) {
    throw new Error("usePresentationPreview must be used within PresentationPreviewProvider");
  }
  return context;
}

/**
 * Hook to access presentation preview state without enforcing provider presence.
 */
export function usePresentationPreviewOptional(): PresentationPreviewContextValue | null {
  return useContext(PresentationPreviewContext);
}
