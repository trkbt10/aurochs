/**
 * @file DrawingML Context Provider
 *
 * React context provider for DrawingML render context.
 * Format-specific renderers create adapters to populate this context.
 */

import { createContext, useMemo, type ReactNode } from "react";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type { DrawingMLRenderContext, WarningCollector } from "./types";

// =============================================================================
// Context
// =============================================================================

/**
 * React context for DrawingML rendering.
 */
export const DrawingMLContext = createContext<DrawingMLRenderContext | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

/**
 * Props for DrawingMLProvider
 */
export type DrawingMLProviderProps = {
  readonly children: ReactNode;
  /**
   * Color context for resolving scheme colors.
   */
  readonly colorContext?: ColorContext;
  /**
   * Optional resource resolver function.
   */
  readonly resolveResource?: (resourceId: string) => string | undefined;
  /**
   * Optional ID generator function.
   * If not provided, uses a default counter-based generator.
   */
  readonly getNextId?: (prefix: string) => string;
  /**
   * Optional warning collector.
   * If not provided, uses a no-op collector.
   */
  readonly warnings?: WarningCollector;
};

// =============================================================================
// Default Implementations
// =============================================================================

/**
 * Create default warning collector (no-op).
 */
function createDefaultWarnings(): WarningCollector {
  return {
    warn: () => {
      // No-op by default
    },
  };
}

/**
 * Create default ID generator.
 */
function createDefaultIdGenerator(): (prefix: string) => string {
  let counter = 0;
  return (prefix: string) => `${prefix}-${counter++}`;
}

/**
 * Default empty color context.
 */
const DEFAULT_COLOR_CONTEXT: ColorContext = {
  colorScheme: {},
  colorMap: {},
};

// =============================================================================
// Provider
// =============================================================================

/**
 * Provides DrawingML render context to child components.
 *
 * This provider is format-agnostic and can be used by PPTX, DOCX, or XLSX
 * renderers by passing format-specific values.
 *
 * @example
 * ```tsx
 * // PPTX adapter usage
 * <DrawingMLProvider
 *   colorContext={pptxContext.colorContext}
 *   resolveResource={(id) => pptxContext.resources.resolveRelId(id)}
 *   getNextId={pptxContext.getNextShapeId}
 *   warnings={pptxContext.warnings}
 * >
 *   <ShapeRenderer />
 * </DrawingMLProvider>
 * ```
 */
export function DrawingMLProvider({
  children,
  colorContext,
  resolveResource,
  getNextId,
  warnings,
}: DrawingMLProviderProps): ReactNode {
  const defaultIdGenerator = useMemo(createDefaultIdGenerator, []);

  const ctx = useMemo<DrawingMLRenderContext>(
    () => ({
      colorContext: colorContext ?? DEFAULT_COLOR_CONTEXT,
      resolveResource,
      getNextId: getNextId ?? defaultIdGenerator,
      warnings: warnings ?? createDefaultWarnings(),
    }),
    [colorContext, resolveResource, getNextId, warnings, defaultIdGenerator],
  );

  return (
    <DrawingMLContext.Provider value={ctx}>
      {children}
    </DrawingMLContext.Provider>
  );
}
