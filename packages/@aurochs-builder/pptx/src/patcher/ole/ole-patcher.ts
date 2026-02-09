/**
 * @file OLE object patcher (Phase 10)
 *
 * Updates OLE object graphic frames (p:graphicFrame containing p:oleObj).
 *
 * Scope:
 * - Transform updates (position/size) on p:xfrm
 * - progId updates on p:oleObj (XML-only; binary replacement handled separately)
 */

import { createElement, getChild, isXmlElement, type XmlElement } from "@aurochs/xml";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import { findElements, replaceChildByName, setAttribute, updateChildByName } from "../core/xml-mutator";
import { patchTransformElement } from "../serializer/transform";

export type OleChange =
  | { readonly type: "transform"; readonly transform: Transform }
  | { readonly type: "replace"; readonly newData: ArrayBuffer; readonly progId: string };

function requireGraphicFrame(oleFrame: XmlElement): void {
  if (oleFrame.name !== "p:graphicFrame") {
    throw new Error(`patchOleObject: expected p:graphicFrame, got ${oleFrame.name}`);
  }
}

function patchOleTransform(oleFrame: XmlElement, transform: Transform): XmlElement {
  const xfrm = getChild(oleFrame, "p:xfrm");
  if (!xfrm || !isXmlElement(xfrm)) {
    throw new Error("patchOleObject: missing p:xfrm");
  }
  return replaceChildByName(oleFrame, "p:xfrm", patchTransformElement(xfrm, transform));
}

function patchOleProgId(oleFrame: XmlElement, progId: string): XmlElement {
  if (!progId) {
    throw new Error("patchOleObject: progId is required");
  }

  const graphic = getChild(oleFrame, "a:graphic");
  const graphicData = graphic ? getChild(graphic, "a:graphicData") : undefined;
  if (!graphicData) {
    throw new Error("patchOleObject: missing a:graphicData");
  }

  const oleObjs = findElements(graphicData, (el) => el.name === "p:oleObj");
  if (oleObjs.length === 0) {
    throw new Error("patchOleObject: missing p:oleObj");
  }

  // Patch all p:oleObj occurrences (handles mc:AlternateContent Choice/Fallback variants)
  const patchTree = (node: XmlElement): XmlElement => {
    const nextChildren = node.children.map((c) => {
      if (!isXmlElement(c)) {
        return c;
      }
      return patchTree(c);
    });
    const rebuilt: XmlElement = createElement(node.name, { ...node.attrs }, nextChildren);
    if (rebuilt.name === "p:oleObj") {
      return setAttribute(rebuilt, "progId", progId);
    }
    return rebuilt;
  };

  const nextGraphicData = patchTree(graphicData);
  return updateChildByName(oleFrame, "a:graphic", (graphicEl) =>
    updateChildByName(graphicEl, "a:graphicData", () => nextGraphicData),
  );
}

/** Apply changes to an OLE object frame */
export function patchOleObject(oleFrame: XmlElement, changes: readonly OleChange[]): XmlElement {
  requireGraphicFrame(oleFrame);

  return changes.reduce(applyOleChange, oleFrame);
}

/** Apply a single OLE change to a frame element */
function applyOleChange(frame: XmlElement, change: OleChange): XmlElement {
  switch (change.type) {
    case "transform":
      return patchOleTransform(frame, change.transform);
    case "replace":
      // Binary replacement is handled at the package level; here we only patch metadata.
      return patchOleProgId(frame, change.progId);
  }
}
