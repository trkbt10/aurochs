/**
 * @file Fig-specific NodeCategoryRegistry implementation.
 *
 * Maps Figma node types (FRAME, RECTANGLE, TEXT, etc.) to visual categories
 * for the inspector overlay and tree panel.
 */

import type { NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";

// =============================================================================
// Category definitions
// =============================================================================

const FIG_CATEGORIES = {
  container: { color: "#3b82f6", label: "Container" },
  instance: { color: "#8b5cf6", label: "Instance" },
  shape: { color: "#22c55e", label: "Shape" },
  text: { color: "#f97316", label: "Text" },
  structural: { color: "#6b7280", label: "Structural" },
  special: { color: "#eab308", label: "Special" },
} as const;

// =============================================================================
// Node type → category mapping
// =============================================================================

const NODE_TYPE_TO_CATEGORY: Record<string, string> = {
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

// =============================================================================
// Registry
// =============================================================================

/**
 * Fig-specific node category registry.
 *
 * Provides color and label mappings for all known Figma node types.
 * Inject this into editor-controls inspector components.
 */
export const FIG_NODE_CATEGORY_REGISTRY: NodeCategoryRegistry = {
  categories: FIG_CATEGORIES,
  getCategory: (nodeType: string) => NODE_TYPE_TO_CATEGORY[nodeType] ?? "unknown",
  fallback: { color: "#94a3b8", label: "Unknown" },
};

/**
 * Legend display order for Fig categories.
 * Excludes "unknown" since it's a fallback, not a meaningful category.
 */
export const FIG_LEGEND_ORDER: readonly string[] = [
  "container",
  "instance",
  "shape",
  "text",
  "structural",
  "special",
];
