/**
 * @file Clipboard state management
 *
 * Clipboard content type for copy/paste operations.
 */

import type { Shape } from "@oxen-office/pptx/domain";
import type { ClipboardContent as CoreClipboardContent } from "@oxen-ui/editor-core/clipboard";
import {
  createClipboardContent as createCoreClipboardContent,
  incrementPasteCount as incrementCorePasteCount,
} from "@oxen-ui/editor-core/clipboard";

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
  return fromCoreClipboard(createCoreClipboardContent({ payload: shapes }));
}

/**
 * Increment paste count
 */
export function incrementPasteCount(
  clipboard: ClipboardContent
): ClipboardContent {
  return fromCoreClipboard(incrementCorePasteCount(toCoreClipboard(clipboard)));
}

function toCoreClipboard(clipboard: ClipboardContent): CoreClipboardContent<readonly Shape[]> {
  return {
    payload: clipboard.shapes,
    pasteCount: clipboard.pasteCount,
    isCut: false,
  };
}

function fromCoreClipboard(core: CoreClipboardContent<readonly Shape[]>): ClipboardContent {
  return {
    shapes: core.payload,
    pasteCount: core.pasteCount,
  };
}
