/**
 * @file DOCX Run Serializer
 *
 * Serializes run elements and run properties to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.3.2 (Run Properties)
 * @see ECMA-376 Part 1, Section 17.3.3 (Run Content)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type {
  DocxRunProperties,
  DocxRunFonts,
  DocxColor,
  DocxShading,
  DocxUnderline,
  DocxRunBorder,
  DocxRun,
  DocxRunContent,
} from "../domain/run";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Add a toggle element if the value is true.
 */
function addToggleElement(children: XmlNode[], name: string, value: boolean | undefined): void {
  if (value === true) {
    children.push(createElement(`w:${name}`));
  } else if (value === false) {
    children.push(createElement(`w:${name}`, { "w:val": "0" }));
  }
}

/**
 * Add a val element if the value is defined.
 */
function addValElement(children: XmlNode[], name: string, value: string | number | undefined): void {
  if (value !== undefined) {
    children.push(createElement(`w:${name}`, { "w:val": String(value) }));
  }
}

// =============================================================================
// Run Font Serialization
// =============================================================================

/**
 * Serialize run font properties.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.26 (rFonts)
 */
export function serializeRunFonts(fonts: DocxRunFonts): XmlElement {
  const attrs: Record<string, string> = {};

  if (fonts.ascii) {attrs["w:ascii"] = fonts.ascii;}
  if (fonts.hAnsi) {attrs["w:hAnsi"] = fonts.hAnsi;}
  if (fonts.eastAsia) {attrs["w:eastAsia"] = fonts.eastAsia;}
  if (fonts.cs) {attrs["w:cs"] = fonts.cs;}
  if (fonts.asciiTheme) {attrs["w:asciiTheme"] = fonts.asciiTheme;}
  if (fonts.hAnsiTheme) {attrs["w:hAnsiTheme"] = fonts.hAnsiTheme;}
  if (fonts.eastAsiaTheme) {attrs["w:eastAsiaTheme"] = fonts.eastAsiaTheme;}
  if (fonts.csTheme) {attrs["w:cstheme"] = fonts.csTheme;}

  return createElement("w:rFonts", attrs);
}

// =============================================================================
// Color Serialization
// =============================================================================

/**
 * Serialize color element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.6 (color)
 */
export function serializeColor(color: DocxColor, elementName: string = "w:color"): XmlElement {
  const attrs: Record<string, string> = {};

  if (color.val) {attrs["w:val"] = color.val;}
  if (color.themeColor) {attrs["w:themeColor"] = color.themeColor;}
  if (color.themeTint !== undefined) {attrs["w:themeTint"] = String(color.themeTint);}
  if (color.themeShade !== undefined) {attrs["w:themeShade"] = String(color.themeShade);}

  return createElement(elementName, attrs);
}

// =============================================================================
// Shading Serialization
// =============================================================================

/**
 * Serialize shading element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.32 (shd)
 */
export function serializeShading(shading: DocxShading, elementName: string = "w:shd"): XmlElement {
  const attrs: Record<string, string> = {};

  if (shading.val) {attrs["w:val"] = shading.val;}
  if (shading.color) {attrs["w:color"] = shading.color;}
  if (shading.fill) {attrs["w:fill"] = shading.fill;}
  if (shading.themeColor) {attrs["w:themeColor"] = shading.themeColor;}
  if (shading.themeFill) {attrs["w:themeFill"] = shading.themeFill;}

  return createElement(elementName, attrs);
}

// =============================================================================
// Underline Serialization
// =============================================================================

/**
 * Serialize underline element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.40 (u)
 */
export function serializeUnderline(underline: DocxUnderline): XmlElement {
  const attrs: Record<string, string> = {};

  if (underline.val) {attrs["w:val"] = underline.val;}
  if (underline.color) {attrs["w:color"] = underline.color;}
  if (underline.themeColor) {attrs["w:themeColor"] = underline.themeColor;}

  return createElement("w:u", attrs);
}

// =============================================================================
// Border Serialization
// =============================================================================

/**
 * Serialize run border element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.4 (bdr)
 */
export function serializeRunBorder(border: DocxRunBorder): XmlElement {
  const attrs: Record<string, string> = {};

  if (border.val) {attrs["w:val"] = border.val;}
  if (border.sz !== undefined) {attrs["w:sz"] = String(border.sz);}
  if (border.space !== undefined) {attrs["w:space"] = String(border.space);}
  if (border.color) {attrs["w:color"] = border.color;}
  if (border.themeColor) {attrs["w:themeColor"] = border.themeColor;}
  if (border.frame !== undefined) {attrs["w:frame"] = border.frame ? "1" : "0";}
  if (border.shadow !== undefined) {attrs["w:shadow"] = border.shadow ? "1" : "0";}

  return createElement("w:bdr", attrs);
}

// =============================================================================
// Run Properties Serialization
// =============================================================================

/**
 * Serialize run properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.27 (rPr)
 */
export function serializeRunProperties(props: DocxRunProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const children: XmlNode[] = [];

  // Style reference
  addValElement(children, "rStyle", props.rStyle);

  // Font properties
  if (props.rFonts) {children.push(serializeRunFonts(props.rFonts));}

  // Basic formatting toggles
  addToggleElement(children, "b", props.b);
  addToggleElement(children, "bCs", props.bCs);
  addToggleElement(children, "i", props.i);
  addToggleElement(children, "iCs", props.iCs);
  addToggleElement(children, "caps", props.caps);
  addToggleElement(children, "smallCaps", props.smallCaps);
  addToggleElement(children, "strike", props.strike);
  addToggleElement(children, "dstrike", props.dstrike);
  addToggleElement(children, "outline", props.outline);
  addToggleElement(children, "shadow", props.shadow);
  addToggleElement(children, "emboss", props.emboss);
  addToggleElement(children, "imprint", props.imprint);
  addToggleElement(children, "vanish", props.vanish);
  addToggleElement(children, "webHidden", props.webHidden);

  // Color
  if (props.color) {children.push(serializeColor(props.color));}

  // Spacing
  if (props.spacing !== undefined) {
    children.push(createElement("w:spacing", { "w:val": String(props.spacing) }));
  }

  // Width scale
  if (props.w !== undefined) {
    children.push(createElement("w:w", { "w:val": String(props.w) }));
  }

  // Kerning
  if (props.kern !== undefined) {
    children.push(createElement("w:kern", { "w:val": String(props.kern) }));
  }

  // Position
  if (props.position !== undefined) {
    children.push(createElement("w:position", { "w:val": String(props.position) }));
  }

  // Font size
  if (props.sz !== undefined) {
    children.push(createElement("w:sz", { "w:val": String(props.sz) }));
  }
  if (props.szCs !== undefined) {
    children.push(createElement("w:szCs", { "w:val": String(props.szCs) }));
  }

  // Highlight
  addValElement(children, "highlight", props.highlight);

  // Underline
  if (props.u) {children.push(serializeUnderline(props.u));}

  // Border
  if (props.bdr) {children.push(serializeRunBorder(props.bdr));}

  // Shading
  if (props.shd) {children.push(serializeShading(props.shd));}

  // Vertical alignment
  addValElement(children, "vertAlign", props.vertAlign);

  // RTL
  addToggleElement(children, "rtl", props.rtl);
  addToggleElement(children, "cs", props.cs);

  // Emphasis mark
  addValElement(children, "em", props.em);

  // East Asian layout
  if (props.eastAsianLayout) {
    const eaAttrs: Record<string, string> = {};
    if (props.eastAsianLayout.combine !== undefined) {eaAttrs["w:combine"] = props.eastAsianLayout.combine ? "1" : "0";}
    if (props.eastAsianLayout.combineBrackets) {eaAttrs["w:combineBrackets"] = props.eastAsianLayout.combineBrackets;}
    if (props.eastAsianLayout.vert !== undefined) {eaAttrs["w:vert"] = props.eastAsianLayout.vert ? "1" : "0";}
    if (props.eastAsianLayout.vertCompress !== undefined) {eaAttrs["w:vertCompress"] = props.eastAsianLayout.vertCompress ? "1" : "0";}
    children.push(createElement("w:eastAsianLayout", eaAttrs));
  }

  if (children.length === 0) {return undefined;}

  return createElement("w:rPr", {}, children);
}

// =============================================================================
// Run Content Serialization
// =============================================================================

/**
 * Serialize run content element.
 */
export function serializeRunContent(content: DocxRunContent): XmlElement {
  switch (content.type) {
    case "text":
      return createElement("w:t", { "xml:space": "preserve" }, [{ type: "text", value: content.value }]);
    case "tab":
      return createElement("w:tab");
    case "break":
      return serializeBreak(content);
    case "symbol":
      return serializeSymbol(content);
    case "drawing":
      // TODO: Implement drawing serialization
      // For now, return a placeholder comment element
      throw new Error("Drawing serialization not yet implemented");
  }
}

/**
 * Serialize break element.
 */
function serializeBreak(content: { type: "break"; breakType?: string; clear?: string }): XmlElement {
  const attrs: Record<string, string> = {};
  if (content.breakType) {attrs["w:type"] = content.breakType;}
  if (content.clear) {attrs["w:clear"] = content.clear;}
  return createElement("w:br", attrs);
}

/**
 * Serialize symbol element.
 */
function serializeSymbol(content: { type: "symbol"; font?: string; char?: string }): XmlElement {
  const attrs: Record<string, string> = {};
  if (content.font) {attrs["w:font"] = content.font;}
  if (content.char) {attrs["w:char"] = content.char;}
  return createElement("w:sym", attrs);
}

// =============================================================================
// Run Serialization
// =============================================================================

/**
 * Serialize a run element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.25 (r)
 */
export function serializeRun(run: DocxRun): XmlElement {
  const children: XmlNode[] = [];

  // Run properties
  const rPr = serializeRunProperties(run.properties);
  if (rPr) {children.push(rPr);}

  // Run content
  for (const content of run.content) {
    children.push(serializeRunContent(content));
  }

  return createElement("w:r", {}, children);
}
