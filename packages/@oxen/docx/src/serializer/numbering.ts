/**
 * @file DOCX Numbering Serializer
 *
 * Serializes numbering.xml to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.9 (Numbering)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type {
  DocxNumbering,
  DocxAbstractNum,
  DocxNum,
  DocxLevel,
  DocxLevelOverride,
} from "../domain/numbering";
import { NS_WORDPROCESSINGML } from "../constants";
import { serializeRunProperties } from "./run";
import { serializeParagraphProperties } from "./paragraph";

// =============================================================================
// Level Serialization
// =============================================================================

/**
 * Serialize numbering level element.
 *
 * @see ECMA-376 Part 1, Section 17.9.6 (lvl)
 */
export function serializeLevel(level: DocxLevel): XmlElement {
  const children: XmlNode[] = [];

  // Start value
  if (level.start !== undefined) {
    children.push(createElement("w:start", { "w:val": String(level.start) }));
  }

  // Number format
  if (level.numFmt) {
    children.push(createElement("w:numFmt", { "w:val": level.numFmt }));
  }

  // Level restart
  if (level.lvlRestart !== undefined) {
    children.push(createElement("w:lvlRestart", { "w:val": String(level.lvlRestart) }));
  }

  // Paragraph style link
  if (level.pStyle) {
    children.push(createElement("w:pStyle", { "w:val": level.pStyle }));
  }

  // Legal numbering
  if (level.isLgl) {
    children.push(createElement("w:isLgl"));
  }

  // Level suffix
  if (level.suff) {
    children.push(createElement("w:suff", { "w:val": level.suff }));
  }

  // Level text
  if (level.lvlText) {
    const attrs: Record<string, string> = {};
    if (level.lvlText.val !== undefined) {attrs["w:val"] = level.lvlText.val;}
    if (level.lvlText.null !== undefined) {attrs["w:null"] = level.lvlText.null ? "1" : "0";}
    children.push(createElement("w:lvlText", attrs));
  }

  // Level justification
  if (level.lvlJc) {
    children.push(createElement("w:lvlJc", { "w:val": level.lvlJc }));
  }

  // Picture bullet ID
  if (level.lvlPicBulletId) {
    children.push(createElement("w:lvlPicBulletId", { "w:val": String(level.lvlPicBulletId.numPicBulletId) }));
  }

  // Legacy
  if (level.legacy) {
    const legacyAttrs: Record<string, string> = {};
    if (level.legacy.legacy !== undefined) {legacyAttrs["w:legacy"] = level.legacy.legacy ? "1" : "0";}
    if (level.legacy.legacySpace !== undefined) {legacyAttrs["w:legacySpace"] = String(level.legacy.legacySpace);}
    if (level.legacy.legacyIndent !== undefined) {legacyAttrs["w:legacyIndent"] = String(level.legacy.legacyIndent);}
    children.push(createElement("w:legacy", legacyAttrs));
  }

  // Paragraph properties
  const pPr = serializeParagraphProperties(level.pPr);
  if (pPr) {children.push(pPr);}

  // Run properties
  const rPr = serializeRunProperties(level.rPr);
  if (rPr) {children.push(rPr);}

  return createElement("w:lvl", { "w:ilvl": String(level.ilvl) }, children);
}

// =============================================================================
// Abstract Numbering Serialization
// =============================================================================

/**
 * Serialize abstract numbering element.
 *
 * @see ECMA-376 Part 1, Section 17.9.1 (abstractNum)
 */
export function serializeAbstractNum(abstractNum: DocxAbstractNum): XmlElement {
  const children: XmlNode[] = [];

  // Numbering style ID
  if (abstractNum.nsid) {
    children.push(createElement("w:nsid", { "w:val": abstractNum.nsid }));
  }

  // Multi-level type
  if (abstractNum.multiLevelType) {
    children.push(createElement("w:multiLevelType", { "w:val": abstractNum.multiLevelType }));
  }

  // Template code
  if (abstractNum.tmpl) {
    children.push(createElement("w:tmpl", { "w:val": abstractNum.tmpl }));
  }

  // Style link
  if (abstractNum.styleLink) {
    children.push(createElement("w:styleLink", { "w:val": abstractNum.styleLink }));
  }

  // Numbering style link
  if (abstractNum.numStyleLink) {
    children.push(createElement("w:numStyleLink", { "w:val": abstractNum.numStyleLink }));
  }

  // Levels
  for (const lvl of abstractNum.lvl) {
    children.push(serializeLevel(lvl));
  }

  return createElement("w:abstractNum", { "w:abstractNumId": String(abstractNum.abstractNumId) }, children);
}

// =============================================================================
// Level Override Serialization
// =============================================================================

/**
 * Serialize level override element.
 *
 * @see ECMA-376 Part 1, Section 17.9.8 (lvlOverride)
 */
export function serializeLevelOverride(lvlOverride: DocxLevelOverride): XmlElement {
  const children: XmlNode[] = [];

  // Start override
  if (lvlOverride.startOverride !== undefined) {
    children.push(createElement("w:startOverride", { "w:val": String(lvlOverride.startOverride) }));
  }

  // Level
  if (lvlOverride.lvl) {
    children.push(serializeLevel(lvlOverride.lvl));
  }

  return createElement("w:lvlOverride", { "w:ilvl": String(lvlOverride.ilvl) }, children);
}

// =============================================================================
// Numbering Instance Serialization
// =============================================================================

/**
 * Serialize numbering instance element.
 *
 * @see ECMA-376 Part 1, Section 17.9.15 (num)
 */
export function serializeNum(num: DocxNum): XmlElement {
  const children: XmlNode[] = [];

  // Abstract numbering ID reference
  children.push(createElement("w:abstractNumId", { "w:val": String(num.abstractNumId) }));

  // Level overrides
  if (num.lvlOverride) {
    for (const override of num.lvlOverride) {
      children.push(serializeLevelOverride(override));
    }
  }

  return createElement("w:num", { "w:numId": String(num.numId) }, children);
}

// =============================================================================
// Numbering Document Serialization
// =============================================================================

/**
 * Serialize the numbering document.
 *
 * @see ECMA-376 Part 1, Section 17.9.17 (numbering)
 */
export function serializeNumbering(numbering: DocxNumbering): XmlElement {
  const children: XmlNode[] = [];

  // Abstract numbering definitions
  if (numbering.abstractNum) {
    for (const abstractNum of numbering.abstractNum) {
      children.push(serializeAbstractNum(abstractNum));
    }
  }

  // Numbering instances
  if (numbering.num) {
    for (const num of numbering.num) {
      children.push(serializeNum(num));
    }
  }

  return createElement("w:numbering", {
    "xmlns:w": NS_WORDPROCESSINGML,
    "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  }, children);
}
