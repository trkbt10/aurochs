import type { XmlElement } from "@oxen/xml";
import { isXmlElement } from "@oxen/xml";
import { insertChildAt, removeChildAt, replaceChildAt } from "../core/xml-mutator";

export type ShapeOperation =
  | { readonly type: "add"; readonly shape: XmlElement; readonly afterId?: string }
  | { readonly type: "remove"; readonly shapeId: string }
  | { readonly type: "replace"; readonly shapeId: string; readonly newShape: XmlElement };

/**
 * spTree にシェイプを追加する
 *
 * @param spTree - 既存の p:spTree（または p:grpSp）要素
 * @param shapeXml - 追加するシェイプXML（p:sp / p:pic / p:grpSp / p:cxnSp / p:graphicFrame）
 * @param afterId - このIDの後に挿入（オプション）
 * @returns 更新された spTree
 */
export function addShapeToTree(
  spTree: XmlElement,
  shapeXml: XmlElement,
  afterId?: string,
): XmlElement {
  const shapeStartIndex = getShapesStartIndex(spTree);

  const insertIndex = (() => {
    if (!afterId) {
      return spTree.children.length;
    }
    const index = findDirectChildShapeIndexById(spTree, afterId);
    if (index === -1) {
      return spTree.children.length;
    }
    return index + 1;
  })();

  return insertChildAt(spTree, shapeXml, Math.max(shapeStartIndex, insertIndex));
}

/**
 * spTree からシェイプを削除する
 *
 * @param spTree - 既存の p:spTree（または p:grpSp）要素
 * @param shapeId - 削除するシェイプのID
 * @returns 更新された spTree
 */
export function removeShapeFromTree(
  spTree: XmlElement,
  shapeId: string,
): XmlElement {
  if (!shapeId) {
    throw new Error("removeShapeFromTree: shapeId is required");
  }

  const index = findDirectChildShapeIndexById(spTree, shapeId);
  if (index === -1) {
    return spTree;
  }
  return removeChildAt(spTree, index);
}

/**
 * 複数のシェイプ操作を一括適用する
 */
export function batchUpdateShapeTree(
  spTree: XmlElement,
  operations: readonly ShapeOperation[],
): XmlElement {
  let result = spTree;
  for (const op of operations) {
    switch (op.type) {
      case "add":
        result = addShapeToTree(result, op.shape, op.afterId);
        break;
      case "remove":
        result = removeShapeFromTree(result, op.shapeId);
        break;
      case "replace":
        result = replaceShapeInTree(result, op.shapeId, op.newShape);
        break;
    }
  }
  return result;
}

function replaceShapeInTree(spTree: XmlElement, shapeId: string, newShape: XmlElement): XmlElement {
  if (!shapeId) {
    throw new Error("replaceShapeInTree: shapeId is required");
  }
  const index = findDirectChildShapeIndexById(spTree, shapeId);
  if (index === -1) {
    return spTree;
  }
  return replaceChildAt(spTree, index, newShape);
}

function getShapesStartIndex(container: XmlElement): number {
  const first = container.children[0];
  const second = container.children[1];
  if (
    first &&
    second &&
    isXmlElement(first) &&
    isXmlElement(second) &&
    first.name === "p:nvGrpSpPr" &&
    second.name === "p:grpSpPr"
  ) {
    return 2;
  }
  return 0;
}

function findDirectChildShapeIndexById(container: XmlElement, shapeId: string): number {
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i];
    if (!isXmlElement(child)) continue;
    if (!isDirectShapeElement(child)) continue;
    if (getNonVisualId(child) === shapeId) {
      return i;
    }
  }
  return -1;
}

function isDirectShapeElement(el: XmlElement): boolean {
  return ["p:sp", "p:pic", "p:grpSp", "p:cxnSp", "p:graphicFrame"].includes(el.name);
}

function getNonVisualId(shapeEl: XmlElement): string | undefined {
  const nvPrNames = [
    "p:nvSpPr",
    "p:nvPicPr",
    "p:nvGrpSpPr",
    "p:nvCxnSpPr",
    "p:nvGraphicFramePr",
  ];

  for (const nvPrName of nvPrNames) {
    const nvPr = shapeEl.children.find((c): c is XmlElement => isXmlElement(c) && c.name === nvPrName);
    if (!nvPr) continue;
    const cNvPr = nvPr.children.find((c): c is XmlElement => isXmlElement(c) && c.name === "p:cNvPr");
    if (cNvPr?.attrs.id) {
      return cNvPr.attrs.id;
    }
    break;
  }

  return undefined;
}

