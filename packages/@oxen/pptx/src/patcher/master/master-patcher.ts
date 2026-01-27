/**
 * @file Slide master patcher
 *
 * Applies ShapeChange[] and master text style updates to slideMaster.xml.
 *
 * @see docs/plans/pptx-export/phase-9-master-layout-theme.md
 */

import { createElement, getChild, type XmlDocument, type XmlElement } from "@oxen/xml";
import type { ParagraphProperties, TextStyleLevels } from "../../domain";
import type { ShapeChange } from "../core/shape-differ";
import { updateDocumentRoot, replaceChildByName } from "../core/xml-mutator";
import { patchSlideXml } from "../slide/slide-patcher";
import { patchTextStyleLevelByNumber, patchTextStyleLevelsElement } from "./default-text-style-patcher";

function getOrCreateChild(parent: XmlElement, name: string): XmlElement {
  const existing = getChild(parent, name);
  return existing ?? createElement(name, {}, []);
}

function upsertDirectChild(parent: XmlElement, childName: string, child: XmlElement): XmlElement {
  const existing = getChild(parent, childName);
  if (existing) {
    return replaceChildByName(parent, childName, child);
  }

  const extLstIndex = parent.children.findIndex(
    (c) => c.type === "element" && c.name === "p:extLst",
  );
  const insertIndex = extLstIndex === -1 ? parent.children.length : extLstIndex;
  const nextChildren = [...parent.children];
  nextChildren.splice(insertIndex, 0, child);
  return { ...parent, children: nextChildren };
}

function updateTxStyles(
  masterXml: XmlDocument,
  updater: (txStyles: XmlElement) => XmlElement,
): XmlDocument {
  return updateDocumentRoot(masterXml, (root) => {
    const txStyles = getChild(root, "p:txStyles");
    if (!txStyles) {
      throw new Error("patchSlideMaster: missing p:txStyles element.");
    }
    const updated = updater(txStyles);
    return replaceChildByName(root, "p:txStyles", updated);
  });
}

/**
 * Update slide master shapes.
 *
 * This delegates to patchSlideXml because slide masters share the p:cSld/p:spTree structure.
 */
export function patchMasterShapes(
  masterXml: XmlDocument,
  changes: readonly ShapeChange[],
): XmlDocument {
  return patchSlideXml(masterXml, changes);
}

/**
 * Update p:txStyles/p:titleStyle.
 */
export function patchTitleStyle(
  masterXml: XmlDocument,
  titleStyle: TextStyleLevels,
): XmlDocument {
  return updateTxStyles(masterXml, (txStyles) => {
    const title = getOrCreateChild(txStyles, "p:titleStyle");
    const patched = patchTextStyleLevelsElement(title, titleStyle);
    return upsertDirectChild(txStyles, "p:titleStyle", patched);
  });
}

/**
 * Update p:txStyles/p:bodyStyle.
 */
export function patchBodyStyle(
  masterXml: XmlDocument,
  bodyStyle: TextStyleLevels,
): XmlDocument {
  return updateTxStyles(masterXml, (txStyles) => {
    const body = getOrCreateChild(txStyles, "p:bodyStyle");
    const patched = patchTextStyleLevelsElement(body, bodyStyle);
    return upsertDirectChild(txStyles, "p:bodyStyle", patched);
  });
}

/**
 * Update a:lvl{level}pPr across titleStyle/bodyStyle/otherStyle.
 */
export function patchDefaultTextStyle(
  masterXml: XmlDocument,
  level: number,
  style: ParagraphProperties,
): XmlDocument {
  if (!style) {
    throw new Error("patchDefaultTextStyle requires a style patch.");
  }
  return updateTxStyles(masterXml, (txStyles) => {
    const patchContainer = (
      current: XmlElement,
      containerName: "p:titleStyle" | "p:bodyStyle" | "p:otherStyle",
    ): XmlElement => {
      const container = getOrCreateChild(current, containerName);
      const patched = patchTextStyleLevelByNumber(container, level, style);
      return upsertDirectChild(current, containerName, patched);
    };

    let updated = txStyles;
    updated = patchContainer(updated, "p:titleStyle");
    updated = patchContainer(updated, "p:bodyStyle");
    updated = patchContainer(updated, "p:otherStyle");
    return updated;
  });
}
