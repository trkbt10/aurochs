/**
 * @file DOCX Settings Parser
 *
 * Parses document settings from settings.xml.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.78 (settings)
 */

import { getChild, getAttr, type XmlElement } from "@aurochs/xml";
import type {
  DocxSettings,
  DocxZoom,
  DocxCompatSettings,
  DocxDocumentProtection,
  DocxThemeFontLang,
} from "../domain/document";
import { parseBoolean, parseInt32, parseToggleChild, getChildVal, getChildIntVal } from "./primitive";

// =============================================================================
// Zoom Parsing
// =============================================================================

/**
 * Parse zoom settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.94 (zoom)
 */
function parseZoom(element: XmlElement | undefined): DocxZoom | undefined {
  if (!element) return undefined;

  const percent = parseInt32(getAttr(element, "percent"));
  const val = getAttr(element, "val") as DocxZoom["val"] | undefined;

  if (percent === undefined && val === undefined) return undefined;

  return {
    ...(percent !== undefined && { percent }),
    ...(val && { val }),
  };
}

// =============================================================================
// Compatibility Settings Parsing
// =============================================================================

/**
 * Parse compatibility settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.21 (compat)
 */
function parseCompatSettings(element: XmlElement | undefined): DocxCompatSettings | undefined {
  if (!element) return undefined;

  const spaceForUL = parseToggleChild(element, "w:spaceForUL");
  const balanceSingleByteDoubleByteWidth = parseToggleChild(element, "w:balanceSingleByteDoubleByteWidth");
  const doNotExpandShiftReturn = parseToggleChild(element, "w:doNotExpandShiftReturn");
  const doNotUseHTMLParagraphAutoSpacing = parseToggleChild(element, "w:doNotUseHTMLParagraphAutoSpacing");
  const useAnsiKerningPairs = parseToggleChild(element, "w:useAnsiKerningPairs");
  const useFELayout = parseToggleChild(element, "w:useFELayout");

  if (
    spaceForUL === undefined &&
    balanceSingleByteDoubleByteWidth === undefined &&
    doNotExpandShiftReturn === undefined &&
    doNotUseHTMLParagraphAutoSpacing === undefined &&
    useAnsiKerningPairs === undefined &&
    useFELayout === undefined
  ) {
    return undefined;
  }

  return {
    ...(spaceForUL !== undefined && { spaceForUL }),
    ...(balanceSingleByteDoubleByteWidth !== undefined && { balanceSingleByteDoubleByteWidth }),
    ...(doNotExpandShiftReturn !== undefined && { doNotExpandShiftReturn }),
    ...(doNotUseHTMLParagraphAutoSpacing !== undefined && { doNotUseHTMLParagraphAutoSpacing }),
    ...(useAnsiKerningPairs !== undefined && { useAnsiKerningPairs }),
    ...(useFELayout !== undefined && { useFELayout }),
  };
}

// =============================================================================
// Document Protection Parsing
// =============================================================================

/**
 * Parse document protection settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.28 (documentProtection)
 */
function parseDocumentProtection(element: XmlElement | undefined): DocxDocumentProtection | undefined {
  if (!element) return undefined;

  const edit = getAttr(element, "edit") as DocxDocumentProtection["edit"] | undefined;
  const password = getAttr(element, "password");
  const cryptAlgorithmType = getAttr(element, "cryptAlgorithmType");
  const cryptAlgorithmClass = getAttr(element, "cryptAlgorithmClass");
  const cryptSpinCount = parseInt32(getAttr(element, "cryptSpinCount"));
  const hash = getAttr(element, "hash");
  const salt = getAttr(element, "salt");
  const enforcement = parseBoolean(getAttr(element, "enforcement"));

  return {
    ...(edit && { edit }),
    ...(password && { password }),
    ...(cryptAlgorithmType && { cryptAlgorithmType }),
    ...(cryptAlgorithmClass && { cryptAlgorithmClass }),
    ...(cryptSpinCount !== undefined && { cryptSpinCount }),
    ...(hash && { hash }),
    ...(salt && { salt }),
    ...(enforcement !== undefined && { enforcement }),
  };
}

// =============================================================================
// Theme Font Language Parsing
// =============================================================================

/**
 * Parse theme font language settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.86 (themeFontLang)
 */
function parseThemeFontLang(element: XmlElement | undefined): DocxThemeFontLang | undefined {
  if (!element) return undefined;

  const val = getAttr(element, "val");
  const eastAsia = getAttr(element, "eastAsia");
  const bidi = getAttr(element, "bidi");

  if (val === undefined && eastAsia === undefined && bidi === undefined) {
    return undefined;
  }

  return {
    ...(val && { val }),
    ...(eastAsia && { eastAsia }),
    ...(bidi && { bidi }),
  };
}

// =============================================================================
// Main Settings Parser
// =============================================================================

/**
 * Parse document settings from settings.xml.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.78 (settings)
 */
export function parseSettings(element: XmlElement): DocxSettings {
  const zoom = parseZoom(getChild(element, "w:zoom"));
  const removePersonalInformation = parseToggleChild(element, "w:removePersonalInformation");
  const removeDateAndTime = parseToggleChild(element, "w:removeDateAndTime");
  const doNotTrackMoves = parseToggleChild(element, "w:doNotTrackMoves");
  const doNotTrackFormatting = parseToggleChild(element, "w:doNotTrackFormatting");
  const documentProtection = parseDocumentProtection(getChild(element, "w:documentProtection"));
  const defaultTabStop = getChildIntVal(element, "w:defaultTabStop");
  const hyphenationZone = getChildIntVal(element, "w:hyphenationZone");
  const trackRevisions = parseToggleChild(element, "w:trackRevisions");
  const doNotUseMarginsForDrawingGridOrigin = parseToggleChild(element, "w:doNotUseMarginsForDrawingGridOrigin");
  const compat = parseCompatSettings(getChild(element, "w:compat"));
  const themeFontLang = parseThemeFontLang(getChild(element, "w:themeFontLang"));

  return {
    ...(zoom && { zoom }),
    ...(removePersonalInformation !== undefined && { removePersonalInformation }),
    ...(removeDateAndTime !== undefined && { removeDateAndTime }),
    ...(doNotTrackMoves !== undefined && { doNotTrackMoves }),
    ...(doNotTrackFormatting !== undefined && { doNotTrackFormatting }),
    ...(documentProtection && Object.keys(documentProtection).length > 0 && { documentProtection }),
    ...(defaultTabStop !== undefined && { defaultTabStop }),
    ...(hyphenationZone !== undefined && { hyphenationZone }),
    ...(trackRevisions !== undefined && { trackRevisions }),
    ...(doNotUseMarginsForDrawingGridOrigin !== undefined && { doNotUseMarginsForDrawingGridOrigin }),
    ...(compat && { compat }),
    ...(themeFontLang && { themeFontLang }),
  };
}
