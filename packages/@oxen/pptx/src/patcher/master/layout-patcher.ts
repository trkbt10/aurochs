/**
 * @file Slide layout patcher
 *
 * Updates slideLayout.xml placeholder transforms and layout-local shapes.
 *
 * @see docs/plans/pptx-export/phase-9-master-layout-theme.md
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import { getChild, isXmlElement } from "@oxen/xml";
import type { PlaceholderType } from "../../domain/shape";
import type { Transform } from "../../domain/geometry";
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
  const nvNames = [
    "p:nvSpPr",
    "p:nvPicPr",
    "p:nvGrpSpPr",
    "p:nvCxnSpPr",
    "p:nvGraphicFramePr",
  ] as const;

  const nv = shape.children.find((c): c is XmlElement =>
    isXmlElement(c) && (nvNames as readonly string[]).includes(c.name),
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

function patchShapeTransform(shape: XmlElement, transform: Transform): XmlElement {
  const spPrName = (() => {
    switch (shape.name) {
      case "p:grpSp":
        return "p:grpSpPr";
      case "p:graphicFrame":
        return "p:xfrm";
      default:
        return "p:spPr";
    }
  })();

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
  const updatedSpPr = (() => {
    if (xfrm) {
      return replaceChildByName(spPr, "a:xfrm", patchedXfrm);
    }
    return { ...spPr, children: [patchedXfrm, ...spPr.children] };
  })();

  return replaceChildByName(shape, spPrName, updatedSpPr);
}

function patchPlaceholderInTree(
  spTree: XmlElement,
  change: PlaceholderChange,
): { updated: XmlElement; matches: number } {
  let matches = 0;

  const patchNode = (node: XmlElement): XmlElement => {
    if (node.name === "p:grpSp") {
      // Recurse into group children.
      const updatedChildren = node.children.map((c) => (isXmlElement(c) ? patchNode(c) : c));
      const updatedNode = { ...node, children: updatedChildren };

      // Group nodes can also be placeholders in some templates, so check after recursion.
      const ph = parsePlaceholderRef(updatedNode);
      if (!ph) {
        return updatedNode;
      }
      const typeMatches = ph.type === change.placeholder.type;
      const idxMatches = matchesPlaceholderIdx(change.placeholder.idx, ph.idx);
      if (typeMatches && idxMatches) {
        matches += 1;
        return patchShapeTransform(updatedNode, change.transform);
      }
      return updatedNode;
    }

    const shapeTypes = ["p:sp", "p:pic", "p:graphicFrame", "p:cxnSp"] as const;
    if (!(shapeTypes as readonly string[]).includes(node.name)) {
      return node;
    }

    const ph = parsePlaceholderRef(node);
    if (!ph) {
      return node;
    }
    const typeMatches = ph.type === change.placeholder.type;
    const idxMatches = matchesPlaceholderIdx(change.placeholder.idx, ph.idx);
    if (!typeMatches || !idxMatches) {
      return node;
    }

    matches += 1;
    return patchShapeTransform(node, change.transform);
  };

  const updated = {
    ...spTree,
    children: spTree.children.map((c) => (isXmlElement(c) ? patchNode(c) : c)),
  };

  return { updated, matches };
}

/**
 * Update layout placeholders by (type, idx).
 *
 * If idx is omitted, the change must match exactly one placeholder of that type.
 */
export function patchLayoutPlaceholders(
  layoutXml: XmlDocument,
  changes: readonly PlaceholderChange[],
): XmlDocument {
  if (!layoutXml) {
    throw new Error("patchLayoutPlaceholders requires layoutXml.");
  }
  if (!changes) {
    throw new Error("patchLayoutPlaceholders requires changes.");
  }

  let result = layoutXml;

  for (const change of changes) {
    result = updateDocumentRoot(result, (root) => {
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

      return updateChildByName(root, "p:cSld", (cSldEl) =>
        replaceChildByName(cSldEl, "p:spTree", updated),
      );
    });
  }

  return result;
}

/**
 * Update layout-local shapes.
 */
export function patchLayoutShapes(
  layoutXml: XmlDocument,
  changes: readonly ShapeChange[],
): XmlDocument {
  return patchSlideXml(layoutXml, changes);
}
