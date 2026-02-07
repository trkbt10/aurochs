/**
 * @file DOCX Run Serializer
 *
 * Serializes run elements and run properties to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.3.2 (Run Properties)
 * @see ECMA-376 Part 1, Section 17.3.3 (Run Content)
 */

import { createElement, createText, type XmlElement, type XmlNode } from "@oxen/xml";
import type {
  DocxRunProperties,
  DocxRunFonts,
  DocxColor,
  DocxShading,
  DocxRunBorder,
  DocxUnderline,
  DocxEastAsianLayout,
  DocxRun,
  DocxRunContent,
} from "../domain/run";
import { wEl, valEl, toggleEl, optValEl, optAttr, children } from "./primitive";

// =============================================================================
// Font Serialization
// =============================================================================

function serializeRunFonts(fonts: DocxRunFonts | undefined): XmlElement | undefined {
  if (!fonts) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "ascii", fonts.ascii);
  optAttr(attrs, "hAnsi", fonts.hAnsi);
  optAttr(attrs, "eastAsia", fonts.eastAsia);
  optAttr(attrs, "cs", fonts.cs);
  optAttr(attrs, "asciiTheme", fonts.asciiTheme);
  optAttr(attrs, "hAnsiTheme", fonts.hAnsiTheme);
  optAttr(attrs, "eastAsiaTheme", fonts.eastAsiaTheme);
  optAttr(attrs, "csTheme", fonts.csTheme);
  if (Object.keys(attrs).length === 0) return undefined;
  return wEl("rFonts", attrs);
}

// =============================================================================
// Color Serialization
// =============================================================================

function serializeColor(color: DocxColor | undefined): XmlElement | undefined {
  if (!color) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "val", color.val ?? "auto");
  optAttr(attrs, "themeColor", color.themeColor);
  optAttr(attrs, "themeTint", color.themeTint);
  optAttr(attrs, "themeShade", color.themeShade);
  return wEl("color", attrs);
}

// =============================================================================
// Shading Serialization
// =============================================================================

export function serializeShading(shd: DocxShading | undefined): XmlElement | undefined {
  if (!shd) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "val", shd.val);
  optAttr(attrs, "color", shd.color);
  optAttr(attrs, "fill", shd.fill);
  optAttr(attrs, "themeColor", shd.themeColor);
  optAttr(attrs, "themeFill", shd.themeFill);
  return wEl("shd", attrs);
}

// =============================================================================
// Border Serialization
// =============================================================================

function serializeRunBorder(bdr: DocxRunBorder | undefined): XmlElement | undefined {
  if (!bdr) return undefined;
  const attrs: Record<string, string> = { val: bdr.val };
  optAttr(attrs, "sz", bdr.sz);
  optAttr(attrs, "space", bdr.space);
  optAttr(attrs, "color", bdr.color);
  optAttr(attrs, "themeColor", bdr.themeColor);
  optAttr(attrs, "frame", bdr.frame);
  optAttr(attrs, "shadow", bdr.shadow);
  return wEl("bdr", attrs);
}

// =============================================================================
// Underline Serialization
// =============================================================================

function serializeUnderline(u: DocxUnderline | undefined): XmlElement | undefined {
  if (!u) return undefined;
  const attrs: Record<string, string> = { val: u.val };
  optAttr(attrs, "color", u.color);
  optAttr(attrs, "themeColor", u.themeColor);
  return wEl("u", attrs);
}

// =============================================================================
// East Asian Layout Serialization
// =============================================================================

function serializeEastAsianLayout(layout: DocxEastAsianLayout | undefined): XmlElement | undefined {
  if (!layout) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "combine", layout.combine);
  optAttr(attrs, "combineBrackets", layout.combineBrackets);
  optAttr(attrs, "vert", layout.vert);
  optAttr(attrs, "vertCompress", layout.vertCompress);
  return wEl("eastAsianLayout", attrs);
}

// =============================================================================
// Run Properties Serialization
// =============================================================================

/**
 * Serialize run properties to XmlElement.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.27 (rPr)
 */
export function serializeRunProperties(props: DocxRunProperties | undefined): XmlElement | undefined {
  if (!props) return undefined;

  const ch = children(
    // Style reference
    optValEl("rStyle", props.rStyle),

    // Font properties
    serializeRunFonts(props.rFonts),
    optValEl("sz", props.sz),
    optValEl("szCs", props.szCs),

    // Basic formatting
    toggleEl("b", props.b),
    toggleEl("bCs", props.bCs),
    toggleEl("i", props.i),
    toggleEl("iCs", props.iCs),
    toggleEl("caps", props.caps),
    toggleEl("smallCaps", props.smallCaps),
    toggleEl("strike", props.strike),
    toggleEl("dstrike", props.dstrike),
    toggleEl("outline", props.outline),
    toggleEl("shadow", props.shadow),
    toggleEl("emboss", props.emboss),
    toggleEl("imprint", props.imprint),
    toggleEl("vanish", props.vanish),
    toggleEl("webHidden", props.webHidden),

    // Color and shading
    serializeColor(props.color),
    optValEl("highlight", props.highlight),
    serializeShading(props.shd),

    // Underline
    serializeUnderline(props.u),

    // Spacing and position
    optValEl("spacing", props.spacing),
    optValEl("w", props.w),
    optValEl("kern", props.kern),
    optValEl("position", props.position),

    // Vertical alignment
    optValEl("vertAlign", props.vertAlign),

    // Border
    serializeRunBorder(props.bdr),

    // East Asian
    optValEl("em", props.em),
    serializeEastAsianLayout(props.eastAsianLayout),

    // Complex script
    toggleEl("rtl", props.rtl),
    toggleEl("cs", props.cs),
  );

  if (ch.length === 0) return undefined;
  return wEl("rPr", {}, ch);
}

// =============================================================================
// Run Content Serialization
// =============================================================================

function serializeRunContent(content: DocxRunContent): XmlNode | undefined {
  switch (content.type) {
    case "text": {
      const attrs: Record<string, string> = {};
      if (content.space === "preserve") {
        attrs["xml:space"] = "preserve";
      }
      return wEl("t", attrs, [createText(content.value)]);
    }
    case "tab":
      return wEl("tab");
    case "break": {
      const attrs: Record<string, string> = {};
      optAttr(attrs, "type", content.breakType);
      optAttr(attrs, "clear", content.clear);
      return wEl("br", attrs);
    }
    case "symbol":
      return wEl("sym", { font: content.font, char: content.char });
    case "fieldChar": {
      const attrs: Record<string, string> = { fldCharType: content.fldCharType };
      optAttr(attrs, "dirty", content.dirty);
      optAttr(attrs, "fldLock", content.fldLock);
      return wEl("fldChar", attrs);
    }
    case "instrText": {
      const attrs: Record<string, string> = {};
      if (content.space === "preserve") {
        attrs["xml:space"] = "preserve";
      }
      return wEl("instrText", attrs, [createText(content.value)]);
    }
    case "drawing":
      // Drawing serialization is complex and not yet implemented
      return undefined;
    default:
      return undefined;
  }
}

// =============================================================================
// Run Serialization
// =============================================================================

/**
 * Serialize a run element to XmlElement.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.25 (r)
 */
export function serializeRun(run: DocxRun): XmlElement {
  const ch: XmlNode[] = [];
  const rPr = serializeRunProperties(run.properties);
  if (rPr) ch.push(rPr);

  for (const item of run.content) {
    const node = serializeRunContent(item);
    if (node) ch.push(node);
  }

  return wEl("r", {}, ch);
}
