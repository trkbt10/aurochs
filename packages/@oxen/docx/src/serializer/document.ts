/**
 * @file DOCX Document Serializer
 *
 * Serializes the main document.xml to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 17.2 (Document Body)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type { DocxDocument, DocxBody, DocxBlockContent } from "../domain/document";
import type { DocxParagraph } from "../domain/paragraph";
import type { DocxTable } from "../domain/table";
import { NS_WORDPROCESSINGML, NS_RELATIONSHIPS } from "../constants";
import { serializeParagraph } from "./paragraph";
import { serializeTable } from "./table";
import { serializeSectionProperties } from "./section";

// =============================================================================
// Block Content Serialization
// =============================================================================

/**
 * Serialize block content element.
 */
export function serializeBlockContent(content: DocxBlockContent): XmlElement {
  switch (content.type) {
    case "paragraph":
      return serializeParagraph(content as DocxParagraph);
    case "table":
      return serializeTable(content as DocxTable);
    default:
      // Unknown content type, serialize as empty paragraph
      return createElement("w:p");
  }
}

// =============================================================================
// Document Body Serialization
// =============================================================================

/**
 * Serialize document body element.
 *
 * @see ECMA-376 Part 1, Section 17.2.2 (body)
 */
export function serializeBody(body: DocxBody): XmlElement {
  const children: XmlNode[] = [];

  // Serialize block content
  for (const content of body.content) {
    children.push(serializeBlockContent(content));
  }

  // Serialize final section properties
  const sectPr = serializeSectionProperties(body.sectPr);
  if (sectPr) {children.push(sectPr);}

  return createElement("w:body", {}, children);
}

// =============================================================================
// Document Serialization
// =============================================================================

/**
 * Serialize the main document element.
 *
 * @see ECMA-376 Part 1, Section 17.2.3 (document)
 */
export function serializeDocument(document: DocxDocument): XmlElement {
  const body = serializeBody(document.body);

  return createElement("w:document", {
    "xmlns:w": NS_WORDPROCESSINGML,
    "xmlns:r": NS_RELATIONSHIPS,
    "xmlns:wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "xmlns:pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "xmlns:m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "xmlns:v": "urn:schemas-microsoft-com:vml",
    "xmlns:o": "urn:schemas-microsoft-com:office:office",
    "xmlns:wpc": "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
    "xmlns:mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "mc:Ignorable": "w14 w15 w16se wp14",
  }, [body]);
}
