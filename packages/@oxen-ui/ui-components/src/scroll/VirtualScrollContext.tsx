/**
 * @file VirtualScroll context
 */

import { createContext, useContext, type ReactNode } from "react";
import type { UseVirtualScrollReturn } from "./useVirtualScroll";

export type VirtualScrollContextValue = UseVirtualScrollReturn;

const VirtualScrollContext = createContext<VirtualScrollContextValue | null>(null);

/**
 * Provider for sharing virtual scroll state with descendants.
 */
export function VirtualScrollProvider({
  value,
  children,
}: {
  readonly value: VirtualScrollContextValue;
  readonly children: ReactNode;
}) {
  return (
    <VirtualScrollContext.Provider value={value}>
      {children}
    </VirtualScrollContext.Provider>
  );
}

/**
 * Read the current virtual scroll state from context.
 */
export function useVirtualScrollContext(): VirtualScrollContextValue {
  const value = useContext(VirtualScrollContext);
  if (!value) {
    throw new Error("useVirtualScrollContext must be used within VirtualScrollProvider");
  }
  return value;
}
