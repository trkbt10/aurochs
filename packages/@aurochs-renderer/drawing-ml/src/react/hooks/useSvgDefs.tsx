/**
 * @file SVG Defs Management Hook
 *
 * Provides React context for collecting and rendering SVG defs
 * (gradients, patterns, clipPaths, etc.) across the component tree.
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

/**
 * SVG definition entry
 */
type SvgDefEntry = {
  readonly id: string;
  readonly content: ReactNode;
};

/**
 * SVG defs context value
 */
type SvgDefsContextValue = {
  /**
   * Generate a unique ID with prefix
   */
  readonly getNextId: (prefix: string) => string;

  /**
   * Add a def element to the collection
   */
  readonly addDef: (id: string, content: ReactNode) => void;

  /**
   * Check if a def with the given ID already exists
   */
  readonly hasDef: (id: string) => boolean;
};

/**
 * Props for SvgDefsProvider
 */
type SvgDefsProviderProps = {
  readonly children: ReactNode;
};

// =============================================================================
// Context
// =============================================================================

const SvgDefsContext = createContext<SvgDefsContextValue | null>(null);

// =============================================================================
// Internal Store
// =============================================================================

/**
 * Internal store for collecting defs.
 * Uses a ref to avoid re-renders when defs are added.
 */
function useSvgDefsStore() {
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

  const getDefs = useCallback((): SvgDefEntry[] => {
    return Array.from(defsMapRef.current.entries()).map(([id, content]) => ({
      id,
      content,
    }));
  }, []);

  const clear = useCallback((): void => {
    defsMapRef.current.clear();
    counterRef.current = 0;
  }, []);

  return { getNextId, addDef, hasDef, getDefs, clear };
}

// =============================================================================
// Provider
// =============================================================================

/**
 * Provides SVG defs collection context.
 * Use with SvgDefsRenderer to output collected defs.
 */
export function SvgDefsProvider({ children }: SvgDefsProviderProps) {
  const store = useSvgDefsStore();

  const value = useMemo<SvgDefsContextValue>(
    () => ({
      getNextId: store.getNextId,
      addDef: store.addDef,
      hasDef: store.hasDef,
    }),
    [store.getNextId, store.addDef, store.hasDef],
  );

  return <SvgDefsContext.Provider value={value}>{children}</SvgDefsContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access SVG defs context.
 * Must be used within a SvgDefsProvider.
 */
export function useSvgDefs(): SvgDefsContextValue {
  const ctx = useContext(SvgDefsContext);
  if (ctx === null) {
    throw new Error("useSvgDefs must be used within a SvgDefsProvider");
  }
  return ctx;
}

// =============================================================================
// Renderer Component
// =============================================================================

/**
 * Component that renders collected SVG defs.
 * Place inside an SVG element to output all collected definitions.
 *
 * @example
 * ```tsx
 * <svg>
 *   <SvgDefsCollector>
 *     {(defs) => (
 *       <>
 *         <defs>{defs}</defs>
 *         <ShapeComponents />
 *       </>
 *     )}
 *   </SvgDefsCollector>
 * </svg>
 * ```
 */
type SvgDefsCollectorProps = {
  readonly children: (defs: ReactNode) => ReactNode;
};

/**
 * Combined provider and collector.
 * Provides context and collects defs for rendering.
 */
export function SvgDefsCollector({ children }: SvgDefsCollectorProps) {
  const store = useSvgDefsStore();

  const value = useMemo<SvgDefsContextValue>(
    () => ({
      getNextId: store.getNextId,
      addDef: store.addDef,
      hasDef: store.hasDef,
    }),
    [store.getNextId, store.addDef, store.hasDef],
  );

  // Get collected defs as ReactNode array
  const defs = store.getDefs().map((entry) => (
    <g key={entry.id}>{entry.content}</g>
  ));

  return (
    <SvgDefsContext.Provider value={value}>
      {children(defs.length > 0 ? defs : null)}
    </SvgDefsContext.Provider>
  );
}

// =============================================================================
// Utility Components for Common Defs
// =============================================================================

/**
 * Register a linear gradient def.
 */
type LinearGradientDefProps = {
  readonly id: string;
  readonly x1?: string | number;
  readonly y1?: string | number;
  readonly x2?: string | number;
  readonly y2?: string | number;
  readonly gradientTransform?: string;
  readonly gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
  readonly children: ReactNode;
};

/**
 * Register a linear gradient definition in SVG defs.
 */
export function LinearGradientDef({
  id,
  x1 = "0%",
  y1 = "0%",
  x2 = "100%",
  y2 = "0%",
  gradientTransform,
  gradientUnits,
  children,
}: LinearGradientDefProps) {
  const { addDef, hasDef } = useSvgDefs();

  if (!hasDef(id)) {
    addDef(
      id,
      <linearGradient
        id={id}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        gradientTransform={gradientTransform}
        gradientUnits={gradientUnits}
      >
        {children}
      </linearGradient>,
    );
  }

  return null;
}

/**
 * Register a radial gradient def.
 */
type RadialGradientDefProps = {
  readonly id: string;
  readonly cx?: string | number;
  readonly cy?: string | number;
  readonly r?: string | number;
  readonly fx?: string | number;
  readonly fy?: string | number;
  readonly gradientTransform?: string;
  readonly gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
  readonly children: ReactNode;
};

/**
 * Register a radial gradient definition in SVG defs.
 */
export function RadialGradientDef({
  id,
  cx = "50%",
  cy = "50%",
  r = "50%",
  fx,
  fy,
  gradientTransform,
  gradientUnits,
  children,
}: RadialGradientDefProps) {
  const { addDef, hasDef } = useSvgDefs();

  if (!hasDef(id)) {
    addDef(
      id,
      <radialGradient
        id={id}
        cx={cx}
        cy={cy}
        r={r}
        fx={fx}
        fy={fy}
        gradientTransform={gradientTransform}
        gradientUnits={gradientUnits}
      >
        {children}
      </radialGradient>,
    );
  }

  return null;
}

/**
 * Register a pattern def.
 */
type PatternDefProps = {
  readonly id: string;
  readonly x?: string | number;
  readonly y?: string | number;
  readonly width: string | number;
  readonly height: string | number;
  readonly patternUnits?: "userSpaceOnUse" | "objectBoundingBox";
  readonly patternContentUnits?: "userSpaceOnUse" | "objectBoundingBox";
  readonly patternTransform?: string;
  readonly children: ReactNode;
};

/**
 * Register a pattern definition in SVG defs.
 */
export function PatternDef({
  id,
  x,
  y,
  width,
  height,
  patternUnits,
  patternContentUnits,
  patternTransform,
  children,
}: PatternDefProps) {
  const { addDef, hasDef } = useSvgDefs();

  if (!hasDef(id)) {
    addDef(
      id,
      <pattern
        id={id}
        x={x}
        y={y}
        width={width}
        height={height}
        patternUnits={patternUnits}
        patternContentUnits={patternContentUnits}
        patternTransform={patternTransform}
      >
        {children}
      </pattern>,
    );
  }

  return null;
}

/**
 * Register a clipPath def.
 */
type ClipPathDefProps = {
  readonly id: string;
  readonly clipPathUnits?: "userSpaceOnUse" | "objectBoundingBox";
  readonly children: ReactNode;
};

/**
 * Register a clipPath definition in SVG defs.
 */
export function ClipPathDef({ id, clipPathUnits, children }: ClipPathDefProps) {
  const { addDef, hasDef } = useSvgDefs();

  if (!hasDef(id)) {
    addDef(
      id,
      <clipPath id={id} clipPathUnits={clipPathUnits}>
        {children}
      </clipPath>,
    );
  }

  return null;
}
