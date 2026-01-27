/**
 * @file SharedStrings Parser
 *
 * Parses the shared string table (xl/sharedStrings.xml) from XLSX files.
 * The shared string table contains text content that is referenced by multiple
 * cells to reduce file size.
 *
 * @see ECMA-376 Part 4, Section 18.4 (Shared String Table)
 * @see ECMA-376 Part 4, Section 18.4.9 (sst - Shared String Table)
 * @see ECMA-376 Part 4, Section 18.4.8 (si - String Item)
 * @see ECMA-376 Part 4, Section 18.4.12 (t - Text)
 * @see ECMA-376 Part 4, Section 18.4.4 (r - Rich Text Run)
 */

import type { XlsxColor } from "../domain/style/font";
import type { XmlElement } from "@oxen/xml";
import { getChild, getChildren, getTextContent, getAttr } from "@oxen/xml";

// =============================================================================
// Types
// =============================================================================

/**
 * Rich text run properties for individual text runs within a rich text string.
 *
 * @see ECMA-376 Part 4, Section 18.4.7 (rPr - Run Properties)
 */
export type RichTextProperties = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strike?: boolean;
  readonly fontSize?: number;
  readonly fontName?: string;
  readonly color?: XlsxColor;
};

/**
 * A single run of text with optional formatting in a rich text string.
 *
 * @see ECMA-376 Part 4, Section 18.4.4 (r - Rich Text Run)
 */
export type RichTextRun = {
  readonly text: string;
  readonly properties?: RichTextProperties;
};

/**
 * A shared string item which can be either plain text or rich text.
 *
 * @see ECMA-376 Part 4, Section 18.4.8 (si - String Item)
 */
export type SharedStringItem =
  | { readonly type: "plain"; readonly text: string }
  | { readonly type: "rich"; readonly runs: readonly RichTextRun[] };

// =============================================================================
// Simple Parser
// =============================================================================

/**
 * Parse shared strings from the SST element, returning plain text strings.
 *
 * This is the simple version that returns an array of plain text strings.
 * Rich text strings are flattened by concatenating all run text content.
 *
 * @param sstElement - The <sst> root element from sharedStrings.xml
 * @returns Array of plain text strings indexed by their position
 *
 * @example
 * ```typescript
 * const sst = parseXml(xmlContent);
 * const root = sst.children[0];
 * const strings = parseSharedStrings(root);
 * // strings[0] is the first shared string, etc.
 * ```
 *
 * @see ECMA-376 Part 4, Section 18.4.9 (sst - Shared String Table)
 */
export function parseSharedStrings(sstElement: XmlElement): readonly string[] {
  const result: string[] = [];
  const siElements = getChildren(sstElement, "si");

  for (const si of siElements) {
    // Check for plain text <t> element first
    const t = getChild(si, "t");
    if (t) {
      result.push(getTextContent(t));
      continue;
    }

    // Handle rich text with <r> elements
    const runs = getChildren(si, "r");
    const text = runs
      .map((r) => {
        const rt = getChild(r, "t");
        return rt ? getTextContent(rt) : "";
      })
      .join("");
    result.push(text);
  }

  return result;
}

// =============================================================================
// Rich Text Parser
// =============================================================================

/**
 * Parse a color element into XlsxColor.
 *
 * @param colorElement - The color element (e.g., from <rPr>)
 * @returns The parsed color or undefined if no color specified
 *
 * @see ECMA-376 Part 4, Section 18.8.3 (CT_Color)
 */
function parseColor(colorElement: XmlElement | undefined): XlsxColor | undefined {
  if (!colorElement) {
    return undefined;
  }

  // Check for RGB color
  const rgb = getAttr(colorElement, "rgb");
  if (rgb) {
    return { type: "rgb", value: rgb };
  }

  // Check for theme color
  const theme = getAttr(colorElement, "theme");
  if (theme !== undefined) {
    const tint = getAttr(colorElement, "tint");
    return {
      type: "theme",
      theme: parseInt(theme, 10),
      tint: tint !== undefined ? parseFloat(tint) : undefined,
    };
  }

  // Check for indexed color
  const indexed = getAttr(colorElement, "indexed");
  if (indexed !== undefined) {
    return { type: "indexed", index: parseInt(indexed, 10) };
  }

  // Check for auto color
  const auto = getAttr(colorElement, "auto");
  if (auto === "1" || auto === "true") {
    return { type: "auto" };
  }

  return undefined;
}

/**
 * Parse run properties from an <rPr> element.
 *
 * @param rPrElement - The <rPr> element containing run properties
 * @returns The parsed properties or undefined if no meaningful properties
 *
 * @see ECMA-376 Part 4, Section 18.4.7 (rPr - Run Properties)
 */
function parseRunProperties(rPrElement: XmlElement | undefined): RichTextProperties | undefined {
  if (!rPrElement) {
    return undefined;
  }

  const props: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    fontSize?: number;
    fontName?: string;
    color?: XlsxColor;
  } = {};

  // Bold: <b/> or <b val="1"/>
  const b = getChild(rPrElement, "b");
  if (b) {
    const val = getAttr(b, "val");
    props.bold = val === undefined || val === "1" || val === "true";
  }

  // Italic: <i/> or <i val="1"/>
  const i = getChild(rPrElement, "i");
  if (i) {
    const val = getAttr(i, "val");
    props.italic = val === undefined || val === "1" || val === "true";
  }

  // Underline: <u/> or <u val="..."/>
  const u = getChild(rPrElement, "u");
  if (u) {
    const val = getAttr(u, "val");
    // presence of <u> means underline unless explicitly set to "none"
    props.underline = val !== "none";
  }

  // Strike: <strike/> or <strike val="1"/>
  const strike = getChild(rPrElement, "strike");
  if (strike) {
    const val = getAttr(strike, "val");
    props.strike = val === undefined || val === "1" || val === "true";
  }

  // Font size: <sz val="11"/>
  const sz = getChild(rPrElement, "sz");
  if (sz) {
    const val = getAttr(sz, "val");
    if (val !== undefined) {
      props.fontSize = parseFloat(val);
    }
  }

  // Font name: <rFont val="Calibri"/>
  const rFont = getChild(rPrElement, "rFont");
  if (rFont) {
    const val = getAttr(rFont, "val");
    if (val !== undefined) {
      props.fontName = val;
    }
  }

  // Color: <color rgb="FFFF0000"/> etc.
  const color = getChild(rPrElement, "color");
  const parsedColor = parseColor(color);
  if (parsedColor) {
    props.color = parsedColor;
  }

  // Return undefined if no properties were set
  if (Object.keys(props).length === 0) {
    return undefined;
  }

  return props;
}

/**
 * Parse a single rich text run from an <r> element.
 *
 * @param rElement - The <r> element containing a text run
 * @returns The parsed RichTextRun
 *
 * @see ECMA-376 Part 4, Section 18.4.4 (r - Rich Text Run)
 */
function parseRichTextRun(rElement: XmlElement): RichTextRun {
  const t = getChild(rElement, "t");
  const text = t ? getTextContent(t) : "";

  const rPr = getChild(rElement, "rPr");
  const properties = parseRunProperties(rPr);

  return properties ? { text, properties } : { text };
}

/**
 * Parse shared strings with full rich text information preserved.
 *
 * This is the full version that returns SharedStringItem objects,
 * preserving the distinction between plain text and rich text strings.
 *
 * @param sstElement - The <sst> root element from sharedStrings.xml
 * @returns Array of SharedStringItem objects indexed by their position
 *
 * @example
 * ```typescript
 * const sst = parseXml(xmlContent);
 * const root = sst.children[0];
 * const items = parseSharedStringsRich(root);
 *
 * for (const item of items) {
 *   if (item.type === "plain") {
 *     console.log("Plain text:", item.text);
 *   } else {
 *     console.log("Rich text with", item.runs.length, "runs");
 *   }
 * }
 * ```
 *
 * @see ECMA-376 Part 4, Section 18.4.9 (sst - Shared String Table)
 */
export function parseSharedStringsRich(sstElement: XmlElement): readonly SharedStringItem[] {
  const result: SharedStringItem[] = [];
  const siElements = getChildren(sstElement, "si");

  for (const si of siElements) {
    // Check for plain text <t> element first (when <si> contains only <t>)
    const t = getChild(si, "t");
    const runs = getChildren(si, "r");

    if (t && runs.length === 0) {
      // Plain text string item
      result.push({
        type: "plain",
        text: getTextContent(t),
      });
      continue;
    }

    // Rich text with <r> elements
    if (runs.length > 0) {
      const parsedRuns = runs.map(parseRichTextRun);
      result.push({
        type: "rich",
        runs: parsedRuns,
      });
      continue;
    }

    // Empty string item (no <t> and no <r>)
    result.push({
      type: "plain",
      text: "",
    });
  }

  return result;
}
