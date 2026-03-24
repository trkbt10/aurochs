/**
 * @file React Render Context
 *
 * Provides RenderContext via React Context API.
 * Enables child components to access color resolution, resources, and options.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SlideSize, Shape } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { CoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import { DEFAULT_RENDER_OPTIONS } from "../render-options";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { createWarningCollector } from "@aurochs-office/ooxml";
import type { TableStyleList } from "@aurochs-office/pptx/parser/table/style-parser";
import { DrawingMLProvider } from "@aurochs-renderer/drawing-ml/react";
import type { WarningCollector } from "@aurochs-renderer/drawing-ml/react";

// =============================================================================
// Types
// =============================================================================

/**
 * React-specific render context.
 * Extends CoreRenderContext with React-specific fields.
 */
export type ReactRenderContext = CoreRenderContext & {};

/**
 * Props for RenderProvider
 */
export type RenderProviderProps = {
  readonly children: ReactNode;
  readonly slideSize: SlideSize;
  readonly colorContext?: ColorContext;
  readonly resourceStore?: ResourceStore;
  readonly fontScheme?: FontScheme;
  readonly options?: Partial<RenderOptions>;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly editingShapeId?: ShapeId;
  readonly layoutShapes?: readonly Shape[];
  readonly tableStyles?: TableStyleList;
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
  resourceStore,
  fontScheme,
  options,
  resolvedBackground,
  layoutShapes,
  tableStyles,
}: RenderProviderProps) {
  const resolvedResourceStore = useMemo(() => resourceStore ?? createResourceStore(), [resourceStore]);

  const resolvedColorContext = useMemo<ColorContext>(
    () => colorContext ?? { colorScheme: {}, colorMap: {} },
    [colorContext],
  );

  const resolvedOptions = useMemo<RenderOptions>(() => ({ ...DEFAULT_RENDER_OPTIONS, ...options }), [options]);

  const warnings = useMemo(
    () => createWarningCollector(),
    [slideSize, resolvedResourceStore, resolvedColorContext, resolvedOptions, resolvedBackground, fontScheme, layoutShapes],
  );

  const ctx = useMemo<ReactRenderContext>(
    () => ({
      slideSize,
      options: resolvedOptions,
      colorContext: resolvedColorContext,
      resourceStore: resolvedResourceStore,
      warnings,
      resolvedBackground,
      fontScheme,
      layoutShapes,
      tableStyles,
    }),
    [
      slideSize,
      resolvedOptions,
      resolvedColorContext,
      resolvedResourceStore,
      warnings,
      fontScheme,
      resolvedBackground,
      layoutShapes,
      tableStyles,
    ],
  );

  // Create DrawingML warnings adapter
  const drawingMLWarnings = useMemo<WarningCollector>(
    () => ({
      warn: (message, context) => {
        warnings.add({
          type: "unsupported",
          message,
          details: context ? JSON.stringify(context) : undefined,
        });
      },
    }),
    [warnings],
  );

  // Create resource resolver for DrawingML
  const resolveResource = useMemo(
    () => (resourceId: string) => resolvedResourceStore.toDataUrl(resourceId),
    [resolvedResourceStore],
  );

  // Create ID generator for DrawingML defs
  const defIdRef = useMemo(() => ({ value: 0 }), []);
  const getNextId = useMemo(() => (prefix: string) => `${prefix}-${defIdRef.value++}`, [defIdRef]);

  return (
    <RenderContext.Provider value={ctx}>
      <DrawingMLProvider
        colorContext={resolvedColorContext}
        resolveResource={resolveResource}
        getNextId={getNextId}
        warnings={drawingMLWarnings}
      >
        {children}
      </DrawingMLProvider>
    </RenderContext.Provider>
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
 * Access resource store from the render context.
 */
export function useRenderResourceStore(): ResourceStore {
  const ctx = useContext(RenderContext);
  if (ctx === null) {
    throw new Error("useRenderResourceStore must be used within a RenderProvider");
  }
  return ctx.resourceStore;
}

/**
 * Create a default render context for testing.
 */
export function createDefaultReactRenderContext(): ReactRenderContext {
  return {
    slideSize: { width: px(960) as Pixels, height: px(540) as Pixels },
    options: DEFAULT_RENDER_OPTIONS,
    colorContext: { colorScheme: {}, colorMap: {} },
    resourceStore: createResourceStore(),
    warnings: createWarningCollector(),
  };
}
