/**
 * @file Slide shape-tree indexing utilities
 *
 * Builds lookup tables for placeholder resolution in slide/layout/master XML.
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import { getChild, getChildren, isXmlElement } from "@oxen/xml";

/**
 * Index tables for slide content.
 *
 * These tables contain XML element references and are used during parsing
 * for placeholder resolution. They belong to the parser layer, not domain.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 * - idx: xsd:unsignedInt - Placeholder index for matching
 * - type: ST_PlaceholderType - Placeholder type (title, body, etc.)
 */
export type IndexTables = {
  /** Shapes indexed by p:cNvPr/@id (string in XML) */
  idTable: Record<string, XmlElement>;
  /**
   * Shapes indexed by p:ph/@idx (numeric per ECMA-376 xsd:unsignedInt).
   * @see ECMA-376 Part 1, Section 19.3.1.36
   */
  idxTable: Map<number, XmlElement>;
  /** Shapes indexed by p:ph/@type (string enum ST_PlaceholderType) */
  typeTable: Record<string, XmlElement>;
};

/**
 * Get the shape tree (p:cSld/p:spTree) from slide-related XML.
 */
function getSlideShapeTree(content: XmlDocument): XmlElement | undefined {
  // Try to find the root element
  const root = content.children.find((c): c is XmlElement => isXmlElement(c));
  if (!root) {
    return undefined;
  }

  // Get p:cSld → p:spTree path
  const cSld = getChild(root, "p:cSld");
  if (!cSld) {
    return undefined;
  }

  return getChild(cSld, "p:spTree");
}

/**
 * Index nodes in a slide shape tree by id, idx, and type.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 * - idx: xsd:unsignedInt - stored as number key in Map
 * - type: ST_PlaceholderType - stored as string key in Record
 */
export function indexShapeTreeNodes(content: XmlDocument | null): IndexTables {
  const result: IndexTables = {
    idTable: {},
    idxTable: new Map(),
    typeTable: {},
  };

  if (content === null) {
    return result;
  }

  const spTree = getSlideShapeTree(content);
  if (spTree === undefined) {
    return result;
  }

  // Process each element type in the shape tree
  const elementTypes = ["p:sp", "p:cxnSp", "p:pic", "p:graphicFrame", "p:grpSp", "mc:AlternateContent"];

  for (const elementType of elementTypes) {
    const elements = getChildren(spTree, elementType);
    for (const element of elements) {
      indexShapeTreeNode(element, result);
    }
  }

  return result;
}

/**
 * Index a single node
 */
function indexShapeTreeNode(node: XmlElement, tables: IndexTables): void {
  // Try p:nvSpPr path (for shapes)
  let nvSpPr = getChild(node, "p:nvSpPr");

  // Also check p:nvPicPr (for pictures), p:nvCxnSpPr (for connectors), etc.
  if (!nvSpPr) {
    nvSpPr = getChild(node, "p:nvPicPr");
  }
  if (!nvSpPr) {
    nvSpPr = getChild(node, "p:nvCxnSpPr");
  }
  if (!nvSpPr) {
    nvSpPr = getChild(node, "p:nvGraphicFramePr");
  }
  if (!nvSpPr) {
    nvSpPr = getChild(node, "p:nvGrpSpPr");
  }

  if (!nvSpPr) {
    return;
  }

  const cNvPr = getChild(nvSpPr, "p:cNvPr");
  const nvPr = getChild(nvSpPr, "p:nvPr");
  const ph = nvPr ? getChild(nvPr, "p:ph") : undefined;

  const id = cNvPr?.attrs.id;
  const idx = ph?.attrs.idx;
  const type = ph?.attrs.type;

  if (id !== undefined) {
    tables.idTable[id] = node;
  }
  if (idx !== undefined) {
    // idx is xsd:unsignedInt per ECMA-376, convert string to number
    const idxNum = Number(idx);
    if (!Number.isNaN(idxNum)) {
      tables.idxTable.set(idxNum, node);
    }
  }
  if (type !== undefined) {
    tables.typeTable[type] = node;
  }
}
