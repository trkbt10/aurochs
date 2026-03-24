/**
 * @file DOCX to DrawingML Context Adapter
 *
 * Adapts DOCX document data to the format-agnostic DrawingML rendering context.
 * This allows DOCX-specific components to use shared DrawingML rendering.
 *
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

import type { DrawingMLRenderContext, WarningCollector } from "@aurochs-renderer/drawing-ml/react";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { DocxDrawingRenderContext, DocxPageSize } from "./types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create render size object from page size.
 */
function createRenderSize(pageSize: DocxPageSize | undefined): { width: number; height: number } | undefined {
  if (pageSize === undefined) {
    return undefined;
  }
  return {
    width: pageSize.width as number,
    height: pageSize.height as number,
  };
}

// =============================================================================
// Adapter Functions
// =============================================================================

/**
 * Create a DrawingML render context from DOCX drawing context.
 *
 * This adapter bridges DOCX-specific context to the format-agnostic
 * DrawingML rendering context used by shared rendering components.
 *
 * @param docxContext - DOCX drawing render context
 * @returns DrawingML render context suitable for DrawingMLProvider
 *
 * @example
 * ```tsx
 * function DocxDrawingRenderer({ docxContext }: Props) {
 *   const drawingMLContext = createDrawingMLContextFromDocx(docxContext);
 *
 *   return (
 *     <DrawingMLProvider {...drawingMLContext}>
 *       <SharedDrawingComponent />
 *     </DrawingMLProvider>
 *   );
 * }
 * ```
 */
export function createDrawingMLContextFromDocx(
  docxContext: DocxDrawingRenderContext,
): Omit<DrawingMLRenderContext, "getNextId"> & { getNextId: (prefix: string) => string } {
  // Adapt DOCX warnings collector to DrawingML WarningCollector interface
  const warnings: WarningCollector = {
    warn: (message, context) => {
      docxContext.warnings.add({
        type: "unsupported",
        message,
        details: context ? JSON.stringify(context) : undefined,
      });
    },
  };

  // Create resource resolver that uses ResourceStore
  const resolveResource = (resourceId: string): string | undefined => {
    return docxContext.resourceStore.toDataUrl(resourceId);
  };

  // Create ID generator for SVG defs
  // Each context instance gets its own counter
  // eslint-disable-next-line no-restricted-syntax -- Closure state: unique ID counter for SVG defs
  let defIdCounter = 0;
  const getNextId = (prefix: string): string => {
    return `${prefix}-${defIdCounter++}`;
  };

  // Create render size from page size if available
  const renderSize = createRenderSize(docxContext.pageSize);

  return {
    colorContext: docxContext.colorContext,
    resolveResource,
    getNextId,
    warnings,
    renderSize,
    // DOCX does not have a resolved background like PPTX slides
    resolvedBackground: undefined,
  };
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty color context (for testing or when no theme is available).
 */
export function createEmptyColorContext(): ColorContext {
  return {
    colorScheme: {},
    colorMap: {},
  };
}

/**
 * Create a default DOCX drawing render context for testing.
 */
export function createDefaultDocxDrawingContext(): DocxDrawingRenderContext {
  const warnings: { type: "unsupported" | "missing" | "invalid"; message: string; details?: string }[] = [];

  return {
    colorContext: createEmptyColorContext(),
    resourceStore: createResourceStore(),
    warnings: {
      add: (warning) => warnings.push(warning),
      getAll: () => warnings,
    },
  };
}
