/**
 * @file Text Edit Controller Types
 *
 * Shared type definitions for text editing components.
 */

import type { TextBody } from "../../../pptx/domain";
import type { ColorContext, FontScheme } from "../../../pptx/domain/resolution";
import type { TextEditBounds } from "./state";
import type { CursorCoordinates, SelectionRect } from "./cursor";

// =============================================================================
// Component Props
// =============================================================================

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
  /** Called when editing is complete */
  readonly onComplete: (newText: string) => void;
  /** Called when editing is cancelled */
  readonly onCancel: () => void;
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
