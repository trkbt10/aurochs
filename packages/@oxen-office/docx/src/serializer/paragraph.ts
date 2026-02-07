/**
 * @file DOCX Paragraph Serializer
 *
 * Serializes paragraph elements and paragraph properties to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.3.1 (Paragraph Properties)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import type {
  DocxParagraph,
  DocxParagraphProperties,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxParagraphBorders,
  DocxParagraphBorderEdge,
  DocxTabStops,
  DocxNumberingProperties,
  DocxFrameProperties,
  DocxParagraphContent,
  DocxHyperlink,
  DocxBookmarkStart,
  DocxBookmarkEnd,
  DocxSimpleField,
} from "../domain/paragraph";
import { wEl, valEl, toggleEl, optValEl, optAttr, children } from "./primitive";
import { serializeRunProperties, serializeShading, serializeRun } from "./run";
import { serializeSectionProperties } from "./section";

// =============================================================================
// Spacing Serialization
// =============================================================================

function serializeSpacing(spacing: DocxParagraphSpacing | undefined): XmlElement | undefined {
  if (!spacing) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "before", spacing.before);
  optAttr(attrs, "beforeAutospacing", spacing.beforeAutospacing);
  optAttr(attrs, "after", spacing.after);
  optAttr(attrs, "afterAutospacing", spacing.afterAutospacing);
  optAttr(attrs, "line", spacing.line);
  optAttr(attrs, "lineRule", spacing.lineRule);
  optAttr(attrs, "beforeLines", spacing.beforeLines);
  optAttr(attrs, "afterLines", spacing.afterLines);
  if (Object.keys(attrs).length === 0) return undefined;
  return wEl("spacing", attrs);
}

// =============================================================================
// Indentation Serialization
// =============================================================================

function serializeIndent(ind: DocxParagraphIndent | undefined): XmlElement | undefined {
  if (!ind) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "left", ind.left);
  optAttr(attrs, "leftChars", ind.leftChars);
  optAttr(attrs, "right", ind.right);
  optAttr(attrs, "rightChars", ind.rightChars);
  optAttr(attrs, "firstLine", ind.firstLine);
  optAttr(attrs, "firstLineChars", ind.firstLineChars);
  optAttr(attrs, "hanging", ind.hanging);
  optAttr(attrs, "hangingChars", ind.hangingChars);
  optAttr(attrs, "start", ind.start);
  optAttr(attrs, "startChars", ind.startChars);
  optAttr(attrs, "end", ind.end);
  optAttr(attrs, "endChars", ind.endChars);
  if (Object.keys(attrs).length === 0) return undefined;
  return wEl("ind", attrs);
}

// =============================================================================
// Border Serialization
// =============================================================================

function serializeParagraphBorderEdge(localName: string, edge: DocxParagraphBorderEdge | undefined): XmlElement | undefined {
  if (!edge) return undefined;
  const attrs: Record<string, string> = { val: edge.val };
  optAttr(attrs, "sz", edge.sz);
  optAttr(attrs, "space", edge.space);
  optAttr(attrs, "color", edge.color);
  optAttr(attrs, "themeColor", edge.themeColor);
  optAttr(attrs, "shadow", edge.shadow);
  optAttr(attrs, "frame", edge.frame);
  return wEl(localName, attrs);
}

function serializeParagraphBorders(pBdr: DocxParagraphBorders | undefined): XmlElement | undefined {
  if (!pBdr) return undefined;
  const ch = children(
    serializeParagraphBorderEdge("top", pBdr.top),
    serializeParagraphBorderEdge("left", pBdr.left),
    serializeParagraphBorderEdge("bottom", pBdr.bottom),
    serializeParagraphBorderEdge("right", pBdr.right),
    serializeParagraphBorderEdge("between", pBdr.between),
    serializeParagraphBorderEdge("bar", pBdr.bar),
  );
  if (ch.length === 0) return undefined;
  return wEl("pBdr", {}, ch);
}

// =============================================================================
// Tab Stops Serialization
// =============================================================================

function serializeTabStops(tabs: DocxTabStops | undefined): XmlElement | undefined {
  if (!tabs || tabs.tabs.length === 0) return undefined;
  const ch = tabs.tabs.map((tab) => {
    const attrs: Record<string, string> = {
      val: tab.val,
      pos: String(tab.pos),
    };
    optAttr(attrs, "leader", tab.leader);
    return wEl("tab", attrs);
  });
  return wEl("tabs", {}, ch);
}

// =============================================================================
// Numbering Properties Serialization
// =============================================================================

function serializeNumberingProperties(numPr: DocxNumberingProperties | undefined): XmlElement | undefined {
  if (!numPr) return undefined;
  const ch = children(
    optValEl("ilvl", numPr.ilvl),
    optValEl("numId", numPr.numId),
  );
  if (ch.length === 0) return undefined;
  return wEl("numPr", {}, ch);
}

// =============================================================================
// Frame Properties Serialization
// =============================================================================

function serializeFrameProperties(framePr: DocxFrameProperties | undefined): XmlElement | undefined {
  if (!framePr) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "w", framePr.w);
  optAttr(attrs, "h", framePr.h);
  optAttr(attrs, "hRule", framePr.hRule);
  optAttr(attrs, "hAnchor", framePr.hAnchor);
  optAttr(attrs, "vAnchor", framePr.vAnchor);
  optAttr(attrs, "x", framePr.x);
  optAttr(attrs, "xAlign", framePr.xAlign);
  optAttr(attrs, "y", framePr.y);
  optAttr(attrs, "yAlign", framePr.yAlign);
  optAttr(attrs, "hSpace", framePr.hSpace);
  optAttr(attrs, "vSpace", framePr.vSpace);
  optAttr(attrs, "wrap", framePr.wrap);
  optAttr(attrs, "dropCap", framePr.dropCap);
  optAttr(attrs, "lines", framePr.lines);
  optAttr(attrs, "anchorLock", framePr.anchorLock);
  return wEl("framePr", attrs);
}

// =============================================================================
// Paragraph Properties Serialization
// =============================================================================

/**
 * Serialize paragraph properties to XmlElement.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.26 (pPr)
 */
export function serializeParagraphProperties(props: DocxParagraphProperties | undefined): XmlElement | undefined {
  if (!props) return undefined;

  const ch = children(
    // Style reference
    optValEl("pStyle", props.pStyle),

    // Page/column break control
    toggleEl("keepNext", props.keepNext),
    toggleEl("keepLines", props.keepLines),
    toggleEl("pageBreakBefore", props.pageBreakBefore),

    // Frame properties
    serializeFrameProperties(props.framePr),

    // Widow control
    toggleEl("widowControl", props.widowControl),

    // Numbering
    serializeNumberingProperties(props.numPr),

    // Suppress
    toggleEl("suppressLineNumbers", props.suppressLineNumbers),
    toggleEl("suppressAutoHyphens", props.suppressAutoHyphens),

    // Borders and shading
    serializeParagraphBorders(props.pBdr),
    serializeShading(props.shd),

    // Tab stops
    serializeTabStops(props.tabs),

    // Spacing and indentation
    serializeSpacing(props.spacing),
    serializeIndent(props.ind),

    // East Asian text handling
    toggleEl("kinsoku", props.kinsoku),
    toggleEl("wordWrap", props.wordWrap),
    toggleEl("overflowPunct", props.overflowPunct),
    toggleEl("topLinePunct", props.topLinePunct),
    toggleEl("autoSpaceDE", props.autoSpaceDE),
    toggleEl("autoSpaceDN", props.autoSpaceDN),

    // Bidirectional
    toggleEl("bidi", props.bidi),

    // Alignment
    optValEl("jc", props.jc),
    optValEl("textDirection", props.textDirection),
    optValEl("textAlignment", props.textAlignment),

    // Contextual spacing
    toggleEl("contextualSpacing", props.contextualSpacing),

    // Mirror indents
    toggleEl("mirrorIndents", props.mirrorIndents),

    // Outline level
    optValEl("outlineLvl", props.outlineLvl),

    // Default run properties
    serializeRunProperties(props.rPr),

    // Section properties
    serializeSectionProperties(props.sectPr),
  );

  if (ch.length === 0) return undefined;
  return wEl("pPr", {}, ch);
}

// =============================================================================
// Paragraph Content Serialization
// =============================================================================

function serializeHyperlink(hyperlink: DocxHyperlink): XmlElement {
  const attrs: Record<string, string> = {};
  if (hyperlink.rId) attrs["r:id"] = String(hyperlink.rId);
  optAttr(attrs, "anchor", hyperlink.anchor);
  optAttr(attrs, "tooltip", hyperlink.tooltip);
  optAttr(attrs, "tgtFrame", hyperlink.tgtFrame);
  optAttr(attrs, "history", hyperlink.history);
  const ch = hyperlink.content.map(serializeRun);
  return wEl("hyperlink", attrs, ch);
}

function serializeBookmarkStart(bm: DocxBookmarkStart): XmlElement {
  return wEl("bookmarkStart", { id: String(bm.id), name: bm.name });
}

function serializeBookmarkEnd(bm: DocxBookmarkEnd): XmlElement {
  return wEl("bookmarkEnd", { id: String(bm.id) });
}

function serializeSimpleField(field: DocxSimpleField): XmlElement {
  const attrs: Record<string, string> = { instr: field.instr };
  optAttr(attrs, "dirty", field.dirty);
  const ch = field.content.map(serializeRun);
  return wEl("fldSimple", attrs, ch);
}

function serializeParagraphContent(content: DocxParagraphContent): XmlNode | undefined {
  switch (content.type) {
    case "run":
      return serializeRun(content);
    case "hyperlink":
      return serializeHyperlink(content);
    case "bookmarkStart":
      return serializeBookmarkStart(content);
    case "bookmarkEnd":
      return serializeBookmarkEnd(content);
    case "simpleField":
      return serializeSimpleField(content);
    case "ins":
    case "del":
    case "moveFrom":
    case "moveTo": {
      const tagName = content.type === "ins" ? "ins" : content.type === "del" ? "del" : content.type === "moveFrom" ? "moveFrom" : "moveTo";
      const attrs: Record<string, string> = { id: content.revision.id };
      optAttr(attrs, "author", content.revision.author);
      optAttr(attrs, "date", content.revision.date);
      const ch = content.content.map(serializeRun);
      return wEl(tagName, attrs, ch);
    }
    case "moveFromRangeStart":
    case "moveToRangeStart": {
      const tagName = content.type === "moveFromRangeStart" ? "moveFromRangeStart" : "moveToRangeStart";
      const attrs: Record<string, string> = { id: String(content.id) };
      optAttr(attrs, "name", content.name);
      return wEl(tagName, attrs);
    }
    case "moveFromRangeEnd":
    case "moveToRangeEnd": {
      const tagName = content.type === "moveFromRangeEnd" ? "moveFromRangeEnd" : "moveToRangeEnd";
      return wEl(tagName, { id: String(content.id) });
    }
    case "sdt": {
      const ch: XmlNode[] = [];
      if (content.properties) {
        // SDT properties serialization (simplified)
        const prCh = children(
          optValEl("alias", content.properties.alias),
          optValEl("tag", content.properties.tag),
          optValEl("id", content.properties.id),
          optValEl("lock", content.properties.lock),
        );
        if (prCh.length > 0) ch.push(wEl("sdtPr", {}, prCh));
      }
      if (content.content.length > 0) {
        ch.push(wEl("sdtContent", {}, content.content.map(serializeRun)));
      }
      return wEl("sdt", {}, ch);
    }
    default:
      return undefined;
  }
}

// =============================================================================
// Paragraph Serialization
// =============================================================================

/**
 * Serialize a paragraph element to XmlElement.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.22 (p)
 */
export function serializeParagraph(paragraph: DocxParagraph): XmlElement {
  const ch: XmlNode[] = [];

  const pPr = serializeParagraphProperties(paragraph.properties);
  if (pPr) ch.push(pPr);

  for (const item of paragraph.content) {
    const node = serializeParagraphContent(item);
    if (node) ch.push(node);
  }

  return wEl("p", {}, ch);
}
