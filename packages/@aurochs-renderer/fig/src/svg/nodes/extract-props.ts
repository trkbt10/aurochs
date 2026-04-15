/**
 * @file Shared property extractors for the direct SVG rendering path
 *
 * Composable extraction functions that eliminate duplication across node renderers.
 * Each function extracts a logical group of properties from a FigNode.
 *
 * Note: The scene-graph rendering path uses scene-graph/extract.ts which
 * accepts FigDesignNode (domain object) instead of FigNode.
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
  FigStrokeCap,
  FigStrokeJoin,
  FigFillGeometry,
  FigEffect,
  KiwiEnumValue,
} from "@aurochs/fig/types";

// ---- Base properties (transform, opacity, visible) ----

export type BaseProps = {
  readonly transform: FigMatrix | undefined;
  readonly opacity: number;
  readonly visible: boolean;
};

/** Extract base node properties (name, type, visibility) */
export function extractBaseProps(node: FigNode): BaseProps {
  return {
    transform: node.transform,
    opacity: node.opacity ?? 1,
    visible: node.visible ?? true,
  };
}

// ---- Size ----

export type SizeProps = {
  readonly size: FigVector;
};

/** Extract size and transform properties from a node */
export function extractSizeProps(node: FigNode, fallback?: FigVector): SizeProps {
  return {
    size: node.size ?? fallback ?? { x: 100, y: 100 },
  };
}

// ---- Paint properties (fill, stroke) ----

/** Extract the name string from a KiwiEnumValue or return undefined */
function enumName<T extends string>(e: KiwiEnumValue | undefined): T | undefined {
  return e?.name as T | undefined;
}

export type PaintProps = {
  readonly fillPaints: readonly FigPaint[] | undefined;
  readonly strokePaints: readonly FigPaint[] | undefined;
  readonly strokeWeight: FigStrokeWeight | undefined;
  readonly strokeCap: FigStrokeCap | undefined;
  readonly strokeJoin: FigStrokeJoin | undefined;
  readonly strokeAlign: string | undefined;
  readonly strokeDashes: readonly number[] | undefined;
};

/** Extract fill and stroke paint properties */
export function extractPaintProps(node: FigNode): PaintProps {
  return {
    fillPaints: node.fillPaints,
    strokePaints: node.strokePaints,
    strokeWeight: node.strokeWeight,
    strokeCap: enumName<FigStrokeCap>(node.strokeCap),
    strokeJoin: enumName<FigStrokeJoin>(node.strokeJoin),
    strokeAlign: enumName(node.strokeAlign),
    strokeDashes: node.strokeDashes,
  };
}

// ---- Geometry properties (fillGeometry, strokeGeometry) ----

export type GeometryProps = {
  readonly fillGeometry: readonly FigFillGeometry[] | undefined;
  readonly strokeGeometry: readonly FigFillGeometry[] | undefined;
};

/** Extract fill and stroke geometry from a node */
export function extractGeometryProps(node: FigNode): GeometryProps {
  return {
    fillGeometry: node.fillGeometry,
    strokeGeometry: node.strokeGeometry,
  };
}

// ---- Effects ----

export type EffectsProps = {
  readonly effects: readonly FigEffect[] | undefined;
};

/** Extract visual effects (shadow, blur) from a node */
export function extractEffectsProps(node: FigNode): EffectsProps {
  return {
    effects: node.effects,
  };
}

// ---- Corner radius ----

/** Resolved corner radius, ready for SVG output. */
export type ResolvedCornerRadius = {
  /** Uniform radius for `<rect rx ry>`. undefined if no radius. */
  readonly rx: number | undefined;
  readonly ry: number | undefined;
  /**
   * Per-corner radii [topLeft, topRight, bottomRight, bottomLeft].
   * undefined when all corners are the same (use rx/ry instead).
   * When set, a `<path>` with individual corner arcs must be used
   * instead of `<rect>`.
   */
  readonly perCorner: readonly [number, number, number, number] | undefined;
};

/**
 * Resolve corner radius for any node type (Frame, Rectangle, Instance, etc.).
 *
 * Handles both `rectangleCornerRadii` (per-corner) and `cornerRadius` (uniform).
 * Clamps to `min(width, height) / 2` to ensure circular corners (Figma behaviour).
 */
export function resolveCornerRadius(node: FigNode, size: FigVector): ResolvedCornerRadius {
  const cornerRadii = node.rectangleCornerRadii;
  const cornerRadius = node.cornerRadius;
  const maxRadius = Math.min(size.x, size.y) / 2;

  if (cornerRadii && cornerRadii.length === 4) {
    const allSame =
      cornerRadii[0] === cornerRadii[1] && cornerRadii[1] === cornerRadii[2] && cornerRadii[2] === cornerRadii[3];
    if (allSame) {
      return { ...clampUniform(cornerRadii[0], maxRadius), perCorner: undefined };
    }
    // Per-corner: clamp each individually
    const clamped: [number, number, number, number] = [
      Math.min(cornerRadii[0], maxRadius),
      Math.min(cornerRadii[1], maxRadius),
      Math.min(cornerRadii[2], maxRadius),
      Math.min(cornerRadii[3], maxRadius),
    ];
    // Use the average for rx/ry fallback (clipPath, etc.)
    const avg = (clamped[0] + clamped[1] + clamped[2] + clamped[3]) / 4;
    return { rx: avg, ry: avg, perCorner: clamped };
  }

  return { ...clampUniform(cornerRadius, maxRadius), perCorner: undefined };
}

function clampUniform(radius: number | undefined, maxRadius: number): { rx: number | undefined; ry: number | undefined } {
  if (!radius || radius <= 0) {return { rx: undefined, ry: undefined };}
  const clamped = Math.min(radius, maxRadius);
  return { rx: clamped, ry: clamped };
}

/**
 * Build a rounded rectangle SVG path with individual corner radii.
 *
 * @param w - width
 * @param h - height
 * @param radii - [topLeft, topRight, bottomRight, bottomLeft]
 */
export function buildRoundedRectPath(
  w: number, h: number,
  radii: readonly [number, number, number, number],
): string {
  const [tl, tr, br, bl] = radii;
  return [
    `M ${tl} 0`,
    `L ${w - tr} 0`,
    tr > 0 ? `A ${tr} ${tr} 0 0 1 ${w} ${tr}` : "",
    `L ${w} ${h - br}`,
    br > 0 ? `A ${br} ${br} 0 0 1 ${w - br} ${h}` : "",
    `L ${bl} ${h}`,
    bl > 0 ? `A ${bl} ${bl} 0 0 1 0 ${h - bl}` : "",
    `L 0 ${tl}`,
    tl > 0 ? `A ${tl} ${tl} 0 0 1 ${tl} 0` : "",
    "Z",
  ].filter(Boolean).join(" ");
}
