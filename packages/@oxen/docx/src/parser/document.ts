/**
 * @file DOCX Document Parser
 *
 * Parses the main document.xml from WordprocessingML documents.
 *
 * @see ECMA-376 Part 1, Section 17.2 (Document Body)
 */

import { getChild, isXmlElement, type XmlElement } from "@oxen/xml";
import type { DocxBody, DocxBlockContent, DocxDocument, DocxHeader, DocxFooter } from "../domain/document";
import type { DocxParseContext } from "./context";
import { parseParagraph } from "./paragraph";
import { parseTable } from "./table";
import { parseSectionProperties } from "./section";

// =============================================================================
// Block Content Parsing
// =============================================================================

/**
 * Parse block content element.
 */
function parseBlockContent(element: XmlElement, context?: DocxParseContext): DocxBlockContent | undefined {
  const localName = element.name.split(":").pop() ?? element.name;

  switch (localName) {
    case "p":
      return parseParagraph(element, context);
    case "tbl":
      return parseTable(element, context);
    default:
      return undefined;
  }
}

// =============================================================================
// Document Body Parsing
// =============================================================================

/**
 * Parse document body element.
 *
 * @see ECMA-376 Part 1, Section 17.2.2 (body)
 */
export function parseBody(element: XmlElement | undefined, context?: DocxParseContext): DocxBody {
  if (!element) {
    return { content: [] };
  }

  const content: DocxBlockContent[] = [];

  for (const node of element.children) {
    if (!isXmlElement(node)) {continue;}
    const localName = node.name.split(":").pop() ?? node.name;

    // Skip sectPr as it's handled separately
    if (localName === "sectPr") {
      continue;
    }

    const parsed = parseBlockContent(node, context);
    if (parsed) {
      content.push(parsed);
    }
  }

  // Parse final section properties
  const sectPr = parseSectionProperties(getChild(element, "sectPr"));

  return {
    content,
    sectPr,
  };
}

// =============================================================================
// Header/Footer Parsing
// =============================================================================

/**
 * Parse header content element.
 *
 * @see ECMA-376 Part 1, Section 17.10.3 (hdr)
 */
export function parseHeader(element: XmlElement, context?: DocxParseContext): DocxHeader {
  const content: DocxBlockContent[] = [];

  for (const node of element.children) {
    if (!isXmlElement(node)) {continue;}
    const parsed = parseBlockContent(node, context);
    if (parsed) {
      content.push(parsed);
    }
  }

  return { content };
}

/**
 * Parse footer content element.
 *
 * @see ECMA-376 Part 1, Section 17.10.2 (ftr)
 */
export function parseFooter(element: XmlElement, context?: DocxParseContext): DocxFooter {
  const content: DocxBlockContent[] = [];

  for (const node of element.children) {
    if (!isXmlElement(node)) {continue;}
    const parsed = parseBlockContent(node, context);
    if (parsed) {
      content.push(parsed);
    }
  }

  return { content };
}

// =============================================================================
// Document Parsing
// =============================================================================

/**
 * Parse document element.
 *
 * @see ECMA-376 Part 1, Section 17.2.3 (document)
 */
export function parseDocument(element: XmlElement, context?: DocxParseContext): DocxDocument {
  const body = parseBody(getChild(element, "body"), context);

  return {
    body,
    // Other parts (styles, numbering, etc.) are parsed separately and combined in the loader
  };
}
