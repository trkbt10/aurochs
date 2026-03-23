/**
 * @file PDF Editor types
 *
 * Editor-specific UI state types only.
 *
 * Domain operations → import from @aurochs/pdf
 * SVG coordinate conversion → import from @aurochs-renderer/pdf/svg
 */

import type { PdfDocument, PdfElement, PdfElementId } from "@aurochs/pdf";
import type { SelectionState } from "@aurochs-ui/editor-core/selection";
import type { UndoRedoHistory } from "@aurochs-ui/editor-core/history";
import type { DragState } from "@aurochs-ui/editor-core/drag-state";
import type { ClipboardContent } from "@aurochs-ui/editor-core/clipboard";

// =============================================================================
// Editor State
// =============================================================================

/** Text edit state for inline editing. */
export type PdfTextEditState =
  | { readonly active: false }
  | {
      readonly active: true;
      readonly elementId: PdfElementId;
      readonly initialText: string;
      readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    };

/** PDF editor state. */
export type PdfEditorState = {
  readonly documentHistory: UndoRedoHistory<PdfDocument>;
  readonly currentPageIndex: number;
  readonly selection: SelectionState<PdfElementId>;
  readonly drag: DragState<PdfElementId>;
  readonly textEdit: PdfTextEditState;
  readonly clipboard: ClipboardContent<readonly PdfElement[]> | undefined;
};
