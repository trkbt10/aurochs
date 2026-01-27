/**
 * @file DOCX Styles Serializer
 *
 * Serializes styles.xml to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.7 (Styles)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type {
  DocxStyles,
  DocxStyle,
  DocxDocDefaults,
  DocxLatentStyles,
  DocxLatentStyleException,
  DocxTableStylePr,
} from "../domain/styles";
import { NS_WORDPROCESSINGML } from "../constants";
import { serializeRunProperties } from "./run";
import { serializeParagraphProperties } from "./paragraph";

// =============================================================================
// Document Defaults Serialization
// =============================================================================

/**
 * Serialize document defaults element.
 *
 * @see ECMA-376 Part 1, Section 17.7.5.1 (docDefaults)
 */
export function serializeDocDefaults(docDefaults: DocxDocDefaults): XmlElement {
  const children: XmlNode[] = [];

  if (docDefaults.rPrDefault?.rPr) {
    const rPr = serializeRunProperties(docDefaults.rPrDefault.rPr);
    if (rPr) {
      children.push(createElement("w:rPrDefault", {}, [rPr]));
    }
  }

  if (docDefaults.pPrDefault?.pPr) {
    const pPr = serializeParagraphProperties(docDefaults.pPrDefault.pPr);
    if (pPr) {
      children.push(createElement("w:pPrDefault", {}, [pPr]));
    }
  }

  return createElement("w:docDefaults", {}, children);
}

// =============================================================================
// Latent Styles Serialization
// =============================================================================

/**
 * Serialize latent style exception element.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.9 (lsdException)
 */
export function serializeLatentStyleException(exception: DocxLatentStyleException): XmlElement {
  const attrs: Record<string, string> = {};

  attrs["w:name"] = exception.name;
  if (exception.locked !== undefined) {attrs["w:locked"] = exception.locked ? "1" : "0";}
  if (exception.uiPriority !== undefined) {attrs["w:uiPriority"] = String(exception.uiPriority);}
  if (exception.semiHidden !== undefined) {attrs["w:semiHidden"] = exception.semiHidden ? "1" : "0";}
  if (exception.unhideWhenUsed !== undefined) {attrs["w:unhideWhenUsed"] = exception.unhideWhenUsed ? "1" : "0";}
  if (exception.qFormat !== undefined) {attrs["w:qFormat"] = exception.qFormat ? "1" : "0";}

  return createElement("w:lsdException", attrs);
}

/**
 * Serialize latent styles element.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.6 (latentStyles)
 */
export function serializeLatentStyles(latentStyles: DocxLatentStyles): XmlElement {
  const attrs: Record<string, string> = {};

  if (latentStyles.defLockedState !== undefined) {
    attrs["w:defLockedState"] = latentStyles.defLockedState ? "1" : "0";
  }
  if (latentStyles.defUIPriority !== undefined) {
    attrs["w:defUIPriority"] = String(latentStyles.defUIPriority);
  }
  if (latentStyles.defSemiHidden !== undefined) {
    attrs["w:defSemiHidden"] = latentStyles.defSemiHidden ? "1" : "0";
  }
  if (latentStyles.defUnhideWhenUsed !== undefined) {
    attrs["w:defUnhideWhenUsed"] = latentStyles.defUnhideWhenUsed ? "1" : "0";
  }
  if (latentStyles.defQFormat !== undefined) {
    attrs["w:defQFormat"] = latentStyles.defQFormat ? "1" : "0";
  }
  if (latentStyles.count !== undefined) {
    attrs["w:count"] = String(latentStyles.count);
  }

  const children = latentStyles.lsdException?.map(serializeLatentStyleException) ?? [];

  return createElement("w:latentStyles", attrs, children);
}

// =============================================================================
// Table Style Properties Serialization
// =============================================================================

/**
 * Serialize table style properties element.
 *
 * @see ECMA-376 Part 1, Section 17.7.6.6 (tblStylePr)
 */
export function serializeTableStylePr(tblStylePr: DocxTableStylePr): XmlElement {
  const children: XmlNode[] = [];

  const pPr = serializeParagraphProperties(tblStylePr.pPr);
  if (pPr) {children.push(pPr);}

  const rPr = serializeRunProperties(tblStylePr.rPr);
  if (rPr) {children.push(rPr);}

  // Note: tblPr, trPr, tcPr would need to be added here if supported

  return createElement("w:tblStylePr", { "w:type": tblStylePr.type }, children);
}

// =============================================================================
// Style Serialization
// =============================================================================

/**
 * Serialize a style element.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.18 (style)
 */
export function serializeStyle(style: DocxStyle): XmlElement {
  const attrs: Record<string, string> = {
    "w:type": style.type,
    "w:styleId": style.styleId,
  };

  if (style.default !== undefined) {attrs["w:default"] = style.default ? "1" : "0";}
  if (style.customStyle !== undefined) {attrs["w:customStyle"] = style.customStyle ? "1" : "0";}

  const children: XmlNode[] = [];

  // Name
  if (style.name) {
    children.push(createElement("w:name", { "w:val": style.name.val }));
  }

  // Aliases
  if (style.aliases) {
    children.push(createElement("w:aliases", { "w:val": style.aliases.val }));
  }

  // Based on
  if (style.basedOn) {
    children.push(createElement("w:basedOn", { "w:val": style.basedOn.val }));
  }

  // Next
  if (style.next) {
    children.push(createElement("w:next", { "w:val": style.next.val }));
  }

  // Link
  if (style.link) {
    children.push(createElement("w:link", { "w:val": style.link.val }));
  }

  // UI priority
  if (style.uiPriority) {
    children.push(createElement("w:uiPriority", { "w:val": String(style.uiPriority.val) }));
  }

  // Semi hidden
  if (style.semiHidden) {
    children.push(createElement("w:semiHidden"));
  }

  // Unhide when used
  if (style.unhideWhenUsed) {
    children.push(createElement("w:unhideWhenUsed"));
  }

  // qFormat
  if (style.qFormat) {
    children.push(createElement("w:qFormat"));
  }

  // Locked
  if (style.locked) {
    children.push(createElement("w:locked"));
  }

  // Personal
  if (style.personal) {
    children.push(createElement("w:personal"));
  }

  // Personal compose
  if (style.personalCompose) {
    children.push(createElement("w:personalCompose"));
  }

  // Personal reply
  if (style.personalReply) {
    children.push(createElement("w:personalReply"));
  }

  // Paragraph properties
  const pPr = serializeParagraphProperties(style.pPr);
  if (pPr) {children.push(pPr);}

  // Run properties
  const rPr = serializeRunProperties(style.rPr);
  if (rPr) {children.push(rPr);}

  // Table style properties
  if (style.tblStylePr) {
    for (const tsp of style.tblStylePr) {
      children.push(serializeTableStylePr(tsp));
    }
  }

  return createElement("w:style", attrs, children);
}

// =============================================================================
// Styles Document Serialization
// =============================================================================

/**
 * Serialize the styles document.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.19 (styles)
 */
export function serializeStyles(styles: DocxStyles): XmlElement {
  const children: XmlNode[] = [];

  // Document defaults
  if (styles.docDefaults) {
    children.push(serializeDocDefaults(styles.docDefaults));
  }

  // Latent styles
  if (styles.latentStyles) {
    children.push(serializeLatentStyles(styles.latentStyles));
  }

  // Styles
  if (styles.style) {
    for (const style of styles.style) {
      children.push(serializeStyle(style));
    }
  }

  return createElement("w:styles", {
    "xmlns:w": NS_WORDPROCESSINGML,
    "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  }, children);
}
