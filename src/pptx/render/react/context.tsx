/**
 * @file React Render Context
 *
 * Provides RenderContext via React Context API.
 * Enables child components to access color resolution, resources, and options.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SlideSize, Shape } from "../../domain";
import type { ColorContext, FontScheme } from "../../domain/resolution";
import type { ShapeId, Pixels } from "../../domain/types";
import { px } from "../../domain/types";
import type { RenderContext, RenderOptions, ResolvedBackgroundFill, ResourceResolver } from "../context";
import { createEmptyResourceResolver, createWarningCollector, DEFAULT_RENDER_OPTIONS } from "../context";

// =============================================================================
// Types
// =============================================================================

/**
 * React-specific render context.
 * Extends RenderContext with React-specific fields.
 */
export type ReactRenderContext = RenderContext & {
  /**
   * Shape ID currently being edited (text should be hidden).
   */
  readonly editingShapeId?: ShapeId;
};

/**
 * Props for RenderProvider
 */
export type RenderProviderProps = {
  readonly children: ReactNode;
  readonly slideSize: SlideSize;
  readonly colorContext?: ColorContext;
  readonly resources?: ResourceResolver;
  readonly fontScheme?: FontScheme;
  readonly options?: Partial<RenderOptions>;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly editingShapeId?: ShapeId;
  readonly layoutShapes?: readonly Shape[];
};

// =============================================================================
// Context
// =============================================================================

const RenderContext = createContext<ReactRenderContext | null>(null);
const RenderResourcesContext = createContext<ResourceResolver | null>(null);

// =============================================================================
// Provider
// =============================================================================

/**
 * Provides render context to child components.
 */
export function RenderProvider({
  children,
  slideSize,
  colorContext,
  resources,
  fontScheme,
  options,
  resolvedBackground,
  editingShapeId,
  layoutShapes,
}: RenderProviderProps) {
  const resolvedResources = useMemo(
    () => resources ?? createEmptyResourceResolver(),
    [resources],
  );

  // Shape ID counter for unique IDs
  const shapeIdRef = useMemo(() => ({ value: 0 }), []);

  const ctx = useMemo<ReactRenderContext>(
    () => ({
      slideSize,
      options: { ...DEFAULT_RENDER_OPTIONS, ...options },
      colorContext: colorContext ?? { colorScheme: {}, colorMap: {} },
      resources: resolvedResources,
      warnings: createWarningCollector(),
      getNextShapeId: () => `shape-${shapeIdRef.value++}`,
      resolvedBackground,
      fontScheme,
      editingShapeId,
      layoutShapes,
    }),
    [slideSize, colorContext, resolvedResources, fontScheme, options, resolvedBackground, editingShapeId, layoutShapes, shapeIdRef],
  );

  return (
    <RenderResourcesContext.Provider value={resolvedResources}>
      <RenderContext.Provider value={ctx}>{children}</RenderContext.Provider>
    </RenderResourcesContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access render context from child components.
 * Must be used within a RenderProvider.
 */
export function useRenderContext(): ReactRenderContext {
  const ctx = useContext(RenderContext);
  if (ctx === null) {
    throw new Error("useRenderContext must be used within a RenderProvider");
  }
  return ctx;
}

/**
 * Access resource resolver without subscribing to the full render context.
 */
export function useRenderResources(): ResourceResolver {
  const resources = useContext(RenderResourcesContext);
  if (resources === null) {
    throw new Error("useRenderResources must be used within a RenderProvider");
  }
  return resources;
}

/**
 * Create a default render context for testing.
 */
export function createDefaultReactRenderContext(): ReactRenderContext {
  let shapeId = 0;
  return {
    slideSize: { width: px(960) as Pixels, height: px(540) as Pixels },
    options: DEFAULT_RENDER_OPTIONS,
    colorContext: { colorScheme: {}, colorMap: {} },
    resources: createEmptyResourceResolver(),
    warnings: createWarningCollector(),
    getNextShapeId: () => `shape-${shapeId++}`,
  };
}
