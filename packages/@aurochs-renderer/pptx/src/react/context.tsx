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
import type { ResolvedBackgroundFill } from "../background-fill";
import type { ResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import { createEmptyResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
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
  readonly resources?: ResourceResolver;
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
  resourceStore,
  fontScheme,
  options,
  resolvedBackground,
  layoutShapes,
  tableStyles,
}: RenderProviderProps) {
  const resolvedResources = useMemo(() => resources ?? createEmptyResourceResolver(), [resources]);

  const resolvedColorContext = useMemo<ColorContext>(
    () => colorContext ?? { colorScheme: {}, colorMap: {} },
    [colorContext],
  );

  const resolvedOptions = useMemo<RenderOptions>(() => ({ ...DEFAULT_RENDER_OPTIONS, ...options }), [options]);

  const warnings = useMemo(
    () => createWarningCollector(),
    [slideSize, resolvedResources, resolvedColorContext, resolvedOptions, resolvedBackground, fontScheme, layoutShapes],
  );

  // Shape ID counter for unique IDs
  const shapeIdRef = useMemo(() => ({ value: 0 }), []);

  const ctx = useMemo<ReactRenderContext>(
    () => ({
      slideSize,
      options: resolvedOptions,
      colorContext: resolvedColorContext,
      resources: resolvedResources,
      resourceStore,
      warnings,
      getNextShapeId: () => `shape-${shapeIdRef.value++}`,
      resolvedBackground,
      fontScheme,
      layoutShapes,
      tableStyles,
    }),
    [
      slideSize,
      resolvedOptions,
      resolvedColorContext,
      resolvedResources,
      resourceStore,
      warnings,
      fontScheme,
      resolvedBackground,
      layoutShapes,
      tableStyles,
      shapeIdRef,
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
    () => (resourceId: string) => resolvedResources.resolve(resourceId),
    [resolvedResources],
  );

  // Create ID generator for DrawingML defs
  const defIdRef = useMemo(() => ({ value: 0 }), []);
  const getNextId = useMemo(() => (prefix: string) => `${prefix}-${defIdRef.value++}`, [defIdRef]);

  return (
    <RenderResourcesContext.Provider value={resolvedResources}>
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
 * Access resource store from the render context.
 * Returns undefined if resourceStore was not provided to RenderProvider.
 */
export function useRenderResourceStore(): ResourceStore | undefined {
  const ctx = useContext(RenderContext);
  return ctx?.resourceStore;
}

/**
 * Create a default render context for testing.
 */
export function createDefaultReactRenderContext(): ReactRenderContext {
  // eslint-disable-next-line no-restricted-syntax -- Closure state: unique ID counter for shapes
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
