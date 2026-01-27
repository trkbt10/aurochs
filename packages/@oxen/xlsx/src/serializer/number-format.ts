/**
 * @file Number Format Serializer for styles.xml
 *
 * Serializes XlsxNumberFormat objects to XML elements for XLSX styles.xml.
 * Only custom formats (numFmtId >= 164) are serialized; built-in formats are omitted.
 *
 * @see ECMA-376 Part 4, Section 18.8.30 (numFmt Element)
 * @see ECMA-376 Part 4, Section 18.8.31 (numFmts)
 */

import type { XmlElement } from "@oxen/xml";
import type { XlsxNumberFormat } from "../domain/style/number-format";

// =============================================================================
// Constants
// =============================================================================

/**
 * First custom number format ID.
 * IDs 0-163 are reserved for built-in formats.
 */
const FIRST_CUSTOM_FORMAT_ID = 164;

// =============================================================================
// Single Element Serializer
// =============================================================================

/**
 * Serialize a single XlsxNumberFormat to an XML element.
 *
 * @param numberFormat - The number format to serialize
 * @returns XML element representation of the number format
 *
 * @example
 * ```typescript
 * const format: XlsxNumberFormat = {
 *   numFmtId: numFmtId(164),
 *   formatCode: "#,##0.00"
 * };
 * const element = serializeNumFmt(format);
 * // { type: "element", name: "numFmt", attrs: { numFmtId: "164", formatCode: "#,##0.00" }, children: [] }
 * ```
 *
 * @see ECMA-376 Part 4, Section 18.8.30
 */
export function serializeNumFmt(numberFormat: XlsxNumberFormat): XmlElement {
  return {
    type: "element",
    name: "numFmt",
    attrs: {
      numFmtId: String(numberFormat.numFmtId),
      formatCode: numberFormat.formatCode,
    },
    children: [],
  };
}

// =============================================================================
// Collection Serializer
// =============================================================================

/**
 * Serialize multiple XlsxNumberFormat objects to a numFmts XML element.
 *
 * Only custom formats (numFmtId >= 164) are included in the output.
 * Built-in formats (numFmtId 0-163) are omitted as they are implied by the specification.
 *
 * @param numberFormats - Array of number formats to serialize
 * @returns XML element representation, or undefined if no custom formats exist
 *
 * @example
 * ```typescript
 * const formats: XlsxNumberFormat[] = [
 *   { numFmtId: numFmtId(0), formatCode: "General" },     // built-in, omitted
 *   { numFmtId: numFmtId(164), formatCode: "#,##0.00" },  // custom, included
 *   { numFmtId: numFmtId(165), formatCode: "yyyy-mm-dd" } // custom, included
 * ];
 * const element = serializeNumFmts(formats);
 * // { type: "element", name: "numFmts", attrs: { count: "2" }, children: [...] }
 * ```
 *
 * @see ECMA-376 Part 4, Section 18.8.31
 */
export function serializeNumFmts(
  numberFormats: readonly XlsxNumberFormat[],
): XmlElement | undefined {
  // Filter to only custom formats (ID >= 164)
  const customFormats = numberFormats.filter(
    (format) => (format.numFmtId as number) >= FIRST_CUSTOM_FORMAT_ID,
  );

  // Return undefined if no custom formats (element should be omitted)
  if (customFormats.length === 0) {
    return undefined;
  }

  // Build children from custom formats
  const children: XmlElement[] = customFormats.map(serializeNumFmt);

  return {
    type: "element",
    name: "numFmts",
    attrs: {
      count: String(customFormats.length),
    },
    children,
  };
}

