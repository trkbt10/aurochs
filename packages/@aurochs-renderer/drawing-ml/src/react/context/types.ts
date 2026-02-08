/**
 * @file DrawingML Render Context Types
 *
 * Format-agnostic context types for shared DrawingML rendering.
 * Each format (PPTX, DOCX, XLSX) provides an adapter to create this context.
 */

import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";
import type { ReactNode } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Warning collector interface for DrawingML rendering.
 */
export type WarningCollector = {
  /**
   * Add a warning message.
   */
  readonly warn: (message: string, context?: Record<string, unknown>) => void;
};

/**
 * Size of the rendering area (slide, page, etc.)
 */
export type RenderSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * Format-agnostic render context for DrawingML components.
 *
 * This context provides the minimal interface needed for shared DrawingML
 * rendering components (colors, fills, effects, etc.) without format-specific
 * dependencies like PPTX SlideSize or ResourceResolver.
 */
export type DrawingMLRenderContext = {
  /**
   * Color resolution context (scheme colors and color map).
   * Required for resolving scheme colors to hex values.
   *
   * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
   */
  readonly colorContext: ColorContext;

  /**
   * Resolve a resource ID to a URL.
   * Used for image fills and embedded resources.
   *
   * @param resourceId - Resource relationship ID (e.g., "rId1")
   * @returns URL string or undefined if not found
   */
  readonly resolveResource?: (resourceId: string) => string | undefined;

  /**
   * Generate a unique ID with the given prefix.
   * Used for SVG defs (gradients, patterns, filters, etc.).
   *
   * @param prefix - ID prefix (e.g., "gradient", "pattern", "filter")
   * @returns Unique ID string
   */
  readonly getNextId: (prefix: string) => string;

  /**
   * Warning collector for non-fatal issues during rendering.
   */
  readonly warnings: WarningCollector;

  /**
   * Resolved background fill for the rendering area (slide, page, etc.).
   * Optional - not all contexts have a background.
   */
  readonly resolvedBackground?: ResolvedBackgroundFill;

  /**
   * Size of the rendering area (slide, page, etc.).
   * Optional - used for background rendering and aspect ratio calculations.
   */
  readonly renderSize?: RenderSize;
};

/**
 * SVG defs manager interface.
 * Used by components that need to register SVG definitions.
 */
export type SvgDefsManager = {
  /**
   * Generate a unique ID with prefix.
   */
  readonly getNextId: (prefix: string) => string;

  /**
   * Add a def element to the collection.
   */
  readonly addDef: (id: string, content: ReactNode) => void;

  /**
   * Check if a def with the given ID already exists.
   */
  readonly hasDef: (id: string) => boolean;
};
