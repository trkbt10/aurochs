import type { XmlDocument } from "@oxen/xml";
import { getChild, isXmlElement } from "@oxen/xml";
import { getShapeIds } from "../core/xml-mutator";

/**
 * スライド内で一意なシェイプIDを生成する
 *
 * @param existingIds - 既存のシェイプID一覧
 * @returns 新しい一意なID（数値文字列）
 */
export function generateShapeId(existingIds: readonly string[]): string {
  let maxId = 1; // 1 is reserved for the slide itself (nvGrpSpPr cNvPr)

  for (const id of existingIds) {
    const parsed = Number.parseInt(id, 10);
    if (!Number.isNaN(parsed)) {
      maxId = Math.max(maxId, parsed);
    }
  }

  return String(maxId + 1);
}

/**
 * スライドXMLから既存のシェイプIDをすべて抽出する
 */
export function extractShapeIds(slideXml: XmlDocument): string[] {
  const root = slideXml.children.find(isXmlElement);
  if (!root) {
    return [];
  }

  const cSld = getChild(root, "p:cSld");
  const spTree = cSld ? getChild(cSld, "p:spTree") : undefined;
  if (!spTree) {
    return [];
  }

  return getShapeIds(spTree);
}

/**
 * シェイプ名を生成する（オプション）
 *
 * @example "Shape 5", "TextBox 3"
 */
export function generateShapeName(
  type: string,
  existingNames: readonly string[],
): string {
  if (!type) {
    throw new Error("generateShapeName: type is required");
  }

  const base = (() => {
    switch (type) {
      case "sp":
      case "shape":
        return "Shape";
      case "text":
      case "textbox":
      case "textBox":
        return "TextBox";
      case "pic":
      case "picture":
        return "Picture";
      case "grpSp":
      case "group":
        return "Group";
      case "cxnSp":
      case "connector":
        return "Connector";
      default:
        return type;
    }
  })();

  const pattern = new RegExp(`^${escapeRegExp(base)}\\s+(\\d+)$`);
  let max = 0;
  for (const name of existingNames) {
    const match = name.match(pattern);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (!Number.isNaN(n)) {
        max = Math.max(max, n);
      }
    }
  }

  return `${base} ${max + 1}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

