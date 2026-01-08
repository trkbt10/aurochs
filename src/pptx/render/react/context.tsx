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
import type { CoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import { DEFAULT_RENDER_OPTIONS } from "../render-options";
import type { ResolvedBackgroundFill } from "../background-fill";
import type { ResourceResolver } from "../../domain/resource-resolver";
import { createEmptyResourceResolver } from "../../domain/resource-resolver";
import { createWarningCollector } from "../warnings";

// =============================================================================
// Types
// =============================================================================

/**
 * React-specific render context.
 * Extends CoreRenderContext with React-specific fields.
 */
export type ReactRenderContext = CoreRenderContext & {
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
  layoutShapes,
}: RenderProviderProps) {
  const resolvedResources = useMemo(
    () => resources ?? createEmptyResourceResolver(),
    [resources],
  );

  const resolvedColorContext = useMemo<ColorContext>(
    () => colorContext ?? { colorScheme: {}, colorMap: {} },
    [colorContext],
  );

  const resolvedOptions = useMemo<RenderOptions>(
    () => ({ ...DEFAULT_RENDER_OPTIONS, ...options }),
    [options],
  );

  const warnings = useMemo(
    () => createWarningCollector(),
    [
      slideSize,
      resolvedResources,
      resolvedColorContext,
      resolvedOptions,
      resolvedBackground,
      fontScheme,
      layoutShapes,
    ],
  );

  // Shape ID counter for unique IDs
  const shapeIdRef = useMemo(() => ({ value: 0 }), []);

  const ctx = useMemo<ReactRenderContext>(
    () => ({
      slideSize,
      options: resolvedOptions,
      colorContext: resolvedColorContext,
      resources: resolvedResources,
      warnings,
      getNextShapeId: () => `shape-${shapeIdRef.value++}`,
      resolvedBackground,
      fontScheme,
      layoutShapes,
    }),
    [
      slideSize,
      resolvedOptions,
      resolvedColorContext,
      resolvedResources,
      warnings,
      fontScheme,
      resolvedBackground,
      layoutShapes,
      shapeIdRef,
    ],
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
