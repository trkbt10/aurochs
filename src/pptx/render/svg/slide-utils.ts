/**
 * @file SVG slide rendering utilities
 *
 * Shared utilities for SVG slide rendering including:
 * - SVG defs collection and ID generation
 * - Transform attribute building
 * - Shape visibility checks
 */

import type { Shape, Transform } from "../../domain";

// =============================================================================
// SVG Defs Collector
// =============================================================================

/**
 * Collection of SVG defs during rendering.
 * Used to accumulate gradient, clipPath, and other definitions.
 */
export type SvgDefsCollector = {
  readonly defs: string[];
  defIdCounter: number;
  readonly addDef: (def: string) => void;
  readonly getNextId: (prefix: string) => string;
  readonly toDefsElement: () => string;
};

/**
 * Create a new SVG defs collector
 */
export function createDefsCollector(): SvgDefsCollector {
  const defs: string[] = [];
  const collector: SvgDefsCollector = {
    defs,
    defIdCounter: 0,
    addDef: (def: string) => defs.push(def),
    getNextId: (prefix: string) => {
      const id = `${prefix}-${collector.defIdCounter}`;
      collector.defIdCounter += 1;
      return id;
    },
    toDefsElement: () => (defs.length > 0 ? `<defs>${defs.join("\n")}</defs>` : ""),
  };

  return collector;
}

// =============================================================================
// Transform Helpers
// =============================================================================

/**
 * Get transform from a shape (polymorphic accessor)
 */
export function getShapeTransform(shape: Shape): Transform | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties.transform;
    case "grpSp":
      return shape.properties.transform as Transform | undefined;
    case "graphicFrame":
      return shape.transform;
  }
}

/**
 * Check if shape is hidden
 */
export function isShapeHidden(shape: Shape): boolean {
  if ("nonVisual" in shape) {
    return shape.nonVisual.hidden === true;
  }
  return false;
}

/**
 * Build SVG transform attribute from Transform domain object.
 *
 * @param transform - Transform to convert
 * @param w - Width for rotation/flip center calculation
 * @param h - Height for rotation/flip center calculation
 * @returns SVG transform attribute string (empty string if no transform)
 */
export function buildTransformAttr(transform: Transform | undefined, w: number, h: number): string {
  if (transform === undefined) {
    return "";
  }

  const x = transform.x as number;
  const y = transform.y as number;
  const rotation = transform.rotation as number;

  const transforms: string[] = [];
  if (x !== 0 || y !== 0) {
    transforms.push(`translate(${x}, ${y})`);
  }
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}, ${w / 2}, ${h / 2})`);
  }
  if (transform.flipH) {
    transforms.push(`scale(-1, 1) translate(${-w}, 0)`);
  }
  if (transform.flipV) {
    transforms.push(`scale(1, -1) translate(0, ${-h})`);
  }

  return transforms.length > 0 ? ` transform="${transforms.join(" ")}"` : "";
}
