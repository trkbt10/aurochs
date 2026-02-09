/**
 * @file PPTX Patch Specification Types
 *
 * Types for patching existing PPTX files. Each patch describes a specific
 * modification to apply to the presentation.
 */

import type { SlideModSpec, ThemeEditSpec } from "./types";
import type {
  SlideAddSpec,
  SlideRemoveSpec,
  SlideReorderSpec,
  SlideDuplicateSpec,
} from "./slide-ops";

// =============================================================================
// Patch Operations
// =============================================================================

/**
 * Replace text in shapes across slides.
 */
export type TextReplacePatch = {
  readonly type: "text.replace";
  /** Search string to find */
  readonly search: string;
  /** Replacement string */
  readonly replace: string;
  /** Replace all occurrences (default: true) */
  readonly replaceAll?: boolean;
  /** Limit replacement to specific slide numbers (1-based). If omitted, applies to all slides. */
  readonly slides?: readonly number[];
};

/**
 * Modify slide content (add shapes, images, tables, charts, etc.).
 * Reuses existing SlideModSpec fields.
 */
export type SlideModifyPatch = {
  readonly type: "slide.modify";
} & SlideModSpec;

/**
 * Update theme colors and/or fonts.
 */
export type ThemeUpdatePatch = {
  readonly type: "theme.update";
} & Omit<ThemeEditSpec, "path">;

/**
 * Add a new slide from a layout.
 */
export type SlideAddPatch = {
  readonly type: "slide.add";
} & SlideAddSpec;

/**
 * Remove a slide.
 */
export type SlideRemovePatch = {
  readonly type: "slide.remove";
} & SlideRemoveSpec;

/**
 * Duplicate a slide.
 */
export type SlideDuplicatePatch = {
  readonly type: "slide.duplicate";
} & SlideDuplicateSpec;

/**
 * Reorder a slide.
 */
export type SlideReorderPatch = {
  readonly type: "slide.reorder";
} & SlideReorderSpec;

// =============================================================================
// Patch Union
// =============================================================================

export type PptxPatch =
  | TextReplacePatch
  | SlideModifyPatch
  | ThemeUpdatePatch
  | SlideAddPatch
  | SlideRemovePatch
  | SlideDuplicatePatch
  | SlideReorderPatch;

// =============================================================================
// Top-level Patch Spec
// =============================================================================

export type PptxPatchSpec = {
  readonly source: string;
  readonly output: string;
  readonly patches: readonly PptxPatch[];
};

// =============================================================================
// Patch Result Data
// =============================================================================

export type PptxPatchData = {
  readonly sourcePath: string;
  readonly outputPath: string;
  readonly patchCount: number;
  readonly slidesModified: number;
  readonly textReplacements: number;
};
