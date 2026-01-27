/**
 * @file Text Edit Controller Types
 *
 * Shared type definitions for text editing components.
 */

import type { TextBody, RunProperties, ParagraphProperties } from "@oxen/pptx/domain";
import type { ColorContext } from "@oxen/pptx/domain/color/context";
import type { FontScheme } from "@oxen/pptx/domain/resolution";
import type { TextEditBounds } from "../input-support/state";
import type {
  CursorCoordinates,
  SelectionRect,
  CursorPosition,
  TextSelection,
} from "../input-support/cursor";

// =============================================================================
// Component Props
// =============================================================================

/**
 * Selection change event data.
 */
export type SelectionChangeEvent = {
  /** Current text body (reflecting edits) */
  readonly textBody: TextBody;
  /** Cursor position (if no selection range) */
  readonly cursorPosition: CursorPosition | undefined;
  /** Selection range (if text is selected) */
  readonly selection: TextSelection | undefined;
};

/**
 * Props for TextEditController component.
 */
export type TextEditControllerProps = {
  /** Bounds of the text editing area */
  readonly bounds: TextEditBounds;
  /** Initial text body */
  readonly textBody: TextBody;
  /** Color context for style resolution */
  readonly colorContext?: ColorContext;
  /** Font scheme for theme fonts */
  readonly fontScheme?: FontScheme;
  /** Slide dimensions for positioning */
  readonly slideWidth: number;
  readonly slideHeight: number;
  /** Embedded font CSS (@font-face declarations from PDF import) */
  readonly embeddedFontCss?: string;
  /** Called when editing is complete */
  readonly onComplete: (newText: string) => void;
  /** Called when editing is cancelled */
  readonly onCancel: () => void;
  /** Show selection highlight overlay */
  readonly showSelectionOverlay?: boolean;
  /** Show the edit frame outline */
  readonly showFrameOutline?: boolean;

  // === Extended props for property panel integration ===

  /**
   * Called when cursor position or selection changes.
   * Used by TextEditContext to update property extraction.
   */
  readonly onSelectionChange?: (event: SelectionChangeEvent) => void;

  /**
   * Apply run properties to the current selection.
   * If there's a selection, applies to selected runs (with run splitting).
   * If cursor only, sets sticky formatting for next input.
   */
  readonly onApplyRunFormat?: (textBody: TextBody) => void;

  /**
   * Apply paragraph properties to paragraphs in the current selection.
   */
  readonly onApplyParagraphFormat?: (textBody: TextBody) => void;
};

// =============================================================================
// State Types
// =============================================================================

/**
 * Cursor visual state.
 */
export type CursorState = {
  /** Cursor coordinates (or undefined if no layout) */
  readonly cursor: CursorCoordinates | undefined;
  /** Selection rectangles */
  readonly selectionRects: readonly SelectionRect[];
  /** Whether cursor should blink */
  readonly isBlinking: boolean;
};

/**
 * IME composition state.
 */
export type CompositionState = {
  /** Whether currently composing (IME active) */
  readonly isComposing: boolean;
  /** The composition text (未確定文字) */
  readonly text: string;
  /** Start position of composition */
  readonly startOffset: number;
};
