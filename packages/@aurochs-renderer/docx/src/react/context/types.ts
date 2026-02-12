/**
 * @file DOCX Drawing Context Types
 *
 * Type definitions for DOCX-specific drawing render context.
 *
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Resource Resolver Types
// =============================================================================

/**
 * Resource resolver for DOCX drawings.
 *
 * Resolves relationship IDs to data URLs for images and other resources.
 */
export type DocxResourceResolver = {
  /**
   * Resolve a relationship ID to a data URL.
   *
   * @param rId - Relationship ID (e.g., "rId5")
   * @returns Data URL or undefined if not found
   */
  readonly resolve: (rId: string) => string | undefined;

  /**
   * Get the MIME type for a resource.
   *
   * @param rId - Relationship ID
   * @returns MIME type (e.g., "image/png") or undefined
   */
  readonly getMimeType: (rId: string) => string | undefined;

  /**
   * Get the target path for a relationship ID.
   *
   * @param rId - Relationship ID
   * @returns Target path (e.g., "media/image1.png") or undefined
   */
  readonly getTarget: (rId: string) => string | undefined;
};

// =============================================================================
// Warning Collector
// =============================================================================

/**
 * Warning type for DOCX rendering issues.
 */
export type DocxRenderWarning = {
  readonly type: "unsupported" | "missing" | "invalid";
  readonly message: string;
  readonly details?: string;
};

/**
 * Warning collector for DOCX rendering.
 */
export type DocxWarningCollector = {
  readonly add: (warning: DocxRenderWarning) => void;
  readonly getAll: () => readonly DocxRenderWarning[];
};

// =============================================================================
// Page Configuration
// =============================================================================

/**
 * Page size configuration.
 */
export type DocxPageSize = {
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Page margins configuration.
 */
export type DocxPageMargins = {
  readonly top: Pixels;
  readonly right: Pixels;
  readonly bottom: Pixels;
  readonly left: Pixels;
};

// =============================================================================
// Drawing Render Context
// =============================================================================

/**
 * DOCX Drawing render context.
 *
 * Provides resources needed for rendering DrawingML elements in DOCX.
 */
export type DocxDrawingRenderContext = {
  /** Color context for scheme color resolution */
  readonly colorContext: ColorContext;

  /** Resource resolver for images and other resources */
  readonly resources: DocxResourceResolver;

  /** Warning collector for rendering issues */
  readonly warnings: DocxWarningCollector;

  /** Page size (for positioning calculations) */
  readonly pageSize?: DocxPageSize;

  /** Page margins (for positioning calculations) */
  readonly pageMargins?: DocxPageMargins;
};
