/**
 * @file DOCX Selection Module
 *
 * Exports selection utilities for the DOCX editor.
 */

export {
  clampPosition,
  comparePositions,
  contentIndexToElementId,
  createPosition,
  createRange,
  elementIdToContentIndex,
  findRunAtOffset,
  getParagraphAtIndex,
  getParagraphCount,
  getParagraphIndices,
  getPositionAtParagraphEnd,
  getPositionAtParagraphStart,
  getRangeLength,
  getSelectedBodyContent,
  getSelectionAnchor,
  getSelectionFocus,
  hasElementSelection,
  hasTextSelection,
  intersectRanges,
  isPositionAfter,
  isPositionBefore,
  isPositionInRange,
  isPositionValid,
  isRangeCollapsed,
  isRangeValid,
  isSelectionEmpty,
  mergeRanges,
  movePositionBackward,
  movePositionForward,
  normalizeRange,
  positionToRunPosition,
  positionsEqual,
  rangeContains,
  rangesOverlap,
} from "./utils";
