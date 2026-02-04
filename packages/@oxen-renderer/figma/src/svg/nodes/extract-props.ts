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

export type CornerRadiusProps = {
  readonly cornerRadius: number | undefined;
};

export function extractCornerRadiusProps(node: FigNode): CornerRadiusProps {
  return {
    cornerRadius: node.cornerRadius,
  };
}
