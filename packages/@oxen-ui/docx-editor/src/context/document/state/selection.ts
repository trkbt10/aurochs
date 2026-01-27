/**
 * @file DOCX Editor Selection State
 *
 * Manages selection of paragraphs, runs, and text ranges in a DOCX document.
 * Supports both element-level selection (paragraphs, tables) and text-level
 * selection (character ranges within paragraphs).
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Unique identifier for document elements (paragraphs, tables, etc.)
 */
export type ElementId = string;

/**
 * Text position within the document.
 *
 * Uses paragraph index and character offset for precise positioning.
 */
export type TextPosition = {
  /** Paragraph index in the document body */
  readonly paragraphIndex: number;
  /** Character offset within the paragraph */
  readonly charOffset: number;
};

/**
 * Text range selection (for text-level operations).
 */
export type TextRange = {
  /** Start position (inclusive) */
  readonly start: TextPosition;
  /** End position (exclusive) */
  readonly end: TextPosition;
};

/**
 * Element-level selection state.
 *
 * Used for selecting whole elements like paragraphs or tables.
 */
export type ElementSelectionState = {
  /** Selected element IDs (in selection order) */
  readonly selectedIds: readonly ElementId[];
  /** Primary element (last selected, used for focused editing) */
  readonly primaryId: ElementId | undefined;
};

/**
 * Text-level selection state.
 *
 * Used for selecting character ranges within paragraphs.
 */
export type TextSelectionState = {
  /** Selection range (undefined means no selection) */
  readonly range: TextRange | undefined;
  /** Cursor position when no range selected */
  readonly cursor: TextPosition | undefined;
  /** Whether selection is collapsed (cursor only) */
  readonly isCollapsed: boolean;
};

/**
 * Combined selection state for DOCX editor.
 */
export type DocxSelectionState = {
  /** Element-level selection */
  readonly element: ElementSelectionState;
  /** Text-level selection (within a paragraph) */
  readonly text: TextSelectionState;
  /** Current selection mode */
  readonly mode: "element" | "text";
};

// =============================================================================
// Factory Functions - Element Selection
// =============================================================================

/**
 * Create an empty element selection.
 */
export function createEmptyElementSelection(): ElementSelectionState {
  return {
    selectedIds: [],
    primaryId: undefined,
  };
}

/**
 * Create a single element selection.
 */
export function createSingleElementSelection(elementId: ElementId): ElementSelectionState {
  return {
    selectedIds: [elementId],
    primaryId: elementId,
  };
}

/**
 * Create a multi-element selection.
 */
export function createMultiElementSelection(
  elementIds: readonly ElementId[],
  primaryId?: ElementId,
): ElementSelectionState {
  return {
    selectedIds: elementIds,
    primaryId: primaryId ?? elementIds[elementIds.length - 1],
  };
}

// =============================================================================
// Mutation Functions - Element Selection
// =============================================================================

/**
 * Add an element to the selection.
 */
export function addToElementSelection(
  selection: ElementSelectionState,
  elementId: ElementId,
): ElementSelectionState {
  if (selection.selectedIds.includes(elementId)) {
    return {
      ...selection,
      primaryId: elementId,
    };
  }

  return {
    selectedIds: [...selection.selectedIds, elementId],
    primaryId: elementId,
  };
}

/**
 * Get new primary ID after removing an element.
 */
function getPrimaryIdAfterRemove(
  removedId: ElementId,
  currentPrimaryId: ElementId | undefined,
  remainingIds: readonly ElementId[],
): ElementId | undefined {
  if (currentPrimaryId === removedId) {
    return remainingIds[remainingIds.length - 1];
  }
  return currentPrimaryId;
}

/**
 * Remove an element from the selection.
 */
export function removeFromElementSelection(
  selection: ElementSelectionState,
  elementId: ElementId,
): ElementSelectionState {
  const newSelectedIds = selection.selectedIds.filter((id) => id !== elementId);
  const newPrimaryId = getPrimaryIdAfterRemove(elementId, selection.primaryId, newSelectedIds);

  return {
    selectedIds: newSelectedIds,
    primaryId: newPrimaryId,
  };
}

/**
 * Toggle an element in the selection.
 */
export function toggleElementSelection(
  selection: ElementSelectionState,
  elementId: ElementId,
): ElementSelectionState {
  if (selection.selectedIds.includes(elementId)) {
    return removeFromElementSelection(selection, elementId);
  }
  return addToElementSelection(selection, elementId);
}

/**
 * Set selection to a single element, replacing any existing selection.
 */
export function setElementSelection(
  elementId: ElementId,
): ElementSelectionState {
  return createSingleElementSelection(elementId);
}

// =============================================================================
// Query Functions - Element Selection
// =============================================================================

/**
 * Check if an element is selected.
 */
export function isElementSelected(
  selection: ElementSelectionState,
  elementId: ElementId,
): boolean {
  return selection.selectedIds.includes(elementId);
}

/**
 * Check if element selection is empty.
 */
export function isElementSelectionEmpty(selection: ElementSelectionState): boolean {
  return selection.selectedIds.length === 0;
}

/**
 * Get the number of selected elements.
 */
export function getElementSelectionCount(selection: ElementSelectionState): number {
  return selection.selectedIds.length;
}

// =============================================================================
// Factory Functions - Text Selection
// =============================================================================

/**
 * Create an empty text selection.
 */
export function createEmptyTextSelection(): TextSelectionState {
  return {
    range: undefined,
    cursor: undefined,
    isCollapsed: true,
  };
}

/**
 * Create a cursor-only text selection.
 */
export function createCursorSelection(position: TextPosition): TextSelectionState {
  return {
    range: undefined,
    cursor: position,
    isCollapsed: true,
  };
}

/**
 * Create a text range selection.
 */
export function createRangeSelection(start: TextPosition, end: TextPosition): TextSelectionState {
  // Normalize so start is before end
  const [normalizedStart, normalizedEnd] = normalizeRange(start, end);

  return {
    range: { start: normalizedStart, end: normalizedEnd },
    cursor: undefined,
    isCollapsed: false,
  };
}

// =============================================================================
// Mutation Functions - Text Selection
// =============================================================================

/**
 * Extend text selection to a new position.
 */
export function extendTextSelection(
  selection: TextSelectionState,
  toPosition: TextPosition,
): TextSelectionState {
  const anchor = selection.cursor ?? selection.range?.start;
  if (!anchor) {
    return createCursorSelection(toPosition);
  }

  if (comparePositions(anchor, toPosition) === 0) {
    return createCursorSelection(anchor);
  }

  return createRangeSelection(anchor, toPosition);
}

/**
 * Collapse text selection to cursor.
 */
export function collapseTextSelection(
  selection: TextSelectionState,
  toEnd: boolean = false,
): TextSelectionState {
  if (selection.isCollapsed || !selection.range) {
    return selection;
  }

  const position = toEnd ? selection.range.end : selection.range.start;
  return createCursorSelection(position);
}

// =============================================================================
// Query Functions - Text Selection
// =============================================================================

/**
 * Check if text selection is empty (no cursor or range).
 */
export function isTextSelectionEmpty(selection: TextSelectionState): boolean {
  return selection.cursor === undefined && selection.range === undefined;
}

/**
 * Check if a position is within the text selection.
 */
export function isPositionInTextSelection(
  selection: TextSelectionState,
  position: TextPosition,
): boolean {
  if (!selection.range) {
    return false;
  }

  return (
    comparePositions(position, selection.range.start) >= 0 &&
    comparePositions(position, selection.range.end) < 0
  );
}

// =============================================================================
// Combined Selection Functions
// =============================================================================

/**
 * Create an empty combined selection.
 */
export function createEmptyDocxSelection(): DocxSelectionState {
  return {
    element: createEmptyElementSelection(),
    text: createEmptyTextSelection(),
    mode: "element",
  };
}

/**
 * Switch to element selection mode.
 */
export function switchToElementMode(selection: DocxSelectionState): DocxSelectionState {
  return {
    ...selection,
    text: createEmptyTextSelection(),
    mode: "element",
  };
}

/**
 * Switch to text selection mode.
 */
export function switchToTextMode(selection: DocxSelectionState): DocxSelectionState {
  return {
    ...selection,
    element: createEmptyElementSelection(),
    mode: "text",
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Compare two text positions.
 *
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function comparePositions(a: TextPosition, b: TextPosition): -1 | 0 | 1 {
  if (a.paragraphIndex < b.paragraphIndex) {return -1;}
  if (a.paragraphIndex > b.paragraphIndex) {return 1;}
  if (a.charOffset < b.charOffset) {return -1;}
  if (a.charOffset > b.charOffset) {return 1;}
  return 0;
}

/**
 * Normalize a range so start is before end.
 */
function normalizeRange(start: TextPosition, end: TextPosition): [TextPosition, TextPosition] {
  if (comparePositions(start, end) <= 0) {
    return [start, end];
  }
  return [end, start];
}
