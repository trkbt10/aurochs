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
import type {
  RenderOptions,
  ResolvedBackgroundFill,
  ResourceResolver,
  WarningCollector,
} from "../core/types";
import { DEFAULT_RENDER_OPTIONS } from "../core/types";
import {
  createEmptyResourceResolver,
  createWarningCollector,
} from "../core/context";

// =============================================================================
// Types
// =============================================================================

/**
 * React-specific render context.
 * Similar to CoreRenderContext but tailored for React component tree.
 */
export type ReactRenderContext = {
  /** Slide dimensions */
  readonly slideSize: SlideSize;

  /** Render options */
  readonly options: RenderOptions;

  /** Color resolution context */
  readonly colorContext: ColorContext;

  /** Resource resolver */
  readonly resources: ResourceResolver;

  /** Warning collector */
  readonly warnings: WarningCollector;

  /**
   * Pre-resolved background fill (after slide → layout → master inheritance).
   */
  readonly resolvedBackground?: ResolvedBackgroundFill;

  /**
   * Font scheme for resolving theme font references.
   */
  readonly fontScheme?: FontScheme;

  /**
   * Shape ID currently being edited (text should be hidden).
   */
  readonly editingShapeId?: ShapeId;

  /**
   * Non-placeholder shapes from slide layout.
   * These are decorative shapes that should be rendered behind slide content.
   *
   * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
   */
  readonly layoutShapes?: readonly Shape[];
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

  const ctx = useMemo<ReactRenderContext>(
    () => ({
      slideSize,
      options: { ...DEFAULT_RENDER_OPTIONS, ...options },
      colorContext: colorContext ?? { colorScheme: {}, colorMap: {} },
      resources: resolvedResources,
      warnings: createWarningCollector(),
      resolvedBackground,
      fontScheme,
      editingShapeId,
      layoutShapes,
    }),
    [slideSize, colorContext, resolvedResources, fontScheme, options, resolvedBackground, editingShapeId, layoutShapes],
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
  return {
    slideSize: { width: px(960) as Pixels, height: px(540) as Pixels },
    options: DEFAULT_RENDER_OPTIONS,
    colorContext: { colorScheme: {}, colorMap: {} },
    resources: createEmptyResourceResolver(),
    warnings: createWarningCollector(),
  };
}
