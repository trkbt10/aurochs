/** @file Shape ID and name generation utilities */
import type { XmlDocument } from "@aurochs/xml";
import { getChild, isXmlElement } from "@aurochs/xml";
import { getShapeIds } from "../core/xml-mutator";

/**
 * スライド内で一意なシェイプIDを生成する
 *
 * @param existingIds - 既存のシェイプID一覧
 * @returns 新しい一意なID（数値文字列）
 */
export function generateShapeId(existingIds: readonly string[]): string {
  const maxId = existingIds.reduce((max, id) => {
    const parsed = Number.parseInt(id, 10);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 1); // 1 is reserved for the slide itself (nvGrpSpPr cNvPr)

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
/** Resolve base name for a shape type */
function resolveShapeBaseName(type: string): string {
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
}

/** Generate a unique shape name based on type and existing names */
export function generateShapeName(type: string, existingNames: readonly string[]): string {
  if (!type) {
    throw new Error("generateShapeName: type is required");
  }

  const base = resolveShapeBaseName(type);

  const pattern = new RegExp(`^${escapeRegExp(base)}\\s+(\\d+)$`);
  const maxNum = existingNames.reduce((acc, name) => {
    const match = name.match(pattern);
    if (!match) {
      return acc;
    }
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);

  return `${base} ${maxNum + 1}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
