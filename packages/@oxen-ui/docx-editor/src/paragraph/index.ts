/**
 * @file DOCX Paragraph Module
 *
 * Exports paragraph mutation utilities for the DOCX editor.
 */

export {
  appendParagraphContent,
  applyFormattingToRange,
  createParagraph,
  createTextParagraph,
  decreaseListLevel,
  deleteTextRange,
  getListLevel,
  getParagraphLength,
  getParagraphRuns,
  getParagraphText,
  increaseListLevel,
  insertParagraphContent,
  insertText,
  isListItem,
  isParagraphEmpty,
  mergeParagraphProperties,
  mergeParagraphs,
  prependParagraphContent,
  removeNumbering,
  removeParagraphContent,
  removeParagraphProperty,
  replaceParagraphContent,
  setFirstLineIndent,
  setHangingIndent,
  setLeftIndent,
  setLineSpacing,
  setNumbering,
  setParagraphAlignment,
  setParagraphContent,
  setParagraphIndent,
  setParagraphProperties,
  setParagraphSpacing,
  setSpaceAfter,
  setSpaceBefore,
  splitParagraph,
} from "./mutation";
