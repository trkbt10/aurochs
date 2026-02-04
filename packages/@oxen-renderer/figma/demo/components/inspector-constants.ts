/**
 * @file Inspector mode shared constants and helpers
 */

export type NodeCategory =
  | "container"
  | "instance"
  | "shape"
  | "text"
  | "structural"
  | "special"
  | "unknown";

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  container: "#3b82f6",
  instance: "#8b5cf6",
  shape: "#22c55e",
  text: "#f97316",
  structural: "#6b7280",
  special: "#eab308",
  unknown: "#94a3b8",
};

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  container: "Container",
  instance: "Instance",
  shape: "Shape",
  text: "Text",
  structural: "Structural",
  special: "Special",
  unknown: "Unknown",
};

const NODE_TYPE_TO_CATEGORY: Record<string, NodeCategory> = {
  // Container
  FRAME: "container",
  GROUP: "container",
  SECTION: "container",
  COMPONENT: "container",
  COMPONENT_SET: "container",
  SYMBOL: "container",
  // Instance
  INSTANCE: "instance",
  // Shape
  RECTANGLE: "shape",
  ROUNDED_RECTANGLE: "shape",
  ELLIPSE: "shape",
  VECTOR: "shape",
  LINE: "shape",
  STAR: "shape",
  REGULAR_POLYGON: "shape",
  BOOLEAN_OPERATION: "shape",
  // Text
  TEXT: "text",
  // Structural
  DOCUMENT: "structural",
  CANVAS: "structural",
  // Special
  STICKY: "special",
  CONNECTOR: "special",
  SHAPE_WITH_TEXT: "special",
  CODE_BLOCK: "special",
  STAMP: "special",
  WIDGET: "special",
  EMBED: "special",
  LINK_UNFURL: "special",
  MEDIA: "special",
  TABLE: "special",
  TABLE_CELL: "special",
  SLICE: "special",
};

export function getNodeCategory(nodeType: string): NodeCategory {
  return NODE_TYPE_TO_CATEGORY[nodeType] ?? "unknown";
}

export function getCategoryColor(nodeType: string): string {
  return CATEGORY_COLORS[getNodeCategory(nodeType)];
}
