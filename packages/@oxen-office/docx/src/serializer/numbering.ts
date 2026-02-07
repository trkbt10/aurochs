/**
 * @file DOCX Numbering Serializer
 *
 * Serializes numbering.xml content from DocxNumbering.
 *
 * @see ECMA-376 Part 1, Section 17.9 (Numbering)
 */

import { createElement, type XmlElement, type XmlNode } from "@oxen/xml";
import type {
  DocxNumbering,
  DocxAbstractNum,
  DocxNum,
  DocxLevel,
  DocxLevelOverride,
  DocxLegacy,
} from "../domain/numbering";
import { NS_WORDPROCESSINGML, NS_RELATIONSHIPS } from "../constants";
import { wEl, valEl, optValEl, optAttr, children } from "./primitive";
import { serializeRunProperties } from "./run";
import { serializeParagraphProperties } from "./paragraph";

// =============================================================================
// Legacy Settings Serialization
// =============================================================================

function serializeLegacy(legacy: DocxLegacy | undefined): XmlElement | undefined {
  if (!legacy) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "legacy", legacy.legacy);
  optAttr(attrs, "legacySpace", legacy.legacySpace);
  optAttr(attrs, "legacyIndent", legacy.legacyIndent);
  return wEl("legacy", attrs);
}

// =============================================================================
// Level Serialization
// =============================================================================

function serializeLevel(lvl: DocxLevel): XmlElement {
  const ch = children(
    optValEl("start", lvl.start),
    optValEl("numFmt", lvl.numFmt),
    optValEl("lvlRestart", lvl.lvlRestart),
    optValEl("pStyle", lvl.pStyle),
    lvl.isLgl ? wEl("isLgl") : undefined,
    optValEl("suff", lvl.suff),
    lvl.lvlText ? (() => {
      const attrs: Record<string, string> = { val: lvl.lvlText.val };
      optAttr(attrs, "null", lvl.lvlText.null);
      return wEl("lvlText", attrs);
    })() : undefined,
    optValEl("lvlJc", lvl.lvlJc),
    lvl.lvlPicBulletId ? valEl("lvlPicBulletId", String(lvl.lvlPicBulletId.numPicBulletId)) : undefined,
    serializeLegacy(lvl.legacy),
    serializeParagraphProperties(lvl.pPr),
    serializeRunProperties(lvl.rPr),
  );

  return wEl("lvl", { ilvl: String(lvl.ilvl) }, ch);
}

// =============================================================================
// Abstract Numbering Serialization
// =============================================================================

function serializeAbstractNum(abstractNum: DocxAbstractNum): XmlElement {
  const ch = children(
    optValEl("nsid", abstractNum.nsid),
    optValEl("multiLevelType", abstractNum.multiLevelType),
    optValEl("tmpl", abstractNum.tmpl),
    optValEl("styleLink", abstractNum.styleLink),
    optValEl("numStyleLink", abstractNum.numStyleLink),
  );

  for (const lvl of abstractNum.lvl) {
    ch.push(serializeLevel(lvl));
  }

  return wEl("abstractNum", { abstractNumId: String(abstractNum.abstractNumId) }, ch);
}

// =============================================================================
// Level Override Serialization
// =============================================================================

function serializeLevelOverride(override: DocxLevelOverride): XmlElement {
  const ch = children(
    optValEl("startOverride", override.startOverride),
    override.lvl ? serializeLevel(override.lvl) : undefined,
  );
  return wEl("lvlOverride", { ilvl: String(override.ilvl) }, ch);
}

// =============================================================================
// Numbering Instance Serialization
// =============================================================================

function serializeNum(num: DocxNum): XmlElement {
  const ch: XmlNode[] = [
    valEl("abstractNumId", String(num.abstractNumId)),
  ];

  if (num.lvlOverride) {
    for (const override of num.lvlOverride) {
      ch.push(serializeLevelOverride(override));
    }
  }

  return wEl("num", { numId: String(num.numId) }, ch);
}

// =============================================================================
// Numbering Serialization
// =============================================================================

/**
 * Serialize DocxNumbering to the numbering.xml XmlElement.
 *
 * Produces:
 * ```xml
 * <w:numbering xmlns:w="..." xmlns:r="...">
 *   <w:abstractNum w:abstractNumId="0">...</w:abstractNum>
 *   <w:num w:numId="1">...</w:num>
 * </w:numbering>
 * ```
 *
 * @see ECMA-376 Part 1, Section 17.9.17 (numbering)
 */
export function serializeNumbering(numbering: DocxNumbering): XmlElement {
  const ch: XmlNode[] = [];

  // Picture bullets (not yet implemented)

  for (const abstractNum of numbering.abstractNum) {
    ch.push(serializeAbstractNum(abstractNum));
  }

  for (const num of numbering.num) {
    ch.push(serializeNum(num));
  }

  return createElement("w:numbering", {
    "xmlns:w": NS_WORDPROCESSINGML,
    "xmlns:r": NS_RELATIONSHIPS,
  }, ch);
}
