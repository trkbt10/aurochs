/**
 * @file Slide Patcher - Apply changes to slide XML
 *
 * Takes ShapeChange[] from shape-differ and applies them to the XmlDocument.
 * This is the integration layer that connects change detection to XML modification.
 *
 * @see docs/plans/pptx-export/phase-2-diff-detection-patch.md
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import { isXmlElement, getChild } from "@oxen/xml";
import type { ShapeChange, ShapeAdded, PropertyChange } from "../core/shape-differ";
import {
  updateDocumentRoot,
  getDocumentRoot,
  findShapeById,
  replaceShapeById,
  removeShapeById,
  updateChildByName,
  replaceChildByName,
} from "../core/xml-mutator";
import { serializeEffects, serializeFill, serializeLine } from "../serializer";
import { patchTransformElement, serializeTransform } from "../serializer/transform";
import { addShapeToTree } from "./shape-tree-patcher";
import { extractShapeIds, generateShapeId } from "../shape/id-generator";
import { serializeShape, serializeGeometry } from "../shape/shape-serializer";
import { applyTextBodyChangeToShape } from "./text-patcher";
import type { Geometry } from "../../domain";

// =============================================================================
// Main Patching Function
// =============================================================================

/**
 * Apply shape changes to a slide XML document.
 *
 * @param slideXml - The original slide XML document
 * @param changes - List of changes to apply
 * @returns Updated slide XML document
 */
export function patchSlideXml(
  slideXml: XmlDocument,
  changes: readonly ShapeChange[],
): XmlDocument {
  let result = slideXml;

  for (const change of changes) {
    switch (change.type) {
      case "removed":
        result = applyRemoval(result, change.shapeId);
        break;
      case "added":
        result = applyAddition(result, change);
        break;
      case "modified":
        result = applyModification(result, change.shapeId, change.changes);
        break;
    }
  }

  return result;
}

// =============================================================================
// Addition
// =============================================================================

function applyAddition(doc: XmlDocument, change: ShapeAdded): XmlDocument {
  const existingIds = extractShapeIds(doc);
  const shapeWithUniqueIds = ensureUniqueIdsForInsertion(change.shape, existingIds);
  const shapeXml = serializeShape(shapeWithUniqueIds);

	  return updateDocumentRoot(doc, (root) => {
	    const cSld = getChild(root, "p:cSld");
	    if (!cSld) return root;

	    const spTree = getChild(cSld, "p:spTree");
	    if (!spTree) return root;

	    const afterId = change.afterId;
	    const parentId = change.parentId;
	    const updatedSpTree = getUpdatedSpTreeForAddition(spTree, parentId, shapeXml, afterId);

	    return updateChildByName(root, "p:cSld", (cSldEl) =>
	      replaceChildByName(cSldEl, "p:spTree", updatedSpTree),
	    );
	  });
	}

function getUpdatedSpTreeForAddition(
  spTree: XmlElement,
  parentId: string | undefined,
  shapeXml: XmlElement,
  afterId: string | undefined,
): XmlElement {
  if (!parentId) {
    return addShapeToTree(spTree, shapeXml, afterId);
  }
  return addShapeToGroupTree(spTree, parentId, shapeXml, afterId);
}

function addShapeToGroupTree(
  spTree: XmlElement,
  parentId: string,
  shapeXml: XmlElement,
  afterId: string | undefined,
): XmlElement {
  const parent = findShapeById(spTree, parentId);
  if (!parent) {
    throw new Error(`applyAddition: parentId not found: ${parentId}`);
  }
  if (parent.name !== "p:grpSp") {
    throw new Error(`applyAddition: parentId is not a p:grpSp: ${parentId}`);
  }

  const updatedGroup = addShapeToTree(parent, shapeXml, afterId);
  return replaceShapeById(spTree, parentId, updatedGroup);
}

// =============================================================================
// Removal
// =============================================================================

/**
 * Remove a shape from the slide XML.
 */
function applyRemoval(doc: XmlDocument, shapeId: string): XmlDocument {
  return updateDocumentRoot(doc, (root) => {
    // Find p:cSld/p:spTree
    const cSld = getChild(root, "p:cSld");
    if (!cSld) return root;

    const spTree = getChild(cSld, "p:spTree");
    if (!spTree) return root;

    // Remove the shape
    const newSpTree = removeShapeById(spTree, shapeId);

    // Update the tree
    return updateChildByName(root, "p:cSld", (cSldEl) =>
      replaceChildByName(cSldEl, "p:spTree", newSpTree),
    );
  });
}

// =============================================================================
// Modification
// =============================================================================

/**
 * Apply property modifications to a shape.
 */
function applyModification(
  doc: XmlDocument,
  shapeId: string,
  changes: readonly PropertyChange[],
): XmlDocument {
  return updateDocumentRoot(doc, (root) => {
    // Find p:cSld/p:spTree
    const cSld = getChild(root, "p:cSld");
    if (!cSld) return root;

    const spTree = getChild(cSld, "p:spTree");
    if (!spTree) return root;

    // Find the shape to modify
    const shape = findShapeById(spTree, shapeId);
    if (!shape) return root;

    // Apply each change to the shape
    let modifiedShape = shape;
    for (const change of changes) {
      modifiedShape = applyPropertyChange(modifiedShape, change);
    }

    // Replace the shape in spTree
    const newSpTree = replaceShapeById(spTree, shapeId, modifiedShape);

    // Update the tree
    return updateChildByName(root, "p:cSld", (cSldEl) =>
      replaceChildByName(cSldEl, "p:spTree", newSpTree),
    );
  });
}

/**
 * Apply a single property change to a shape element.
 */
function applyPropertyChange(
  shape: XmlElement,
  change: PropertyChange,
): XmlElement {
  switch (change.property) {
    case "transform":
      return applyTransformChange(shape, change);
    case "fill":
      return applyFillChange(shape, change);
    case "line":
      return applyLineChange(shape, change);
    case "textBody":
      return applyTextBodyChange(shape, change);
    case "effects":
      return applyEffectsChange(shape, change);
    case "geometry":
      return applyGeometryChange(shape, change);
    case "blipFill":
      return applyBlipFillChange(shape, change);
    default:
      return shape;
  }
}

// =============================================================================
// Transform Change
// =============================================================================

/**
 * Apply transform change to shape XML.
 *
 * Updates a:xfrm within p:spPr or p:grpSpPr.
 */
function applyTransformChange(
  shape: XmlElement,
  change: PropertyChange & { property: "transform" },
): XmlElement {
  const newTransform = change.newValue;
  if (!newTransform) {
    // Transform removed - rare case
    return shape;
  }

  // Find the shape properties element
  const spPrName = getShapePropertiesName(shape.name);
  const spPr = shape.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === spPrName,
  );

  if (!spPr) {
    return shape;
  }

  // GraphicFrame uses p:xfrm directly (no nested a:xfrm)
  if (spPrName === "p:xfrm") {
    const patched = patchTransformElement(spPr, newTransform);
    return replaceChildByName(shape, "p:xfrm", patched);
  }

  // Find or create a:xfrm within spPr/grpSpPr
  const xfrm = getChild(spPr, "a:xfrm");

  // Build new xfrm
  const newXfrm = xfrm ? patchTransformElement(xfrm, newTransform) : serializeTransform(newTransform);

  // Replace xfrm in spPr
  const newSpPr = (() => {
    if (xfrm) {
      return replaceChildByName(spPr, "a:xfrm", newXfrm);
    }
    return prependXfrm(spPr, newXfrm);
  })();

  // Replace spPr in shape
  return replaceChildByName(shape, spPrName, newSpPr);
}

/**
 * Get the shape properties element name for a shape type.
 */
function getShapePropertiesName(shapeName: string): string {
  switch (shapeName) {
    case "p:grpSp":
      return "p:grpSpPr";
    case "p:pic":
      return "p:spPr";
    case "p:cxnSp":
      return "p:spPr";
    case "p:graphicFrame":
      return "p:xfrm"; // GraphicFrame uses p:xfrm directly
    default:
      return "p:spPr";
  }
}

/**
 * Prepend a:xfrm to spPr (it should come first).
 */
function prependXfrm(spPr: XmlElement, xfrm: XmlElement): XmlElement {
  return {
    ...spPr,
    children: [xfrm, ...spPr.children],
  };
}

// =============================================================================
// Fill Change (Stub - Full implementation in Phase 4)
// =============================================================================

function applyFillChange(
  shape: XmlElement,
  change: PropertyChange & { property: "fill" },
): XmlElement {
  const newFill = change.newValue;

  const spPrName = getShapePropertiesName(shape.name);
  if (spPrName === "p:xfrm") {
    return shape;
  }

  const spPr = shape.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === spPrName,
  );
  if (!spPr) {
    return shape;
  }

  const fillNames = new Set([
    "a:noFill",
    "a:solidFill",
    "a:gradFill",
    "a:blipFill",
    "a:pattFill",
    "a:grpFill",
  ]);

  const originalChildren = [...spPr.children];
  const firstFillIndex = originalChildren.findIndex(
    (c) => isXmlElement(c) && fillNames.has(c.name),
  );

  const keptChildren = originalChildren.filter(
    (c) => !(isXmlElement(c) && fillNames.has(c.name)),
  );

  if (!newFill) {
    const newSpPr = { ...spPr, children: keptChildren };
    return replaceChildByName(shape, spPrName, newSpPr);
  }

  const fillElement = serializeFill(newFill);
  let insertIndex = 0;
  if (firstFillIndex === -1) {
    insertIndex = findInsertIndexByName(keptChildren, ["a:ln", "a:effectLst", "a:effectDag"]);
  } else {
    insertIndex = originalChildren
      .slice(0, firstFillIndex)
      .filter((c) => !(isXmlElement(c) && fillNames.has(c.name))).length;
  }

  const newSpPr = {
    ...spPr,
    children: [
      ...keptChildren.slice(0, insertIndex),
      fillElement,
      ...keptChildren.slice(insertIndex),
    ],
  };

  return replaceChildByName(shape, spPrName, newSpPr);
}

// =============================================================================
// Line Change (Stub - Full implementation in Phase 4)
// =============================================================================

function applyLineChange(
  shape: XmlElement,
  change: PropertyChange & { property: "line" },
): XmlElement {
  const newLine = change.newValue;

  const spPrName = getShapePropertiesName(shape.name);
  if (spPrName === "p:xfrm") {
    return shape;
  }

  const spPr = shape.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === spPrName,
  );
  if (!spPr) {
    return shape;
  }

  const originalChildren = [...spPr.children];
  const existingLnIndex = originalChildren.findIndex(
    (c) => isXmlElement(c) && c.name === "a:ln",
  );

  const keptChildren = originalChildren.filter(
    (c) => !(isXmlElement(c) && c.name === "a:ln"),
  );

  if (!newLine) {
    const newSpPr = { ...spPr, children: keptChildren };
    return replaceChildByName(shape, spPrName, newSpPr);
  }

  const lnElement = serializeLine(newLine);
  let insertIndex = 0;
  if (existingLnIndex === -1) {
    insertIndex = findInsertIndexByName(keptChildren, ["a:effectLst", "a:effectDag"]);
  } else {
    insertIndex = originalChildren
      .slice(0, existingLnIndex)
      .filter((c) => !(isXmlElement(c) && c.name === "a:ln")).length;
  }

  const newSpPr = {
    ...spPr,
    children: [
      ...keptChildren.slice(0, insertIndex),
      lnElement,
      ...keptChildren.slice(insertIndex),
    ],
  };

  return replaceChildByName(shape, spPrName, newSpPr);
}

// =============================================================================
// TextBody Change (Stub - Full implementation in Phase 5)
// =============================================================================

function applyTextBodyChange(
  shape: XmlElement,
  change: PropertyChange & { property: "textBody" },
): XmlElement {
  return applyTextBodyChangeToShape(shape, change);
}

// =============================================================================
// Effects Change (Stub - Full implementation in Phase 4)
// =============================================================================

function applyEffectsChange(
  shape: XmlElement,
  change: PropertyChange & { property: "effects" },
): XmlElement {
  const newEffects = change.newValue;

  const spPrName = getShapePropertiesName(shape.name);
  if (spPrName === "p:xfrm") {
    return shape;
  }

  const spPr = shape.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === spPrName,
  );
  if (!spPr) {
    return shape;
  }

  const effectNames = new Set(["a:effectLst", "a:effectDag"]);
  const originalChildren = [...spPr.children];
  const firstEffectIndex = originalChildren.findIndex(
    (c) => isXmlElement(c) && effectNames.has(c.name),
  );

  const keptChildren = originalChildren.filter(
    (c) => !(isXmlElement(c) && effectNames.has(c.name)),
  );

  const effectElement = newEffects ? serializeEffects(newEffects) : null;
  if (!effectElement) {
    const newSpPr = { ...spPr, children: keptChildren };
    return replaceChildByName(shape, spPrName, newSpPr);
  }

  let insertIndex = 0;
  if (firstEffectIndex === -1) {
    insertIndex = keptChildren.length;
  } else {
    insertIndex = originalChildren
      .slice(0, firstEffectIndex)
      .filter((c) => !(isXmlElement(c) && effectNames.has(c.name))).length;
  }

  const newSpPr = {
    ...spPr,
    children: [
      ...keptChildren.slice(0, insertIndex),
      effectElement,
      ...keptChildren.slice(insertIndex),
    ],
  };

  return replaceChildByName(shape, spPrName, newSpPr);
}

function findInsertIndexByName(children: readonly unknown[], names: readonly string[]): number {
  if (names.length === 0) {
    return children.length;
  }

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (!isXmlElement(child)) {
      continue;
    }
    if (names.includes(child.name)) {
      return i;
    }
  }

  return children.length;
}

// =============================================================================
// Geometry Change
// =============================================================================

/**
 * Apply geometry change to shape XML.
 *
 * Updates a:prstGeom or a:custGeom within p:spPr.
 */
function applyGeometryChange(
  shape: XmlElement,
  change: PropertyChange & { property: "geometry" },
): XmlElement {
  const newGeometry = change.newValue as Geometry | undefined;

  const spPrName = getShapePropertiesName(shape.name);
  if (spPrName === "p:xfrm") {
    // GraphicFrame doesn't have geometry
    return shape;
  }

  const spPr = shape.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === spPrName,
  );
  if (!spPr) {
    return shape;
  }

  // Geometry element names
  const geometryNames = new Set(["a:prstGeom", "a:custGeom"]);

  const originalChildren = [...spPr.children];
  const existingGeomIndex = originalChildren.findIndex(
    (c) => isXmlElement(c) && geometryNames.has(c.name),
  );

  // Remove existing geometry elements
  const keptChildren = originalChildren.filter(
    (c) => !(isXmlElement(c) && geometryNames.has(c.name)),
  );

  if (!newGeometry) {
    // If no new geometry, use default rect
    const defaultGeom: XmlElement = {
      type: "element",
      name: "a:prstGeom",
      attrs: { prst: "rect" },
      children: [{ type: "element", name: "a:avLst", attrs: {}, children: [] }],
    };
    const insertIndex = existingGeomIndex !== -1 ? existingGeomIndex : findGeometryInsertIndex(keptChildren);
    const newSpPr = {
      ...spPr,
      children: [
        ...keptChildren.slice(0, insertIndex),
        defaultGeom,
        ...keptChildren.slice(insertIndex),
      ],
    };
    return replaceChildByName(shape, spPrName, newSpPr);
  }

  // Serialize new geometry
  const geomElement = serializeGeometry(newGeometry);

  // Find insert position (geometry should come after a:xfrm)
  let insertIndex = 0;
  if (existingGeomIndex !== -1) {
    // Use same position as existing geometry
    insertIndex = originalChildren
      .slice(0, existingGeomIndex)
      .filter((c) => !(isXmlElement(c) && geometryNames.has(c.name))).length;
  } else {
    insertIndex = findGeometryInsertIndex(keptChildren);
  }

  const newSpPr = {
    ...spPr,
    children: [
      ...keptChildren.slice(0, insertIndex),
      geomElement,
      ...keptChildren.slice(insertIndex),
    ],
  };

  return replaceChildByName(shape, spPrName, newSpPr);
}

/**
 * Find the correct insert index for geometry element.
 * Geometry should come after a:xfrm but before fill/line/effects.
 */
function findGeometryInsertIndex(children: readonly unknown[]): number {
  // Find a:xfrm and insert after it
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isXmlElement(child) && child.name === "a:xfrm") {
      return i + 1;
    }
  }
  // If no xfrm, insert at start
  return 0;
}

// =============================================================================
// BlipFill Change (Stub - Full implementation in Phase 7)
// =============================================================================

function applyBlipFillChange(
  shape: XmlElement,
  change: PropertyChange & { property: "blipFill" },
): XmlElement {
  if (shape.name !== "p:pic") {
    return shape;
  }

  const newValue = change.newValue;
  if (!isBlipFillChangeValue(newValue)) {
    return shape;
  }

  if (newValue.resourceId.startsWith("data:")) {
    throw new Error("applyBlipFillChange: data: resourceId requires Phase 7 media embedding");
  }

  return mapXmlElement(shape, (el) => {
    if (el.name !== "a:blip") {
      return el;
    }

    const hasEmbed = el.attrs["r:embed"] !== undefined;
    const hasLink = el.attrs["r:link"] !== undefined;

    if (hasEmbed) {
      return { ...el, attrs: { ...el.attrs, "r:embed": newValue.resourceId } };
    }
    if (hasLink) {
      return { ...el, attrs: { ...el.attrs, "r:link": newValue.resourceId } };
    }

    return { ...el, attrs: { ...el.attrs, "r:embed": newValue.resourceId } };
  });
}

type BlipFillChangeValue = { readonly resourceId: string };

function isBlipFillChangeValue(value: unknown): value is BlipFillChangeValue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("resourceId" in value)) {
    return false;
  }
  return typeof (value as { resourceId?: unknown }).resourceId === "string";
}

function mapXmlElement(el: XmlElement, mapper: (el: XmlElement) => XmlElement): XmlElement {
  const mappedChildren = el.children.map((child) => {
    if (!isXmlElement(child)) {
      return child;
    }
    return mapXmlElement(child, mapper);
  });
  return mapper({ ...el, children: mappedChildren });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the spTree from a slide document.
 */
export function getSpTree(doc: XmlDocument): XmlElement | null {
  const root = getDocumentRoot(doc);
  if (!root) return null;

  const cSld = getChild(root, "p:cSld");
  if (!cSld) return null;

  return getChild(cSld, "p:spTree") ?? null;
}

/**
 * Check if a slide has any shapes.
 */
export function hasShapes(doc: XmlDocument): boolean {
  const spTree = getSpTree(doc);
  if (!spTree) return false;

  return spTree.children.some(
    (child) =>
      isXmlElement(child) &&
      ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"].includes(child.name),
  );
}

function ensureUniqueIdsForInsertion(
  shape: ShapeAdded["shape"],
  existingIds: readonly string[],
): ShapeAdded["shape"] {
  const idsInShape = collectShapeIds(shape);
  const duplicates = findDuplicates(idsInShape);
  if (duplicates.length > 0) {
    throw new Error(`ensureUniqueIdsForInsertion: duplicate ids in inserted shape: ${duplicates.join(", ")}`);
  }

  const usedIds = new Set(existingIds);
  const idMap = new Map<string, string>();

  const withNewIds = mapShapeTree(shape, (node) => {
    const id = getDomainShapeId(node);
    if (!id) {
      throw new Error("ensureUniqueIdsForInsertion: shape id is required");
    }

    if (!usedIds.has(id)) {
      usedIds.add(id);
      return node;
    }

    const newId = generateShapeId([...usedIds]);
    usedIds.add(newId);
    idMap.set(id, newId);

    return setDomainShapeId(node, newId);
  });

  if (idMap.size === 0) {
    return withNewIds;
  }

  return mapShapeTree(withNewIds, (node) => {
    if (node.type === "cxnSp") {
      return updateConnectorRefs(node, idMap);
    }
    return node;
  });
}

function collectShapeIds(shape: ShapeAdded["shape"]): string[] {
  const ids: string[] = [];
  mapShapeTree(shape, (node) => {
    const id = getDomainShapeId(node);
    if (id) ids.push(id);
    return node;
  });
  return ids;
}

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      dup.add(id);
    } else {
      seen.add(id);
    }
  }
  return [...dup];
}

function mapShapeTree(
  node: ShapeAdded["shape"],
  mapper: (shape: ShapeAdded["shape"]) => ShapeAdded["shape"],
): ShapeAdded["shape"] {
  const mapped = mapper(node);

  if (mapped.type !== "grpSp") {
    return mapped;
  }

  const children = mapped.children.map((child) => mapShapeTree(child, mapper));
  return { ...mapped, children };
}

function getDomainShapeId(shape: ShapeAdded["shape"]): string | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "grpSp":
    case "cxnSp":
    case "graphicFrame":
      return shape.nonVisual.id;
    case "contentPart":
      return undefined;
  }
}

function setDomainShapeId(shape: ShapeAdded["shape"], newId: string): ShapeAdded["shape"] {
  if (!newId) {
    throw new Error("setDomainShapeId: newId is required");
  }

  switch (shape.type) {
    case "sp":
    case "pic":
    case "grpSp":
    case "cxnSp":
    case "graphicFrame":
      return { ...shape, nonVisual: { ...shape.nonVisual, id: newId } };
    case "contentPart":
      return shape;
  }
}

function updateConnectorRefs(
  conn: Extract<ShapeAdded["shape"], { type: "cxnSp" }>,
  idMap: ReadonlyMap<string, string>,
): Extract<ShapeAdded["shape"], { type: "cxnSp" }> {
  const startConnection = conn.nonVisual.startConnection;
  const endConnection = conn.nonVisual.endConnection;

  let updatedStart = startConnection;
  if (startConnection && idMap.has(startConnection.shapeId)) {
    updatedStart = { ...startConnection, shapeId: idMap.get(startConnection.shapeId)! };
  }

  let updatedEnd = endConnection;
  if (endConnection && idMap.has(endConnection.shapeId)) {
    updatedEnd = { ...endConnection, shapeId: idMap.get(endConnection.shapeId)! };
  }

  if (updatedStart === startConnection && updatedEnd === endConnection) {
    return conn;
  }

  return {
    ...conn,
    nonVisual: {
      ...conn.nonVisual,
      startConnection: updatedStart,
      endConnection: updatedEnd,
    },
  };
}
