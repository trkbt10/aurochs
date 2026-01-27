/**
 * @file Text editing state for inline text editing
 *
 * Manages state for editing text within shapes.
 */

import type { TextBody, RunProperties } from "@oxen/pptx/domain";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { CursorPosition, TextSelection } from "./cursor";

// =============================================================================
// Types
// =============================================================================

/**
 * Bounds of the text editing area
 */
export type TextEditBounds = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
  readonly rotation: number; // degrees
};

/**
 * Sticky formatting state.
 * Tracks formatting to apply to newly typed text.
 */
export type StickyFormattingState = {
  /** Run properties to apply to new text */
  readonly runProperties: RunProperties;
  /** Whether sticky formatting is active */
  readonly active: boolean;
};

/**
 * Text cursor/selection state for property panel integration.
 */
export type TextCursorState = {
  /** Current cursor position */
  readonly cursorPosition: CursorPosition;
  /** Current text selection (if any) */
  readonly selection: TextSelection | undefined;
};

/**
 * Inactive text edit state
 */
export type InactiveTextEditState = {
  readonly type: "inactive";
};

/**
 * Active text edit state
 */
export type ActiveTextEditState = {
  readonly type: "active";
  readonly shapeId: ShapeId;
  readonly bounds: TextEditBounds;
  readonly initialTextBody: TextBody;
};

/**
 * Text edit state union
 */
export type TextEditState = InactiveTextEditState | ActiveTextEditState;

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create inactive text edit state
 */
export function createInactiveTextEditState(): InactiveTextEditState {
  return { type: "inactive" };
}

/**
 * Create active text edit state
 */
export function createActiveTextEditState(
  shapeId: ShapeId,
  bounds: TextEditBounds,
  initialTextBody: TextBody
): ActiveTextEditState {
  return {
    type: "active",
    shapeId,
    bounds,
    initialTextBody,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if text edit state is inactive
 */
export function isTextEditInactive(
  state: TextEditState
): state is InactiveTextEditState {
  return state.type === "inactive";
}

/**
 * Check if text edit state is active
 */
export function isTextEditActive(
  state: TextEditState
): state is ActiveTextEditState {
  return state.type === "active";
}

// =============================================================================
// Sticky Formatting Helpers
// =============================================================================

/**
 * Create initial sticky formatting state (inactive)
 */
export function createInitialStickyFormatting(): StickyFormattingState {
  return {
    runProperties: {},
    active: false,
  };
}

/**
 * Create active sticky formatting state
 */
export function createActiveStickyFormatting(
  runProperties: RunProperties
): StickyFormattingState {
  return {
    runProperties,
    active: true,
  };
}

/**
 * Create inactive sticky formatting that preserves properties
 * (used when cursor moves but properties are remembered)
 */
export function deactivateStickyFormatting(
  state: StickyFormattingState
): StickyFormattingState {
  return {
    ...state,
    active: false,
  };
}

/**
 * Create initial cursor state
 */
export function createInitialCursorState(): TextCursorState {
  return {
    cursorPosition: { paragraphIndex: 0, charOffset: 0 },
    selection: undefined,
  };
}

/**
 * Update cursor state with new position
 */
export function updateCursorState(
  cursorPosition: CursorPosition,
  selection: TextSelection | undefined
): TextCursorState {
  return { cursorPosition, selection };
}
