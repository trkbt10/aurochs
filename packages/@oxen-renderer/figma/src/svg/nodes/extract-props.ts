/**
 * @file Shared property extractors for Figma node renderers
 *
 * Composable extraction functions that eliminate duplication across node renderers.
 * Each function extracts a logical group of properties from a FigNode.
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
  FigFillGeometry,
  FigEffect,
} from "@oxen/fig/types";

// ---- Base properties (transform, opacity, visible) ----

export type BaseProps = {
  readonly transform: FigMatrix | undefined;
  readonly opacity: number;
  readonly visible: boolean;
};

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

export function extractSizeProps(node: FigNode, fallback?: FigVector): SizeProps {
  return {
    size: node.size ?? fallback ?? { x: 100, y: 100 },
  };
}

// ---- Paint properties (fill, stroke) ----

export type PaintProps = {
  readonly fillPaints: readonly FigPaint[] | undefined;
  readonly strokePaints: readonly FigPaint[] | undefined;
  readonly strokeWeight: FigStrokeWeight | undefined;
};

export function extractPaintProps(node: FigNode): PaintProps {
  return {
    fillPaints: node.fillPaints,
    strokePaints: node.strokePaints,
    strokeWeight: node.strokeWeight,
  };
}

// ---- Geometry properties (fillGeometry, strokeGeometry) ----

export type GeometryProps = {
  readonly fillGeometry: readonly FigFillGeometry[] | undefined;
  readonly strokeGeometry: readonly FigFillGeometry[] | undefined;
};

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

export function extractEffectsProps(node: FigNode): EffectsProps {
  return {
    effects: node.effects,
  };
}

// ---- Corner radius ----

/** Resolved rx/ry pair, ready for SVG output. */
export type ResolvedCornerRadius = {
  readonly rx: number | undefined;
  readonly ry: number | undefined;
};

/**
 * Resolve corner radius for any node type (Frame, Rectangle, Instance, etc.).
 *
 * Handles both `rectangleCornerRadii` (per-corner) and `cornerRadius` (uniform).
 * Clamps to `min(width, height) / 2` to ensure circular corners (Figma behaviour).
 * SVG clamps `rx`/`ry` independently, which causes elliptical corners —
 * this function prevents that by pre-clamping to the smaller dimension.
 *
 * When all 4 per-corner radii are equal they collapse to a single uniform
 * radius.  When they differ, the average is used (SVG `<rect>` cannot
 * express per-corner radii; a `<path>` fallback would be needed for full
 * fidelity).
 */
export function resolveCornerRadius(
  node: FigNode,
  size: FigVector,
): ResolvedCornerRadius {
  const cornerRadii = node.rectangleCornerRadii;
  const cornerRadius = node.cornerRadius;
  const maxRadius = Math.min(size.x, size.y) / 2;

  if (cornerRadii && cornerRadii.length === 4) {
    const allSame =
      cornerRadii[0] === cornerRadii[1] &&
      cornerRadii[1] === cornerRadii[2] &&
      cornerRadii[2] === cornerRadii[3];
    if (allSame) {
      return clamp(cornerRadii[0], maxRadius);
    }
    // Different corners — use average (SVG <rect> limitation)
    const avg =
      (cornerRadii[0] + cornerRadii[1] + cornerRadii[2] + cornerRadii[3]) / 4;
    return clamp(avg, maxRadius);
  }

  return clamp(cornerRadius, maxRadius);
}

function clamp(
  radius: number | undefined,
  maxRadius: number,
): ResolvedCornerRadius {
  if (!radius || radius <= 0) return { rx: undefined, ry: undefined };
  const clamped = Math.min(radius, maxRadius);
  return { rx: clamped, ry: clamped };
}
