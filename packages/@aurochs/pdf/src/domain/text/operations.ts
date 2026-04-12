/**
 * @file PdfText domain operations
 *
 * Type-safe update functions for PdfText elements.
 * These are the sole sanctioned way to modify PdfText properties —
 * they ensure invariants (rawBytes invalidation, editState management)
 * are maintained correctly.
 *
 * All functions are pure — they return a new PdfText without mutating the input.
 */

import type { PdfText, PdfTextEditState } from "./types";

// =============================================================================
// Text content operations
// =============================================================================

/**
 * Update the text content of a PdfText element.
 *
 * When the text actually changes:
 *   - rawBytes and rawText are invalidated (set to undefined)
 *   - editState.textChanged is set to true
 *
 * When the text is identical to the current value, returns the element unchanged.
 */
export function withTextContent(element: PdfText, newText: string): PdfText {
  if (element.text === newText) {
    return element;
  }

  return {
    ...element,
    text: newText,
    rawBytes: undefined,
    rawText: undefined,
    editState: mergeEditState(element.editState, { textChanged: true }),
  };
}

// =============================================================================
// Font operations
// =============================================================================

/**
 * Change the font family of a PdfText element.
 *
 * Updates baseFont to the new family and invalidates rawBytes/rawText
 * since the encoding may differ. Sets editState.fontChanged and records
 * the resolved font family for the writer to use during re-encoding.
 *
 * When the font family is identical to the current value, returns unchanged.
 */
export function withFontFamily(element: PdfText, fontFamily: string): PdfText {
  const currentFamily = element.baseFont ?? element.fontName;
  if (currentFamily === fontFamily) {
    return element;
  }

  return {
    ...element,
    baseFont: fontFamily,
    rawBytes: undefined,
    rawText: undefined,
    editState: mergeEditState(element.editState, {
      fontChanged: true,
      resolvedFontFamily: fontFamily,
    }),
  };
}

/**
 * Update the font size of a PdfText element.
 */
export function withFontSize(element: PdfText, fontSize: number): PdfText {
  if (element.fontSize === fontSize) {
    return element;
  }

  return {
    ...element,
    fontSize,
  };
}

/**
 * Update the character spacing (letter-spacing) of a PdfText element.
 */
export function withCharSpacing(element: PdfText, charSpacing: number | undefined): PdfText {
  if (element.charSpacing === charSpacing) {
    return element;
  }

  return {
    ...element,
    charSpacing,
  };
}

// =============================================================================
// Edit state helpers
// =============================================================================

/**
 * Merge a partial editState into an existing one.
 *
 * Preserves existing flags — once textChanged or fontChanged is set to true,
 * it stays true (cannot be un-edited within a single edit session).
 */
function mergeEditState(
  existing: PdfTextEditState | undefined,
  update: Partial<PdfTextEditState>,
): PdfTextEditState {
  return {
    textChanged: update.textChanged ?? existing?.textChanged ?? false,
    fontChanged: update.fontChanged ?? existing?.fontChanged ?? false,
    resolvedFontFamily: update.resolvedFontFamily ?? existing?.resolvedFontFamily,
  };
}
