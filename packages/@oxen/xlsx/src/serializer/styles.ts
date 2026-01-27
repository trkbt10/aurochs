/**
 * @file StyleSheet Serializer for styles.xml
 *
 * Serializes XlsxStyleSheet to XML elements for XLSX stylesheet generation.
 * Integrates individual serializers (font, fill, border, number-format) and
 * provides serialization for cellXfs, cellStyleXfs, cellStyles, alignment, and protection.
 *
 * @see ECMA-376 Part 4, Section 18.8.39 (styleSheet)
 * @see ECMA-376 Part 4, Section 18.8.10 (xf - Cell Format)
 * @see ECMA-376 Part 4, Section 18.8.1 (alignment)
 * @see ECMA-376 Part 4, Section 18.8.33 (protection)
 * @see ECMA-376 Part 4, Section 18.8.7 (cellStyle)
 */

import type { XmlElement } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type {
  XlsxStyleSheet,
  XlsxCellXf,
  XlsxCellStyle,
  XlsxAlignment,
  XlsxProtection,
} from "../domain/style/types";
import { serializeFonts } from "./font";
import { serializeFills } from "./fill";
import { serializeBorders } from "./border";
import { serializeNumFmts } from "./number-format";

// =============================================================================
// Alignment Serialization
// =============================================================================

/**
 * Serialize XlsxAlignment to an XML alignment element.
 *
 * Attribute order (ECMA-376 Part 4, Section 18.8.1):
 * 1. horizontal, vertical
 * 2. textRotation
 * 3. wrapText, indent, relativeIndent
 * 4. justifyLastLine, shrinkToFit
 * 5. readingOrder
 *
 * @param alignment - The alignment to serialize
 * @returns XmlElement representing the alignment
 *
 * @see ECMA-376 Part 4, Section 18.8.1 (alignment)
 *
 * @example
 * ```typescript
 * serializeAlignment({ horizontal: "center", vertical: "center", wrapText: true })
 * // => <alignment horizontal="center" vertical="center" wrapText="1"/>
 * ```
 */
export function serializeAlignment(alignment: XlsxAlignment): XmlElement {
  const attrs: Record<string, string> = {};

  // 1. horizontal, vertical
  if (alignment.horizontal !== undefined) {
    attrs.horizontal = alignment.horizontal;
  }
  if (alignment.vertical !== undefined) {
    attrs.vertical = alignment.vertical;
  }

  // 2. textRotation
  if (alignment.textRotation !== undefined) {
    attrs.textRotation = String(alignment.textRotation);
  }

  // 3. wrapText, indent, relativeIndent (relativeIndent not in type)
  if (alignment.wrapText === true) {
    attrs.wrapText = "1";
  }
  if (alignment.indent !== undefined) {
    attrs.indent = String(alignment.indent);
  }

  // 4. justifyLastLine (not in type), shrinkToFit
  if (alignment.shrinkToFit === true) {
    attrs.shrinkToFit = "1";
  }

  // 5. readingOrder
  if (alignment.readingOrder !== undefined) {
    attrs.readingOrder = String(alignment.readingOrder);
  }

  return createElement("alignment", attrs);
}

// =============================================================================
// Protection Serialization
// =============================================================================

/**
 * Serialize XlsxProtection to an XML protection element.
 *
 * @param protection - The protection to serialize
 * @returns XmlElement representing the protection
 *
 * @see ECMA-376 Part 4, Section 18.8.33 (protection)
 *
 * @example
 * ```typescript
 * serializeProtection({ locked: true, hidden: false })
 * // => <protection locked="1" hidden="0"/>
 * ```
 */
export function serializeProtection(protection: XlsxProtection): XmlElement {
  const attrs: Record<string, string> = {};

  if (protection.locked !== undefined) {
    attrs.locked = protection.locked ? "1" : "0";
  }
  if (protection.hidden !== undefined) {
    attrs.hidden = protection.hidden ? "1" : "0";
  }

  return createElement("protection", attrs);
}

// =============================================================================
// CellXf Serialization
// =============================================================================

/**
 * Serialize XlsxCellXf to an XML xf element.
 *
 * Attribute order (ECMA-376 Part 4, Section 18.8.10):
 * 1. numFmtId, fontId, fillId, borderId
 * 2. xfId
 * 3. quotePrefix, pivotButton (not in type)
 * 4. applyNumberFormat, applyFont, applyFill, applyBorder
 * 5. applyAlignment, applyProtection
 *
 * apply* attributes:
 * - true -> "1"
 * - false or undefined -> omitted
 *
 * @param xf - The cell format to serialize
 * @returns XmlElement representing the xf
 *
 * @see ECMA-376 Part 4, Section 18.8.10 (xf)
 *
 * @example
 * ```typescript
 * serializeCellXf({
 *   numFmtId: numFmtId(0),
 *   fontId: fontId(0),
 *   fillId: fillId(0),
 *   borderId: borderId(0),
 *   applyFont: true,
 *   alignment: { horizontal: "center" }
 * })
 * // => <xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyFont="1" applyAlignment="1">
 * //      <alignment horizontal="center"/>
 * //    </xf>
 * ```
 */
export function serializeCellXf(xf: XlsxCellXf): XmlElement {
  const attrs: Record<string, string> = {};
  const children: XmlElement[] = [];

  // 1. numFmtId, fontId, fillId, borderId (required)
  attrs.numFmtId = String(xf.numFmtId);
  attrs.fontId = String(xf.fontId);
  attrs.fillId = String(xf.fillId);
  attrs.borderId = String(xf.borderId);

  // 2. xfId (optional)
  if (xf.xfId !== undefined) {
    attrs.xfId = String(xf.xfId);
  }

  // 3. quotePrefix, pivotButton - not in type, skipped

  // 4. applyNumberFormat, applyFont, applyFill, applyBorder
  if (xf.applyNumberFormat === true) {
    attrs.applyNumberFormat = "1";
  }
  if (xf.applyFont === true) {
    attrs.applyFont = "1";
  }
  if (xf.applyFill === true) {
    attrs.applyFill = "1";
  }
  if (xf.applyBorder === true) {
    attrs.applyBorder = "1";
  }

  // 5. applyAlignment, applyProtection
  if (xf.applyAlignment === true) {
    attrs.applyAlignment = "1";
  }
  if (xf.applyProtection === true) {
    attrs.applyProtection = "1";
  }

  // Child elements
  if (xf.alignment !== undefined) {
    children.push(serializeAlignment(xf.alignment));
  }
  if (xf.protection !== undefined) {
    children.push(serializeProtection(xf.protection));
  }

  return createElement("xf", attrs, children);
}

/**
 * Serialize an array of XlsxCellXf to an XML cellXfs element.
 *
 * @param cellXfs - Array of cell formats to serialize
 * @returns XmlElement representing the cellXfs collection
 *
 * @see ECMA-376 Part 4, Section 18.8.10 (cellXfs)
 *
 * @example
 * ```typescript
 * serializeCellXfs([
 *   { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0) }
 * ])
 * // => <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs>
 * ```
 */
export function serializeCellXfs(cellXfs: readonly XlsxCellXf[]): XmlElement {
  const children = cellXfs.map(serializeCellXf);
  return createElement("cellXfs", { count: String(cellXfs.length) }, children);
}

/**
 * Serialize an array of XlsxCellXf to an XML cellStyleXfs element.
 *
 * @param cellStyleXfs - Array of cell style formats to serialize
 * @returns XmlElement representing the cellStyleXfs collection
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (cellStyleXfs)
 */
export function serializeCellStyleXfs(cellStyleXfs: readonly XlsxCellXf[]): XmlElement {
  const children = cellStyleXfs.map(serializeCellXf);
  return createElement("cellStyleXfs", { count: String(cellStyleXfs.length) }, children);
}

// =============================================================================
// CellStyle Serialization
// =============================================================================

/**
 * Serialize XlsxCellStyle to an XML cellStyle element.
 *
 * @param cellStyle - The cell style to serialize
 * @returns XmlElement representing the cellStyle
 *
 * @see ECMA-376 Part 4, Section 18.8.7 (cellStyle)
 *
 * @example
 * ```typescript
 * serializeCellStyle({ name: "Normal", xfId: 0, builtinId: 0 })
 * // => <cellStyle name="Normal" xfId="0" builtinId="0"/>
 * ```
 */
export function serializeCellStyle(cellStyle: XlsxCellStyle): XmlElement {
  const attrs: Record<string, string> = {
    name: cellStyle.name,
    xfId: String(cellStyle.xfId),
  };

  if (cellStyle.builtinId !== undefined) {
    attrs.builtinId = String(cellStyle.builtinId);
  }

  return createElement("cellStyle", attrs);
}

/**
 * Serialize an array of XlsxCellStyle to an XML cellStyles element.
 *
 * @param cellStyles - Array of cell styles to serialize
 * @returns XmlElement representing the cellStyles collection
 *
 * @see ECMA-376 Part 4, Section 18.8.8 (cellStyles)
 *
 * @example
 * ```typescript
 * serializeCellStyles([
 *   { name: "Normal", xfId: 0, builtinId: 0 }
 * ])
 * // => <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
 * ```
 */
export function serializeCellStyles(cellStyles: readonly XlsxCellStyle[]): XmlElement {
  const children = cellStyles.map(serializeCellStyle);
  return createElement("cellStyles", { count: String(cellStyles.length) }, children);
}

// =============================================================================
// StyleSheet Serialization (Main Entry Point)
// =============================================================================

function serializeIndexedColors(indexedColors: readonly string[]): XmlElement | undefined {
  if (indexedColors.length === 0) {
    return undefined;
  }

  const children = indexedColors.map((rgb) => createElement("rgbColor", { rgb }));
  return createElement("colors", {}, [createElement("indexedColors", {}, children)]);
}

/**
 * Serialize XlsxStyleSheet to an XML styleSheet element.
 *
 * Child element order (ECMA-376 Part 4, Section 18.8.39):
 * 1. numFmts (optional - only if custom formats exist)
 * 2. fonts
 * 3. fills
 * 4. borders
 * 5. cellStyleXfs
 * 6. cellXfs
 * 7. cellStyles
 * 8. colors (optional - only if indexedColors exist)
 * (dxfs, tableStyles, extLst are omitted in this implementation)
 *
 * @param styleSheet - The stylesheet to serialize
 * @returns XmlElement representing the styleSheet
 *
 * @see ECMA-376 Part 4, Section 18.8.39 (styleSheet)
 *
 * @example
 * ```typescript
 * const styleSheet = createDefaultStyleSheet();
 * serializeStyleSheet(styleSheet)
 * // => <styleSheet xmlns="..."><fonts count="1">...</fonts>...</styleSheet>
 * ```
 */
export function serializeStyleSheet(styleSheet: XlsxStyleSheet): XmlElement {
  const children: XmlElement[] = [];

  // 1. numFmts (optional - only if custom formats exist)
  const numFmtsElement = serializeNumFmts(styleSheet.numberFormats);
  if (numFmtsElement !== undefined) {
    children.push(numFmtsElement);
  }

  // 2. fonts
  children.push(serializeFonts(styleSheet.fonts));

  // 3. fills
  children.push(serializeFills(styleSheet.fills));

  // 4. borders
  children.push(serializeBorders(styleSheet.borders));

  // 5. cellStyleXfs
  children.push(serializeCellStyleXfs(styleSheet.cellStyleXfs));

  // 6. cellXfs
  children.push(serializeCellXfs(styleSheet.cellXfs));

  // 7. cellStyles
  children.push(serializeCellStyles(styleSheet.cellStyles));

  // 8. colors (optional - only if indexedColors exist)
  if (styleSheet.indexedColors) {
    const colorsEl = serializeIndexedColors(styleSheet.indexedColors);
    if (colorsEl) {
      children.push(colorsEl);
    }
  }

  return createElement(
    "styleSheet",
    { xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main" },
    children,
  );
}
