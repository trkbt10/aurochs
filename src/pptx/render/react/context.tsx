/**
 * @file React Render Context
 *
 * Provides RenderContext via React Context API.
 * Enables child components to access color resolution, resources, and options.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SlideSize } from "../../domain";
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
};

// =============================================================================
// Context
// =============================================================================

const RenderContext = createContext<ReactRenderContext | null>(null);

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
}: RenderProviderProps) {
  const ctx = useMemo<ReactRenderContext>(
    () => ({
      slideSize,
      options: { ...DEFAULT_RENDER_OPTIONS, ...options },
      colorContext: colorContext ?? { colorScheme: {}, colorMap: {} },
      resources: resources ?? createEmptyResourceResolver(),
      warnings: createWarningCollector(),
      resolvedBackground,
      fontScheme,
      editingShapeId,
    }),
    [slideSize, colorContext, resources, fontScheme, options, resolvedBackground, editingShapeId],
  );

  return <RenderContext.Provider value={ctx}>{children}</RenderContext.Provider>;
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
