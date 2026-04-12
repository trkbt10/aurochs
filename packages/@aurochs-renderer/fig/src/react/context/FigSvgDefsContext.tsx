/**
 * @file SVG Defs collection context for fig React renderer
 *
 * Collects gradient, filter, clip-path, and pattern defs during render.
 * Components call useFigSvgDefs() to register defs and get unique IDs.
 * The collected defs are rendered into a single <defs> element by FigSvgDefsRenderer.
 *
 * Follows the same pattern as @aurochs-renderer/pptx useSvgDefs.
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

type FigSvgDefsContextValue = {
  /** Generate a unique ID with a given prefix (e.g. "lg", "filter", "clip") */
  readonly getNextId: (prefix: string) => string;
  /** Register a ReactNode as an SVG def */
  readonly addDef: (id: string, content: ReactNode) => void;
  /** Check if a def ID is already registered */
  readonly hasDef: (id: string) => boolean;
};

// =============================================================================
// Context
// =============================================================================

const FigSvgDefsContext = createContext<FigSvgDefsContextValue | null>(null);

// =============================================================================
// Internal Store
// =============================================================================

function useFigSvgDefsStore() {
  const counterRef = useRef(0);
  const defsMapRef = useRef<Map<string, ReactNode>>(new Map());

  const getNextId = useCallback((prefix: string): string => {
    const id = `${prefix}-${counterRef.current}`;
    counterRef.current += 1;
    return id;
  }, []);

  const addDef = useCallback((id: string, content: ReactNode): void => {
    if (!defsMapRef.current.has(id)) {
      defsMapRef.current.set(id, content);
    }
  }, []);

  const hasDef = useCallback((id: string): boolean => {
    return defsMapRef.current.has(id);
  }, []);

  const getDefsArray = useCallback((): readonly { id: string; content: ReactNode }[] => {
    return Array.from(defsMapRef.current.entries()).map(([id, content]) => ({
      id,
      content,
    }));
  }, []);

  const clear = useCallback((): void => {
    defsMapRef.current.clear();
    counterRef.current = 0;
  }, []);

  return { getNextId, addDef, hasDef, getDefsArray, clear };
}

// =============================================================================
// Provider
// =============================================================================

type FigSvgDefsProviderProps = {
  readonly children: (defs: ReactNode) => ReactNode;
};

/**
 * Combined provider and renderer for fig SVG defs.
 *
 * Provides the defs context to children, and passes collected defs
 * back via a render prop so the caller can place them in <defs>.
 *
 * @example
 * ```tsx
 * <FigSvgDefsProvider>
 *   {(collectedDefs) => (
 *     <g>
 *       <defs>{collectedDefs}</defs>
 *       <SceneNodeRenderer node={...} />
 *     </g>
 *   )}
 * </FigSvgDefsProvider>
 * ```
 */
export function FigSvgDefsProvider({ children }: FigSvgDefsProviderProps) {
  const store = useFigSvgDefsStore();

  const value = useMemo<FigSvgDefsContextValue>(
    () => ({
      getNextId: store.getNextId,
      addDef: store.addDef,
      hasDef: store.hasDef,
    }),
    [store.getNextId, store.addDef, store.hasDef],
  );

  const defsNodes = store.getDefsArray().map((entry) => (
    <g key={entry.id}>{entry.content}</g>
  ));

  return (
    <FigSvgDefsContext.Provider value={value}>
      {children(defsNodes.length > 0 ? defsNodes : null)}
    </FigSvgDefsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the fig SVG defs context.
 * Must be used within a FigSvgDefsProvider.
 */
export function useFigSvgDefs(): FigSvgDefsContextValue {
  const ctx = useContext(FigSvgDefsContext);
  if (ctx === null) {
    throw new Error("useFigSvgDefs must be used within a FigSvgDefsProvider");
  }
  return ctx;
}
