/**
 * @file DOCX Document Serializer
 *
 * Serializes the main document.xml content from DocxDocument.
 *
 * @see ECMA-376 Part 1, Section 17.2 (Document Body)
 */

import { createElement, type XmlElement, type XmlNode } from "@aurochs/xml";
import type { DocxDocument, DocxBlockContent, DocxBody } from "../domain/document";
import { NS_WORDPROCESSINGML, NS_RELATIONSHIPS } from "../constants";
import { serializeParagraph } from "./paragraph";
import { serializeTable } from "./table";
import { serializeSectionProperties } from "./section";
import { wEl } from "./primitive";

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
// Document Body Serialization
// =============================================================================

function serializeBody(body: DocxBody): XmlElement {
  const ch: XmlNode[] = [];

  for (const content of body.content) {
    const node = serializeBlockContent(content);
    if (node) ch.push(node);
  }

  // Final section properties
  const sectPr = serializeSectionProperties(body.sectPr);
  if (sectPr) ch.push(sectPr);

  return wEl("body", {}, ch);
}

// =============================================================================
// Document Serialization
// =============================================================================

/**
 * Serialize a DocxDocument to the document.xml XmlElement.
 *
 * Produces:
 * ```xml
 * <w:document xmlns:w="..." xmlns:r="...">
 *   <w:body>
 *     ...
 *   </w:body>
 * </w:document>
 * ```
 *
 * @see ECMA-376 Part 1, Section 17.2.3 (document)
 */
export function serializeDocument(document: DocxDocument): XmlElement {
  return createElement(
    "w:document",
    {
      "xmlns:w": NS_WORDPROCESSINGML,
      "xmlns:r": NS_RELATIONSHIPS,
    },
    [serializeBody(document.body)],
  );
}
