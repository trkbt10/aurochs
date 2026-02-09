/**
 * @file Slide layout patcher
 *
 * Updates slideLayout.xml placeholder transforms and layout-local shapes.
 *
 * @see docs/plans/pptx-export/phase-9-master-layout-theme.md
 */

import type { XmlDocument, XmlElement } from "@aurochs/xml";
import { getChild, isXmlElement } from "@aurochs/xml";
import type { PlaceholderType } from "@aurochs-office/pptx/domain/shape";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import type { ShapeChange } from "../core/shape-differ";
import { updateDocumentRoot, replaceChildByName, updateChildByName } from "../core/xml-mutator";
import { patchTransformElement, serializeTransform } from "../serializer/transform";
import { patchSlideXml } from "../slide/slide-patcher";

export type PlaceholderChange = {
  readonly placeholder: {
    readonly type: PlaceholderType;
    readonly idx?: number;
  };
  readonly transform: Transform;
};

function matchesPlaceholderIdx(expected: number | undefined, actual: number | undefined): boolean {
  if (expected === undefined) {
    return true;
  }
  return actual === expected;
}

function parsePlaceholderRef(shape: XmlElement): { type?: string; idx?: number } | null {
  const nvNames = ["p:nvSpPr", "p:nvPicPr", "p:nvGrpSpPr", "p:nvCxnSpPr", "p:nvGraphicFramePr"] as const;

  const nv = shape.children.find(
    (c): c is XmlElement => isXmlElement(c) && (nvNames as readonly string[]).includes(c.name),
  );
  if (!nv) {
    return null;
  }
  const nvPr = getChild(nv, "p:nvPr");
  if (!nvPr) {
    return null;
  }
  const ph = getChild(nvPr, "p:ph");
  if (!ph) {
    return null;
  }
  const type = ph.attrs.type;
  const idxRaw = ph.attrs.idx;
  const idx = idxRaw === undefined ? undefined : Number.parseInt(idxRaw, 10);
  return { type, idx: Number.isFinite(idx) ? idx : undefined };
}

/** Resolve the shape property element name for a given shape */
function resolveSpPrName(shapeName: string): string {
  switch (shapeName) {
    case "p:grpSp":
      return "p:grpSpPr";
    case "p:graphicFrame":
      return "p:xfrm";
    default:
      return "p:spPr";
  }
}

/** Insert or replace a:xfrm within a spPr element */
function upsertXfrmInSpPr(
  spPr: XmlElement,
  existingXfrm: XmlElement | undefined,
  patchedXfrm: XmlElement,
): XmlElement {
  if (existingXfrm) {
    return replaceChildByName(spPr, "a:xfrm", patchedXfrm);
  }
  return { ...spPr, children: [patchedXfrm, ...spPr.children] };
}

function patchShapeTransform(shape: XmlElement, transform: Transform): XmlElement {
  const spPrName = resolveSpPrName(shape.name);

  const spPr = getChild(shape, spPrName);
  if (!spPr) {
    return shape;
  }

  if (spPrName === "p:xfrm") {
    const patched = patchTransformElement(spPr, transform);
    return replaceChildByName(shape, "p:xfrm", patched);
  }

  const xfrm = getChild(spPr, "a:xfrm");
  const patchedXfrm = xfrm ? patchTransformElement(xfrm, transform) : serializeTransform(transform);
  const updatedSpPr = upsertXfrmInSpPr(spPr, xfrm, patchedXfrm);

  return replaceChildByName(shape, spPrName, updatedSpPr);
}

/** Check whether a node matches the given placeholder change */
function isPlaceholderMatch(node: XmlElement, change: PlaceholderChange): boolean {
  const ph = parsePlaceholderRef(node);
  if (!ph) {
    return false;
  }
  return ph.type === change.placeholder.type && matchesPlaceholderIdx(change.placeholder.idx, ph.idx);
}

/** Count how many placeholder matches exist in the tree */
function countPlaceholderMatches(spTree: XmlElement, change: PlaceholderChange): number {
  const shapeTypes = new Set(["p:sp", "p:pic", "p:graphicFrame", "p:cxnSp", "p:grpSp"]);
  return spTree.children.reduce((count, c) => {
    if (!isXmlElement(c) || !shapeTypes.has(c.name)) {
      return count;
    }
    const nested = c.name === "p:grpSp" ? countPlaceholderMatches(c, change) : 0;
    const self = isPlaceholderMatch(c, change) ? 1 : 0;
    return count + nested + self;
  }, 0);
}

/** Patch matching placeholders in the tree (pure, no mutation) */
function patchMatchingPlaceholders(node: XmlElement, change: PlaceholderChange): XmlElement {
  if (node.name === "p:grpSp") {
    const updatedChildren = node.children.map((c) => (isXmlElement(c) ? patchMatchingPlaceholders(c, change) : c));
    const updatedNode = { ...node, children: updatedChildren };
    return isPlaceholderMatch(updatedNode, change) ? patchShapeTransform(updatedNode, change.transform) : updatedNode;
  }

  const shapeTypes = ["p:sp", "p:pic", "p:graphicFrame", "p:cxnSp"] as const;
  if (!(shapeTypes as readonly string[]).includes(node.name)) {
    return node;
  }
  return isPlaceholderMatch(node, change) ? patchShapeTransform(node, change.transform) : node;
}

function patchPlaceholderInTree(
  spTree: XmlElement,
  change: PlaceholderChange,
): { updated: XmlElement; matches: number } {
  const matches = countPlaceholderMatches(spTree, change);
  const updated = {
    ...spTree,
    children: spTree.children.map((c) => (isXmlElement(c) ? patchMatchingPlaceholders(c, change) : c)),
  };

  return { updated, matches };
}

/**
 * Update layout placeholders by (type, idx).
 *
 * If idx is omitted, the change must match exactly one placeholder of that type.
 */
/** Apply a single placeholder change to a layout document */
function applyPlaceholderChange(layoutXml: XmlDocument, change: PlaceholderChange): XmlDocument {
  return updateDocumentRoot(layoutXml, (root) => {
    const cSld = getChild(root, "p:cSld");
    if (!cSld) {
      throw new Error("patchLayoutPlaceholders: missing p:cSld.");
    }
    const spTree = getChild(cSld, "p:spTree");
    if (!spTree) {
      throw new Error("patchLayoutPlaceholders: missing p:spTree.");
    }

    const { updated, matches } = patchPlaceholderInTree(spTree, change);
    if (matches === 0) {
      throw new Error(
        `patchLayoutPlaceholders: placeholder not found (type=${change.placeholder.type}, idx=${String(change.placeholder.idx)})`,
      );
    }
    if (change.placeholder.idx === undefined && matches > 1) {
      throw new Error(
        `patchLayoutPlaceholders: ambiguous placeholder (type=${change.placeholder.type}); provide idx to disambiguate`,
      );
    }
    if (matches > 1 && change.placeholder.idx !== undefined) {
      throw new Error(
        `patchLayoutPlaceholders: multiple placeholders matched (type=${change.placeholder.type}, idx=${String(change.placeholder.idx)})`,
      );
    }

    return updateChildByName(root, "p:cSld", (cSldEl) => replaceChildByName(cSldEl, "p:spTree", updated));
  });
}

/**
 * Update layout placeholders by (type, idx).
 *
 * If idx is omitted, the change must match exactly one placeholder of that type.
 */
export function patchLayoutPlaceholders(layoutXml: XmlDocument, changes: readonly PlaceholderChange[]): XmlDocument {
  if (!layoutXml) {
    throw new Error("patchLayoutPlaceholders requires layoutXml.");
  }
  if (!changes) {
    throw new Error("patchLayoutPlaceholders requires changes.");
  }

  return changes.reduce(applyPlaceholderChange, layoutXml);
}

/**
 * Update layout-local shapes.
 */
export function patchLayoutShapes(layoutXml: XmlDocument, changes: readonly ShapeChange[]): XmlDocument {
  return patchSlideXml(layoutXml, changes);
}
