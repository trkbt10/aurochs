/**
 * @file VirtualScroll context
 */

import { createContext, useContext, type ReactNode } from "react";
import type { UseVirtualScrollReturn } from "./useVirtualScroll";

export type VirtualScrollContextValue = UseVirtualScrollReturn;

const VirtualScrollContext = createContext<VirtualScrollContextValue | null>(null);

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

export function useVirtualScrollContext(): VirtualScrollContextValue {
  const value = useContext(VirtualScrollContext);
  if (!value) {
    throw new Error("useVirtualScrollContext must be used within VirtualScrollProvider");
  }
  return value;
}

