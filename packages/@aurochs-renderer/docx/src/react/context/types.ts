/**
 * @file DOCX Drawing Context Types
 *
 * Type definitions for DOCX-specific drawing render context.
 *
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";

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

  /** Resource store for images and other resources */
  readonly resourceStore: ResourceStore;

  /** Warning collector for rendering issues */
  readonly warnings: DocxWarningCollector;

  /** Page size (for positioning calculations) */
  readonly pageSize?: DocxPageSize;

  /** Page margins (for positioning calculations) */
  readonly pageMargins?: DocxPageMargins;
};
