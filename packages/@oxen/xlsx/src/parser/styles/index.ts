/**
 * @file Styles Parser Integration for styles.xml
 *
 * Parses the complete stylesheet from xl/styles.xml of XLSX files.
 * Integrates all style component parsers (fonts, fills, borders, number formats)
 * and provides the main entry point for stylesheet parsing.
 *
 * @see ECMA-376 Part 4, Section 18.8.39 (styleSheet)
 * @see ECMA-376 Part 4, Section 18.8.45 (xf - Cell Format)
 * @see ECMA-376 Part 4, Section 18.8.1 (alignment)
 * @see ECMA-376 Part 4, Section 18.8.33 (protection)
 */

import type {
  XlsxStyleSheet,
  XlsxCellXf,
  XlsxAlignment,
  XlsxProtection,
  XlsxCellStyle,
} from "../../domain/style/types";
import {
  numFmtId,
  fontId,
  fillId,
  borderId,
} from "../../domain/types";
import { parseFonts } from "./font";
import { parseFills } from "./fill";
import { parseBorders } from "./border";
import { parseNumFmts } from "./number-format";
import { parseDxfs } from "./dxf";
import { parseBooleanAttr, parseIntAttr } from "../primitive";
import type { XmlElement } from "@oxen/xml";
import { getChild, getChildren, getAttr } from "@oxen/xml";
import type { XlsxTableStyle, XlsxTableStyleElementType } from "../../domain/style/table-style";

// =============================================================================
// Alignment Parsing
// =============================================================================

/**
 * Parse an alignment element into XlsxAlignment.
 *
 * @param alignmentElement - The <alignment> element from the xf definition
 * @returns The parsed alignment settings
 *
 * @see ECMA-376 Part 4, Section 18.8.1 (alignment)
 * @see ECMA-376 Part 4, Section 18.18.40 (ST_HorizontalAlignment)
 * @see ECMA-376 Part 4, Section 18.18.88 (ST_VerticalAlignment)
 *
 * @example
 * ```xml
 * <alignment horizontal="center" vertical="bottom" wrapText="1"/>
 * ```
 */
export function parseAlignment(alignmentElement: XmlElement): XlsxAlignment {
  return {
    horizontal: getAttr(alignmentElement, "horizontal") as XlsxAlignment["horizontal"],
    vertical: getAttr(alignmentElement, "vertical") as XlsxAlignment["vertical"],
    wrapText: parseBooleanAttr(getAttr(alignmentElement, "wrapText")),
    shrinkToFit: parseBooleanAttr(getAttr(alignmentElement, "shrinkToFit")),
    textRotation: parseIntAttr(getAttr(alignmentElement, "textRotation")),
    indent: parseIntAttr(getAttr(alignmentElement, "indent")),
    readingOrder: parseIntAttr(getAttr(alignmentElement, "readingOrder")),
  };
}

// =============================================================================
// Protection Parsing
// =============================================================================

/**
 * Parse a protection element into XlsxProtection.
 *
 * @param protectionElement - The <protection> element from the xf definition
 * @returns The parsed protection settings
 *
 * @see ECMA-376 Part 4, Section 18.8.33 (protection)
 *
 * @example
 * ```xml
 * <protection locked="1" hidden="0"/>
 * ```
 */
export function parseProtection(protectionElement: XmlElement): XlsxProtection {
  return {
    locked: parseBooleanAttr(getAttr(protectionElement, "locked")),
    hidden: parseBooleanAttr(getAttr(protectionElement, "hidden")),
  };
}

// =============================================================================
// Cell Format (xf) Parsing
// =============================================================================

/**
 * Parse a single xf (cell format) element into XlsxCellXf.
 *
 * An xf element defines a formatting combination that can be applied to cells.
 * It references fonts, fills, borders, and number formats by index.
 *
 * @param xfElement - The <xf> element from cellXfs or cellStyleXfs
 * @returns The parsed cell format definition
 *
 * @see ECMA-376 Part 4, Section 18.8.45 (xf)
 *
 * @example
 * ```xml
 * <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"
 *     applyFont="1" applyAlignment="1">
 *   <alignment horizontal="center"/>
 * </xf>
 * ```
 */
export function parseCellXf(xfElement: XmlElement): XlsxCellXf {
  const alignmentEl = getChild(xfElement, "alignment");
  const protectionEl = getChild(xfElement, "protection");

  return {
    numFmtId: numFmtId(parseIntAttr(getAttr(xfElement, "numFmtId")) ?? 0),
    fontId: fontId(parseIntAttr(getAttr(xfElement, "fontId")) ?? 0),
    fillId: fillId(parseIntAttr(getAttr(xfElement, "fillId")) ?? 0),
    borderId: borderId(parseIntAttr(getAttr(xfElement, "borderId")) ?? 0),
    xfId: parseIntAttr(getAttr(xfElement, "xfId")),
    alignment: alignmentEl ? parseAlignment(alignmentEl) : undefined,
    protection: protectionEl ? parseProtection(protectionEl) : undefined,
    applyNumberFormat: parseBooleanAttr(getAttr(xfElement, "applyNumberFormat")),
    applyFont: parseBooleanAttr(getAttr(xfElement, "applyFont")),
    applyFill: parseBooleanAttr(getAttr(xfElement, "applyFill")),
    applyBorder: parseBooleanAttr(getAttr(xfElement, "applyBorder")),
    applyAlignment: parseBooleanAttr(getAttr(xfElement, "applyAlignment")),
    applyProtection: parseBooleanAttr(getAttr(xfElement, "applyProtection")),
  };
}

/**
 * Parse all xf elements from a cellXfs or cellStyleXfs container.
 *
 * @param cellXfsElement - The <cellXfs> or <cellStyleXfs> container element, or undefined
 * @returns Array of parsed cell format definitions
 *
 * @see ECMA-376 Part 4, Section 18.8.10 (cellXfs)
 * @see ECMA-376 Part 4, Section 18.8.9 (cellStyleXfs)
 */
export function parseCellXfs(cellXfsElement: XmlElement | undefined): readonly XlsxCellXf[] {
  if (!cellXfsElement) {
    return [];
  }
  return getChildren(cellXfsElement, "xf").map(parseCellXf);
}

// =============================================================================
// Cell Style Parsing
// =============================================================================

/**
 * Parse a single cellStyle element into XlsxCellStyle.
 *
 * Named cell styles (e.g., "Normal", "Heading 1") that users can apply.
 * Each style references a cellStyleXf by xfId.
 *
 * @param cellStyleElement - The <cellStyle> element from cellStyles
 * @returns The parsed cell style definition
 *
 * @see ECMA-376 Part 4, Section 18.8.7 (cellStyle)
 *
 * @example
 * ```xml
 * <cellStyle name="Normal" xfId="0" builtinId="0"/>
 * ```
 */
export function parseCellStyle(cellStyleElement: XmlElement): XlsxCellStyle {
  return {
    name: getAttr(cellStyleElement, "name") ?? "Normal",
    xfId: parseIntAttr(getAttr(cellStyleElement, "xfId")) ?? 0,
    builtinId: parseIntAttr(getAttr(cellStyleElement, "builtinId")),
  };
}

/**
 * Parse all cellStyle elements from a cellStyles container.
 *
 * @param cellStylesElement - The <cellStyles> container element, or undefined
 * @returns Array of parsed cell style definitions
 *
 * @see ECMA-376 Part 4, Section 18.8.8 (cellStyles)
 */
export function parseCellStyles(cellStylesElement: XmlElement | undefined): readonly XlsxCellStyle[] {
  if (!cellStylesElement) {
    return [];
  }
  return getChildren(cellStylesElement, "cellStyle").map(parseCellStyle);
}

// =============================================================================
// StyleSheet Parsing (Main Entry Point)
// =============================================================================

/**
 * Parse `styles.xml` indexed palette overrides.
 *
 * Extracts `styleSheet/colors/indexedColors/rgbColor/@rgb` when present.
 *
 * @param styleSheetElement - Root `<styleSheet>` element
 * @returns Palette entries (may be empty)
 *
 * @see ECMA-376 Part 4, Section 18.8.11 (colors)
 * @see ECMA-376 Part 4, Section 18.8.21 (indexedColors)
 */
function parseIndexedColors(styleSheetElement: XmlElement): readonly string[] {
  const colorsEl = getChild(styleSheetElement, "colors");
  if (!colorsEl) {
    return [];
  }
  const indexedColorsEl = getChild(colorsEl, "indexedColors");
  if (!indexedColorsEl) {
    return [];
  }
  return getChildren(indexedColorsEl, "rgbColor")
    .map((el) => getAttr(el, "rgb"))
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function parseTableStyleElementType(raw: string): XlsxTableStyleElementType | undefined {
  switch (raw) {
    case "wholeTable":
    case "headerRow":
    case "totalRow":
    case "firstColumn":
    case "lastColumn":
    case "firstRowStripe":
    case "secondRowStripe":
    case "firstColumnStripe":
    case "secondColumnStripe":
    case "firstHeaderCell":
    case "lastHeaderCell":
    case "firstTotalCell":
    case "lastTotalCell":
      return raw;
  }
  return undefined;
}

/**
 * Parse `styles.xml` `<tableStyles>`.
 *
 * @param styleSheetElement - Root `<styleSheet>` element
 * @returns Parsed table styles and defaults
 *
 * @see ECMA-376 Part 4, Section 18.8.57 (tableStyles)
 */
function parseTableStyles(styleSheetElement: XmlElement): {
  readonly tableStyles: readonly XlsxTableStyle[];
  readonly defaultTableStyle?: string;
  readonly defaultPivotStyle?: string;
} {
  const tableStylesEl = getChild(styleSheetElement, "tableStyles");
  if (!tableStylesEl) {
    return { tableStyles: [], defaultTableStyle: undefined, defaultPivotStyle: undefined };
  }

  const defaultTableStyle = getAttr(tableStylesEl, "defaultTableStyle") ?? undefined;
  const defaultPivotStyle = getAttr(tableStylesEl, "defaultPivotStyle") ?? undefined;

  const tableStyles = getChildren(tableStylesEl, "tableStyle").map((tableStyleEl): XlsxTableStyle => {
    const name = getAttr(tableStyleEl, "name");
    if (!name) {
      throw new Error('tableStyle missing required attribute "name"');
    }
    const pivot = parseBooleanAttr(getAttr(tableStyleEl, "pivot"));
    const count = parseIntAttr(getAttr(tableStyleEl, "count"));

    const elements = getChildren(tableStyleEl, "tableStyleElement")
      .map((el) => {
        const typeRaw = getAttr(el, "type");
        const type = typeRaw ? parseTableStyleElementType(typeRaw) : undefined;
        const dxfId = parseIntAttr(getAttr(el, "dxfId"));
        if (!type || dxfId === undefined) {
          return undefined;
        }
        return { type, dxfId };
      })
      .filter((value): value is NonNullable<typeof value> => value !== undefined);

    return { name, pivot, count, elements };
  });

  return { tableStyles, defaultTableStyle, defaultPivotStyle };
}

/**
 * Parse the complete stylesheet from a styleSheet element.
 *
 * This is the main entry point for parsing xl/styles.xml.
 * It integrates all style component parsers and returns the complete stylesheet.
 *
 * @param styleSheetElement - The root <styleSheet> element from styles.xml
 * @returns The complete parsed stylesheet
 *
 * @see ECMA-376 Part 4, Section 18.8.39 (styleSheet)
 *
 * @example
 * ```typescript
 * const stylesXml = await zipFile.file("xl/styles.xml").async("text");
 * const doc = parseXml(stylesXml);
 * const styleSheet = parseStyleSheet(doc.root);
 * ```
 */
export function parseStyleSheet(styleSheetElement: XmlElement): XlsxStyleSheet {
  const numFmtsEl = getChild(styleSheetElement, "numFmts");
  const fontsEl = getChild(styleSheetElement, "fonts");
  const fillsEl = getChild(styleSheetElement, "fills");
  const bordersEl = getChild(styleSheetElement, "borders");
  const cellStyleXfsEl = getChild(styleSheetElement, "cellStyleXfs");
  const cellXfsEl = getChild(styleSheetElement, "cellXfs");
  const cellStylesEl = getChild(styleSheetElement, "cellStyles");
  const dxfsEl = getChild(styleSheetElement, "dxfs");
  const indexedColors = parseIndexedColors(styleSheetElement);
  const parsedTableStyles = parseTableStyles(styleSheetElement);
  const dxfs = parseDxfs(dxfsEl);

  return {
    numberFormats: parseNumFmts(numFmtsEl),
    fonts: fontsEl ? parseFonts(fontsEl) : [],
    fills: fillsEl ? parseFills(fillsEl) : [],
    borders: bordersEl ? parseBorders(bordersEl) : [],
    cellStyleXfs: parseCellXfs(cellStyleXfsEl),
    cellXfs: parseCellXfs(cellXfsEl),
    cellStyles: parseCellStyles(cellStylesEl),
    ...(indexedColors.length > 0 ? { indexedColors } : {}),
    ...(dxfs.length > 0 ? { dxfs } : {}),
    ...(parsedTableStyles.tableStyles.length > 0 ? { tableStyles: parsedTableStyles.tableStyles } : {}),
    ...(parsedTableStyles.defaultTableStyle ? { defaultTableStyle: parsedTableStyles.defaultTableStyle } : {}),
    ...(parsedTableStyles.defaultPivotStyle ? { defaultPivotStyle: parsedTableStyles.defaultPivotStyle } : {}),
  };
}
