/**
 * @file DOCX Paragraph Serializer
 *
 * Serializes paragraph elements and paragraph properties to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.3.1 (Paragraph Properties)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type {
  DocxParagraph,
  DocxParagraphProperties,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxParagraphBorders,
  DocxParagraphBorderEdge,
  DocxTabStops,
  DocxTabStop,
  DocxNumberingProperties,
  DocxFrameProperties,
  DocxParagraphContent,
  DocxHyperlink,
  DocxBookmarkStart,
  DocxBookmarkEnd,
} from "../domain/paragraph";
import { serializeRun, serializeRunProperties, serializeShading } from "./run";

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
// Spacing Serialization
// =============================================================================

/**
 * Serialize paragraph spacing element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.33 (spacing)
 */
export function serializeSpacing(spacing: DocxParagraphSpacing): XmlElement {
  const attrs: Record<string, string> = {};

  if (spacing.before !== undefined) {attrs["w:before"] = String(spacing.before);}
  if (spacing.beforeLines !== undefined) {attrs["w:beforeLines"] = String(spacing.beforeLines);}
  if (spacing.beforeAutospacing !== undefined) {attrs["w:beforeAutospacing"] = spacing.beforeAutospacing ? "1" : "0";}
  if (spacing.after !== undefined) {attrs["w:after"] = String(spacing.after);}
  if (spacing.afterLines !== undefined) {attrs["w:afterLines"] = String(spacing.afterLines);}
  if (spacing.afterAutospacing !== undefined) {attrs["w:afterAutospacing"] = spacing.afterAutospacing ? "1" : "0";}
  if (spacing.line !== undefined) {attrs["w:line"] = String(spacing.line);}
  if (spacing.lineRule) {attrs["w:lineRule"] = spacing.lineRule;}

  return createElement("w:spacing", attrs);
}

// =============================================================================
// Indent Serialization
// =============================================================================

/**
 * Serialize paragraph indent element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.12 (ind)
 */
export function serializeIndent(indent: DocxParagraphIndent): XmlElement {
  const attrs: Record<string, string> = {};

  if (indent.left !== undefined) {attrs["w:left"] = String(indent.left);}
  if (indent.leftChars !== undefined) {attrs["w:leftChars"] = String(indent.leftChars);}
  if (indent.right !== undefined) {attrs["w:right"] = String(indent.right);}
  if (indent.rightChars !== undefined) {attrs["w:rightChars"] = String(indent.rightChars);}
  if (indent.hanging !== undefined) {attrs["w:hanging"] = String(indent.hanging);}
  if (indent.hangingChars !== undefined) {attrs["w:hangingChars"] = String(indent.hangingChars);}
  if (indent.firstLine !== undefined) {attrs["w:firstLine"] = String(indent.firstLine);}
  if (indent.firstLineChars !== undefined) {attrs["w:firstLineChars"] = String(indent.firstLineChars);}

  return createElement("w:ind", attrs);
}

// =============================================================================
// Border Serialization
// =============================================================================

/**
 * Serialize a border edge element.
 */
function serializeBorderEdge(border: DocxParagraphBorderEdge, name: string): XmlElement {
  const attrs: Record<string, string> = {};

  if (border.val) {attrs["w:val"] = border.val;}
  if (border.sz !== undefined) {attrs["w:sz"] = String(border.sz);}
  if (border.space !== undefined) {attrs["w:space"] = String(border.space);}
  if (border.color) {attrs["w:color"] = border.color;}
  if (border.themeColor) {attrs["w:themeColor"] = border.themeColor;}
  if (border.shadow !== undefined) {attrs["w:shadow"] = border.shadow ? "1" : "0";}
  if (border.frame !== undefined) {attrs["w:frame"] = border.frame ? "1" : "0";}

  return createElement(`w:${name}`, attrs);
}

/**
 * Serialize paragraph borders element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.24 (pBdr)
 */
export function serializeParagraphBorders(borders: DocxParagraphBorders): XmlElement {
  const children: XmlNode[] = [];

  if (borders.top) {children.push(serializeBorderEdge(borders.top, "top"));}
  if (borders.left) {children.push(serializeBorderEdge(borders.left, "left"));}
  if (borders.bottom) {children.push(serializeBorderEdge(borders.bottom, "bottom"));}
  if (borders.right) {children.push(serializeBorderEdge(borders.right, "right"));}
  if (borders.between) {children.push(serializeBorderEdge(borders.between, "between"));}
  if (borders.bar) {children.push(serializeBorderEdge(borders.bar, "bar"));}

  return createElement("w:pBdr", {}, children);
}

// =============================================================================
// Tab Stops Serialization
// =============================================================================

/**
 * Serialize a tab stop element.
 */
function serializeTabStop(tab: DocxTabStop): XmlElement {
  const attrs: Record<string, string> = {};

  if (tab.val) {attrs["w:val"] = tab.val;}
  if (tab.pos !== undefined) {attrs["w:pos"] = String(tab.pos);}
  if (tab.leader) {attrs["w:leader"] = tab.leader;}

  return createElement("w:tab", attrs);
}

/**
 * Serialize tab stops element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.38 (tabs)
 */
export function serializeTabStops(tabStops: DocxTabStops): XmlElement {
  const children = tabStops.tabs.map((tab) => serializeTabStop(tab));
  return createElement("w:tabs", {}, children);
}

// =============================================================================
// Numbering Properties Serialization
// =============================================================================

/**
 * Serialize numbering properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.19 (numPr)
 */
export function serializeNumberingProperties(numPr: DocxNumberingProperties): XmlElement {
  const children: XmlNode[] = [];

  if (numPr.ilvl !== undefined) {
    children.push(createElement("w:ilvl", { "w:val": String(numPr.ilvl) }));
  }
  if (numPr.numId !== undefined) {
    children.push(createElement("w:numId", { "w:val": String(numPr.numId) }));
  }

  return createElement("w:numPr", {}, children);
}

// =============================================================================
// Frame Properties Serialization
// =============================================================================

/**
 * Serialize frame properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.11 (framePr)
 */
export function serializeFrameProperties(framePr: DocxFrameProperties): XmlElement {
  const attrs: Record<string, string> = {};

  if (framePr.w !== undefined) {attrs["w:w"] = String(framePr.w);}
  if (framePr.h !== undefined) {attrs["w:h"] = String(framePr.h);}
  if (framePr.hRule) {attrs["w:hRule"] = framePr.hRule;}
  if (framePr.hSpace !== undefined) {attrs["w:hSpace"] = String(framePr.hSpace);}
  if (framePr.vSpace !== undefined) {attrs["w:vSpace"] = String(framePr.vSpace);}
  if (framePr.wrap) {attrs["w:wrap"] = framePr.wrap;}
  if (framePr.hAnchor) {attrs["w:hAnchor"] = framePr.hAnchor;}
  if (framePr.vAnchor) {attrs["w:vAnchor"] = framePr.vAnchor;}
  if (framePr.x !== undefined) {attrs["w:x"] = String(framePr.x);}
  if (framePr.xAlign) {attrs["w:xAlign"] = framePr.xAlign;}
  if (framePr.y !== undefined) {attrs["w:y"] = String(framePr.y);}
  if (framePr.yAlign) {attrs["w:yAlign"] = framePr.yAlign;}
  if (framePr.anchorLock !== undefined) {attrs["w:anchorLock"] = framePr.anchorLock ? "1" : "0";}
  if (framePr.dropCap) {attrs["w:dropCap"] = framePr.dropCap;}
  if (framePr.lines !== undefined) {attrs["w:lines"] = String(framePr.lines);}

  return createElement("w:framePr", attrs);
}

// =============================================================================
// Paragraph Properties Serialization
// =============================================================================

/**
 * Serialize paragraph properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.26 (pPr)
 */
export function serializeParagraphProperties(props: DocxParagraphProperties | undefined): XmlElement | undefined {
  if (!props) {return undefined;}

  const children: XmlNode[] = [];

  // Style reference
  addValElement(children, "pStyle", props.pStyle);

  // Keep next
  addToggleElement(children, "keepNext", props.keepNext);

  // Keep lines
  addToggleElement(children, "keepLines", props.keepLines);

  // Page break before
  addToggleElement(children, "pageBreakBefore", props.pageBreakBefore);

  // Frame properties
  if (props.framePr) {children.push(serializeFrameProperties(props.framePr));}

  // Widow/orphan control
  addToggleElement(children, "widowControl", props.widowControl);

  // Numbering properties
  if (props.numPr) {children.push(serializeNumberingProperties(props.numPr));}

  // Suppress line numbers
  addToggleElement(children, "suppressLineNumbers", props.suppressLineNumbers);

  // Paragraph borders
  if (props.pBdr) {children.push(serializeParagraphBorders(props.pBdr));}

  // Shading
  if (props.shd) {children.push(serializeShading(props.shd, "w:shd"));}

  // Tab stops
  if (props.tabs) {children.push(serializeTabStops(props.tabs));}

  // Suppress auto hyphens
  addToggleElement(children, "suppressAutoHyphens", props.suppressAutoHyphens);

  // Kinsoku
  addToggleElement(children, "kinsoku", props.kinsoku);

  // Word wrap
  addToggleElement(children, "wordWrap", props.wordWrap);

  // Overflow punctuation
  addToggleElement(children, "overflowPunct", props.overflowPunct);

  // Top line punctuation
  addToggleElement(children, "topLinePunct", props.topLinePunct);

  // Auto space DE
  addToggleElement(children, "autoSpaceDE", props.autoSpaceDE);

  // Auto space DN
  addToggleElement(children, "autoSpaceDN", props.autoSpaceDN);

  // Bidi
  addToggleElement(children, "bidi", props.bidi);

  // Spacing
  if (props.spacing) {children.push(serializeSpacing(props.spacing));}

  // Indent
  if (props.ind) {children.push(serializeIndent(props.ind));}

  // Context spacing
  addToggleElement(children, "contextualSpacing", props.contextualSpacing);

  // Mirror indents
  addToggleElement(children, "mirrorIndents", props.mirrorIndents);

  // Justification
  addValElement(children, "jc", props.jc);

  // Text direction
  addValElement(children, "textDirection", props.textDirection);

  // Text alignment
  addValElement(children, "textAlignment", props.textAlignment);

  // Outline level
  if (props.outlineLvl !== undefined) {
    children.push(createElement("w:outlineLvl", { "w:val": String(props.outlineLvl) }));
  }

  // Run properties for paragraph mark
  const rPr = serializeRunProperties(props.rPr);
  if (rPr) {children.push(rPr);}

  if (children.length === 0) {return undefined;}

  return createElement("w:pPr", {}, children);
}

// =============================================================================
// Paragraph Content Serialization
// =============================================================================

/**
 * Serialize hyperlink element.
 *
 * @see ECMA-376 Part 1, Section 17.16.22 (hyperlink)
 */
export function serializeHyperlink(hyperlink: DocxHyperlink): XmlElement {
  const attrs: Record<string, string> = {};

  if (hyperlink.rId) {attrs["r:id"] = hyperlink.rId;}
  if (hyperlink.anchor) {attrs["w:anchor"] = hyperlink.anchor;}
  if (hyperlink.tooltip) {attrs["w:tooltip"] = hyperlink.tooltip;}
  if (hyperlink.tgtFrame) {attrs["w:tgtFrame"] = hyperlink.tgtFrame;}
  if (hyperlink.history !== undefined) {attrs["w:history"] = hyperlink.history ? "1" : "0";}

  const children = hyperlink.content.map((run) => serializeRun(run));

  return createElement("w:hyperlink", attrs, children);
}

/**
 * Serialize bookmark start element.
 *
 * @see ECMA-376 Part 1, Section 17.13.6.2 (bookmarkStart)
 */
export function serializeBookmarkStart(bookmark: DocxBookmarkStart): XmlElement {
  const attrs: Record<string, string> = {
    "w:id": String(bookmark.id),
    "w:name": bookmark.name,
  };
  return createElement("w:bookmarkStart", attrs);
}

/**
 * Serialize bookmark end element.
 *
 * @see ECMA-376 Part 1, Section 17.13.6.1 (bookmarkEnd)
 */
export function serializeBookmarkEnd(bookmark: DocxBookmarkEnd): XmlElement {
  return createElement("w:bookmarkEnd", { "w:id": String(bookmark.id) });
}

/**
 * Serialize paragraph content element.
 */
export function serializeParagraphContent(content: DocxParagraphContent): XmlElement | undefined {
  switch (content.type) {
    case "run":
      return serializeRun(content);
    case "hyperlink":
      return serializeHyperlink(content);
    case "bookmarkStart":
      return serializeBookmarkStart(content);
    case "bookmarkEnd":
      return serializeBookmarkEnd(content);
    default:
      return undefined;
  }
}

// =============================================================================
// Paragraph Serialization
// =============================================================================

/**
 * Serialize a paragraph element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.22 (p)
 */
export function serializeParagraph(paragraph: DocxParagraph): XmlElement {
  const children: XmlNode[] = [];

  // Paragraph properties
  const pPr = serializeParagraphProperties(paragraph.properties);
  if (pPr) {children.push(pPr);}

  // Paragraph content
  for (const content of paragraph.content) {
    const serialized = serializeParagraphContent(content);
    if (serialized) {children.push(serialized);}
  }

  return createElement("w:p", {}, children);
}
