/**
 * @file Number Format Parser for styles.xml
 *
 * Parses numFmt elements from the styles.xml file in XLSX files.
 * Number formats define how numeric values are displayed (currency, dates, percentages, etc.).
 *
 * @see ECMA-376 Part 4, Section 18.8.30 (numFmt Element)
 * @see ECMA-376 Part 4, Section 18.8.31 (numFmts)
 */

import type { XmlElement } from "@oxen/xml";
import { getChildren, getAttr } from "@oxen/xml";
import type { XlsxNumberFormat } from "../../domain/style/number-format";
import { resolveFormatCode as resolveFormatCodeFromDomain } from "../../domain/style/number-format";
import { numFmtId } from "../../domain/types";
import { parseIntRequired } from "../primitive";

// =============================================================================
// Single Element Parser
// =============================================================================

/**
 * Parse a single numFmt element.
 *
 * @param numFmtElement - The <numFmt> element to parse
 * @returns Parsed XlsxNumberFormat object
 * @throws Error if required numFmtId attribute is missing
 *
 * @example
 * ```typescript
 * // XML: <numFmt numFmtId="164" formatCode="#,##0.00"/>
 * const format = parseNumFmt(numFmtElement);
 * // { numFmtId: NumFmtId(164), formatCode: "#,##0.00" }
 * ```
 *
 * @see ECMA-376 Part 4, Section 18.8.30
 */
export function parseNumFmt(numFmtElement: XmlElement): XlsxNumberFormat {
  const numFmtIdAttr = getAttr(numFmtElement, "numFmtId");
  const formatCode = getAttr(numFmtElement, "formatCode") ?? "";

  const id = parseIntRequired(numFmtIdAttr, "numFmtId");

  return {
    numFmtId: numFmtId(id),
    formatCode,
  };
}

// =============================================================================
// Collection Parser
// =============================================================================

/**
 * Parse all numFmt elements from a numFmts container.
 *
 * @param numFmtsElement - The <numFmts> container element, or undefined
 * @returns Array of parsed XlsxNumberFormat objects
 *
 * @example
 * ```typescript
 * // XML: <numFmts count="2">
 * //        <numFmt numFmtId="164" formatCode="#,##0.00"/>
 * //        <numFmt numFmtId="165" formatCode="yyyy-mm-dd"/>
 * //      </numFmts>
 * const formats = parseNumFmts(numFmtsElement);
 * // [{ numFmtId: 164, formatCode: "#,##0.00" }, { numFmtId: 165, formatCode: "yyyy-mm-dd" }]
 * ```
 *
 * @see ECMA-376 Part 4, Section 18.8.31
 */
export function parseNumFmts(
  numFmtsElement: XmlElement | undefined,
): readonly XlsxNumberFormat[] {
  if (!numFmtsElement) {
    return [];
  }

  const result: XlsxNumberFormat[] = [];
  const numFmtElements = getChildren(numFmtsElement, "numFmt");
  for (const numFmtEl of numFmtElements) {
    result.push(parseNumFmt(numFmtEl));
  }
  return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a numFmtId represents a custom format.
 *
 * Built-in formats use IDs 0-163, while custom formats use IDs 164 and above.
 *
 * @param numFmtIdValue - The number format ID to check
 * @returns true if the ID represents a custom format (164+)
 *
 * @example
 * ```typescript
 * isCustomFormat(0)    // false (General)
 * isCustomFormat(14)   // false (date format)
 * isCustomFormat(164)  // true (first custom format)
 * isCustomFormat(200)  // true
 * ```
 */
export function isCustomFormat(numFmtIdValue: number): boolean {
  // Built-in formats are 0-163, custom formats are 164+
  return numFmtIdValue >= 164;
}

/**
 * Resolve the format code for a given numFmtId.
 *
 * First checks built-in formats, then searches custom formats.
 * Falls back to "General" if the format is not found.
 *
 * @param numFmtIdValue - The number format ID to resolve
 * @param customFormats - Array of custom format definitions from styles.xml
 * @returns The format code string
 *
 * @example
 * ```typescript
 * const customFormats = [{ numFmtId: 164, formatCode: "#,##0.00" }];
 *
 * resolveFormatCode(0, customFormats)    // "General"
 * resolveFormatCode(14, customFormats)   // "mm-dd-yy"
 * resolveFormatCode(164, customFormats)  // "#,##0.00"
 * resolveFormatCode(999, customFormats)  // "General" (fallback)
 * ```
 */
export function resolveFormatCode(
  numFmtIdValue: number,
  customFormats: readonly XlsxNumberFormat[],
): string {
  return resolveFormatCodeFromDomain(numFmtIdValue, customFormats);
}
