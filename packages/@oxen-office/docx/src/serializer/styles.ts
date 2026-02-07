/**
 * @file DOCX Styles Serializer
 *
 * Serializes styles.xml content from DocxStyles.
 *
 * @see ECMA-376 Part 1, Section 17.7 (Styles)
 */

import { createElement, type XmlElement, type XmlNode } from "@oxen/xml";
import type {
  DocxStyles,
  DocxStyle,
  DocxDocDefaults,
  DocxLatentStyles,
  DocxLatentStyleException,
  DocxTableStylePr,
} from "../domain/styles";
import { NS_WORDPROCESSINGML, NS_RELATIONSHIPS } from "../constants";
import { wEl, valEl, optAttr, children } from "./primitive";
import { serializeRunProperties } from "./run";
import { serializeParagraphProperties } from "./paragraph";

// =============================================================================
// Document Defaults Serialization
// =============================================================================

function serializeDocDefaults(docDefaults: DocxDocDefaults | undefined): XmlElement | undefined {
  if (!docDefaults) return undefined;
  const ch: XmlNode[] = [];

  if (docDefaults.rPrDefault) {
    const rPr = serializeRunProperties(docDefaults.rPrDefault.rPr);
    ch.push(wEl("rPrDefault", {}, rPr ? [rPr] : []));
  }

  if (docDefaults.pPrDefault) {
    const pPr = serializeParagraphProperties(docDefaults.pPrDefault.pPr);
    ch.push(wEl("pPrDefault", {}, pPr ? [pPr] : []));
  }

  if (ch.length === 0) return undefined;
  return wEl("docDefaults", {}, ch);
}

// =============================================================================
// Latent Styles Serialization
// =============================================================================

function serializeLatentStyleException(exc: DocxLatentStyleException): XmlElement {
  const attrs: Record<string, string> = { name: exc.name };
  optAttr(attrs, "locked", exc.locked);
  optAttr(attrs, "uiPriority", exc.uiPriority);
  optAttr(attrs, "semiHidden", exc.semiHidden);
  optAttr(attrs, "unhideWhenUsed", exc.unhideWhenUsed);
  optAttr(attrs, "qFormat", exc.qFormat);
  return wEl("lsdException", attrs);
}

function serializeLatentStyles(latentStyles: DocxLatentStyles | undefined): XmlElement | undefined {
  if (!latentStyles) return undefined;
  const attrs: Record<string, string> = {};
  optAttr(attrs, "defLockedState", latentStyles.defLockedState);
  optAttr(attrs, "defUIPriority", latentStyles.defUIPriority);
  optAttr(attrs, "defSemiHidden", latentStyles.defSemiHidden);
  optAttr(attrs, "defUnhideWhenUsed", latentStyles.defUnhideWhenUsed);
  optAttr(attrs, "defQFormat", latentStyles.defQFormat);
  optAttr(attrs, "count", latentStyles.count);
  const ch: XmlNode[] = [];
  if (latentStyles.lsdException) {
    for (const exc of latentStyles.lsdException) {
      ch.push(serializeLatentStyleException(exc));
    }
  }
  return wEl("latentStyles", attrs, ch);
}

// =============================================================================
// Table Style Conditional Serialization
// =============================================================================

function serializeTableStylePr(tblStylePr: DocxTableStylePr): XmlElement {
  const ch = children(
    serializeRunProperties(tblStylePr.rPr),
    serializeParagraphProperties(tblStylePr.pPr),
    // tcPr not yet implemented
  );
  return wEl("tblStylePr", { type: tblStylePr.type }, ch);
}

// =============================================================================
// Style Serialization
// =============================================================================

function serializeStyle(style: DocxStyle): XmlElement {
  const attrs: Record<string, string> = {
    type: style.type,
    styleId: String(style.styleId),
  };
  optAttr(attrs, "default", style.default);
  optAttr(attrs, "customStyle", style.customStyle);

  const ch = children(
    style.name ? valEl("name", style.name.val) : undefined,
    style.aliases ? valEl("aliases", style.aliases.val) : undefined,
    style.basedOn ? valEl("basedOn", String(style.basedOn.val)) : undefined,
    style.next ? valEl("next", String(style.next.val)) : undefined,
    style.link ? valEl("link", String(style.link.val)) : undefined,
    style.uiPriority ? valEl("uiPriority", String(style.uiPriority.val)) : undefined,
    style.semiHidden ? wEl("semiHidden") : undefined,
    style.unhideWhenUsed ? wEl("unhideWhenUsed") : undefined,
    style.qFormat ? wEl("qFormat") : undefined,
    style.locked ? wEl("locked") : undefined,
    style.personal ? wEl("personal") : undefined,
    style.personalReply ? wEl("personalReply") : undefined,
    style.personalCompose ? wEl("personalCompose") : undefined,
    serializeParagraphProperties(style.pPr),
    serializeRunProperties(style.rPr),
    // tblPr, trPr, tcPr not yet implemented
  );

  // Table style conditional formats
  if (style.tblStylePr) {
    for (const tsp of style.tblStylePr) {
      ch.push(serializeTableStylePr(tsp));
    }
  }

  return wEl("style", attrs, ch);
}

// =============================================================================
// Styles Serialization
// =============================================================================

/**
 * Serialize DocxStyles to the styles.xml XmlElement.
 *
 * Produces:
 * ```xml
 * <w:styles xmlns:w="..." xmlns:r="...">
 *   <w:docDefaults>...</w:docDefaults>
 *   <w:latentStyles>...</w:latentStyles>
 *   <w:style>...</w:style>
 * </w:styles>
 * ```
 *
 * @see ECMA-376 Part 1, Section 17.7.4.18 (styles)
 */
export function serializeStyles(styles: DocxStyles): XmlElement {
  const ch: XmlNode[] = [];

  const docDefaults = serializeDocDefaults(styles.docDefaults);
  if (docDefaults) ch.push(docDefaults);

  const latentStyles = serializeLatentStyles(styles.latentStyles);
  if (latentStyles) ch.push(latentStyles);

  for (const style of styles.style) {
    ch.push(serializeStyle(style));
  }

  return createElement("w:styles", {
    "xmlns:w": NS_WORDPROCESSINGML,
    "xmlns:r": NS_RELATIONSHIPS,
  }, ch);
}
