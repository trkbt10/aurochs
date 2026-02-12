/**
 * @file DOCX Header/Footer Serializer
 *
 * Serializes header and footer content to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.10 (Headers and Footers)
 */

import { createElement, type XmlElement, type XmlNode } from "@aurochs/xml";
import type { DocxHeader, DocxFooter, DocxBlockContent } from "../domain/document";
import { NS_WORDPROCESSINGML, NS_RELATIONSHIPS, NS_DRAWINGML_WORDPROCESSING, NS_DRAWINGML_PICTURE, NS_DRAWINGML, NS_VML } from "../constants";
import { serializeParagraph } from "./paragraph";
import { serializeTable } from "./table";

// =============================================================================
// Block Content Serialization
// =============================================================================

function serializeBlockContent(content: DocxBlockContent): XmlNode | undefined {
  switch (content.type) {
    case "paragraph":
      return serializeParagraph(content);
    case "table":
      return serializeTable(content);
    case "sectionBreak":
      return undefined;
  }
}

// =============================================================================
// Header Serialization
// =============================================================================

/**
 * Serialize a DocxHeader to header.xml XmlElement.
 *
 * Produces:
 * ```xml
 * <w:hdr xmlns:w="..." xmlns:r="...">
 *   ...paragraphs/tables...
 * </w:hdr>
 * ```
 *
 * @see ECMA-376 Part 1, Section 17.10.3 (hdr)
 */
export function serializeHeader(header: DocxHeader): XmlElement {
  const ch: XmlNode[] = [];

  for (const content of header.content) {
    const node = serializeBlockContent(content);
    if (node) { ch.push(node); }
  }

  return createElement(
    "w:hdr",
    {
      "xmlns:w": NS_WORDPROCESSINGML,
      "xmlns:r": NS_RELATIONSHIPS,
      "xmlns:wp": NS_DRAWINGML_WORDPROCESSING,
      "xmlns:pic": NS_DRAWINGML_PICTURE,
      "xmlns:a": NS_DRAWINGML,
      "xmlns:v": NS_VML,
    },
    ch,
  );
}

// =============================================================================
// Footer Serialization
// =============================================================================

/**
 * Serialize a DocxFooter to footer.xml XmlElement.
 *
 * Produces:
 * ```xml
 * <w:ftr xmlns:w="..." xmlns:r="...">
 *   ...paragraphs/tables...
 * </w:ftr>
 * ```
 *
 * @see ECMA-376 Part 1, Section 17.10.2 (ftr)
 */
export function serializeFooter(footer: DocxFooter): XmlElement {
  const ch: XmlNode[] = [];

  for (const content of footer.content) {
    const node = serializeBlockContent(content);
    if (node) { ch.push(node); }
  }

  return createElement(
    "w:ftr",
    {
      "xmlns:w": NS_WORDPROCESSINGML,
      "xmlns:r": NS_RELATIONSHIPS,
      "xmlns:wp": NS_DRAWINGML_WORDPROCESSING,
      "xmlns:pic": NS_DRAWINGML_PICTURE,
      "xmlns:a": NS_DRAWINGML,
      "xmlns:v": NS_VML,
    },
    ch,
  );
}
