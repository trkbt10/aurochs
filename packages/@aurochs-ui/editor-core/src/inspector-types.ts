/**
 * @file Format-agnostic inspector types (SoT)
 *
 * These types define the contract for inspector/overlay components
 * in editor-controls. Format-specific packages (fig-editor, pptx-editor, etc.)
 * provide concrete implementations via dependency injection.
 */

// =============================================================================
// Node category registry (DI boundary)
// =============================================================================

/**
 * Visual configuration for a single node category.
 * Defines how nodes of this category appear in inspector overlays and trees.
 */
export type NodeCategoryConfig = {
  /** Display color (hex string, e.g. "#3b82f6") */
  readonly color: string;
  /** Human-readable label (e.g. "Container", "Shape") */
  readonly label: string;
};

/**
 * Registry that maps node type strings to visual categories.
 *
 * This is the primary DI boundary for inspector components.
 * Each format (Fig, PPTX, etc.) provides its own registry
 * mapping format-specific node types to categories.
 *
 * @example
 * ```ts
 * const figRegistry: NodeCategoryRegistry = {
 *   categories: {
 *     container: { color: "#3b82f6", label: "Container" },
 *     shape:     { color: "#22c55e", label: "Shape" },
 *     text:      { color: "#f97316", label: "Text" },
 *   },
 *   getCategory: (nodeType) => figNodeTypeMap[nodeType] ?? "unknown",
 *   fallback: { color: "#94a3b8", label: "Unknown" },
 * };
 * ```
 */
export type NodeCategoryRegistry = {
  /**
   * Map of category ID to its visual configuration.
   * Category IDs are arbitrary strings defined by each format.
   */
  readonly categories: Readonly<Record<string, NodeCategoryConfig>>;

  /**
   * Resolve a node type string to a category ID.
   * Must return a key present in `categories`, or any string
   * that falls back to `fallback`.
   */
  readonly getCategory: (nodeType: string) => string;

  /**
   * Fallback configuration for unrecognized node types.
   */
  readonly fallback: NodeCategoryConfig;
};

// =============================================================================
// Bounding box overlay types
// =============================================================================

/**
 * 2D affine transform as a flat 6-element array: [a, b, c, d, tx, ty].
 *
 * Corresponds to the SVG matrix(a, b, c, d, tx, ty) or CSS matrix().
 * Row-major representation:
 *   | a  c  tx |
 *   | b  d  ty |
 *   | 0  0  1  |
 */
export type AffineTransform = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  tx: number,
  ty: number,
];

/** Identity transform constant. */
export const IDENTITY_TRANSFORM: AffineTransform = [1, 0, 0, 1, 0, 0];

/**
 * Bounding box info for a single node, used by the overlay component.
 * Format-agnostic: each format collects these from its own node tree.
 */
export type InspectorBoxInfo = {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly nodeName: string;
  readonly transform: AffineTransform;
  readonly width: number;
  readonly height: number;
};

// =============================================================================
// Inspector tree node types
// =============================================================================

/**
 * Generic tree node for inspector tree display.
 * Format-specific packages convert their node trees to this shape.
 */
export type InspectorTreeNode = {
  readonly id: string;
  readonly name: string;
  readonly nodeType: string;
  readonly width: number;
  readonly height: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly children: readonly InspectorTreeNode[];
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve the color for a node type using the registry.
 * Convenience function that avoids repeating the fallback logic.
 */
export function resolveNodeColor(registry: NodeCategoryRegistry, nodeType: string): string {
  const categoryId = registry.getCategory(nodeType);
  return registry.categories[categoryId]?.color ?? registry.fallback.color;
}

/**
 * Resolve the label for a node type using the registry.
 */
export function resolveNodeLabel(registry: NodeCategoryRegistry, nodeType: string): string {
  const categoryId = registry.getCategory(nodeType);
  return registry.categories[categoryId]?.label ?? registry.fallback.label;
}

/**
 * Build an SVG transform attribute string from an AffineTransform.
 * Returns undefined if the transform is identity.
 */
export function affineToSvgTransform(t: AffineTransform): string | undefined {
  const [a, b, c, d, tx, ty] = t;
  if (a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0) {
    return undefined;
  }
  return `matrix(${a},${b},${c},${d},${tx},${ty})`;
}
