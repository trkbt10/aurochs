/**
 * @file SVG ID generation context for fig React renderer
 *
 * Provides a simple unique ID generator for SVG defs (gradients, filters,
 * clip-paths, patterns). Each renderer produces its own defs inline —
 * this context only ensures IDs don't collide across the component tree.
 *
 * The previous implementation tried to collect defs via refs and render
 * them centrally, but refs don't trigger re-renders, so collected defs
 * never appeared in the DOM. The inline approach is both simpler and correct.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

// =============================================================================
// Types
// =============================================================================

export type FigSvgIdGenerator = {
  /** Generate a unique ID with a given prefix (e.g. "lg", "filter", "clip") */
  readonly getNextId: (prefix: string) => string;
};

// =============================================================================
// Context
// =============================================================================

const FigSvgIdContext = createContext<FigSvgIdGenerator | null>(null);

// =============================================================================
// Provider
// =============================================================================

type FigSvgIdProviderProps = {
  readonly children: ReactNode;
};

/**
 * Provides a unique ID generator for SVG defs.
 * Each renderer uses this to get collision-free IDs for gradients, filters, etc.
 */
export function FigSvgIdProvider({ children }: FigSvgIdProviderProps) {
  const counterRef = useRef(0);

  const getNextId = useCallback((prefix: string): string => {
    const id = `${prefix}-${counterRef.current}`;
    counterRef.current += 1;
    return id;
  }, []);

  const value = useMemo<FigSvgIdGenerator>(
    () => ({ getNextId }),
    [getNextId],
  );

  return <FigSvgIdContext.Provider value={value}>{children}</FigSvgIdContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the fig SVG ID generator.
 * Must be used within a FigSvgIdProvider.
 */
export function useFigSvgDefs(): FigSvgIdGenerator {
  const ctx = useContext(FigSvgIdContext);
  if (ctx === null) {
    throw new Error("useFigSvgDefs must be used within a FigSvgIdProvider");
  }
  return ctx;
}

// Legacy aliases for backward compatibility
export { FigSvgIdProvider as FigSvgDefsProvider };
