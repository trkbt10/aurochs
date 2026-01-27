/**
 * @file Clipboard state management
 *
 * Clipboard content type for copy/paste operations.
 */

import type { Shape } from "@oxen/pptx/domain";

// =============================================================================
// Types
// =============================================================================

/**
 * Clipboard content for copy/paste
 */
export type ClipboardContent = {
  /** Copied shapes */
  readonly shapes: readonly Shape[];
  /** Paste offset counter (increases with each paste) */
  readonly pasteCount: number;
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Create clipboard content from shapes
 */
export function createClipboardContent(
  shapes: readonly Shape[]
): ClipboardContent {
  return {
    shapes,
    pasteCount: 0,
  };
}

/**
 * Increment paste count
 */
export function incrementPasteCount(
  clipboard: ClipboardContent
): ClipboardContent {
  return {
    ...clipboard,
    pasteCount: clipboard.pasteCount + 1,
  };
}
