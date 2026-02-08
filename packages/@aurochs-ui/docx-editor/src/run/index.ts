/**
 * @file DOCX Run Module
 *
 * Exports run mutation utilities for the DOCX editor.
 */

export {
  appendRunContent,
  clearFormatting,
  createRun,
  createText,
  createTextRun,
  getRunLength,
  getRunText,
  hasFormatting,
  insertRunContent,
  isBold,
  isItalic,
  isRunEmpty,
  isStrikethrough,
  isUnderlined,
  mergeRunProperties,
  mergeRuns,
  prependRunContent,
  removeRunContent,
  removeRunProperty,
  setFontFamily,
  setFontSize,
  setHighlightColor,
  setRunContent,
  setRunProperties,
  setRunText,
  setTextColor,
  splitRun,
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleSubscript,
  toggleSuperscript,
  toggleUnderline,
} from "./mutation";
