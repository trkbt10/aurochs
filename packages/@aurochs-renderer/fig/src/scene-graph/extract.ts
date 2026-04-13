/**
 * @file Property extractors for scene-graph builder
 *
 * These extract functions accept FigDesignNode (domain object) directly.
 * This ensures the scene-graph path enforces domain object usage.
 *
 * The svg/nodes/extract-props.ts file serves the Direct SVG path
 * which still operates on FigNode — these two modules are intentionally
 * separate to maintain the boundary between domain-driven (scene-graph)
 * and parser-driven (direct SVG) rendering paths.
 */

import type {
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
  FigFillGeometry,
  FigEffect,
} from "@aurochs/fig/types";
import type { FigDesignNode } from "@aurochs/fig/domain";

// ---- Base properties ----

export type BaseProps = {
  readonly transform: FigMatrix | undefined;
  readonly opacity: number;
  readonly visible: boolean;
};






/** Extracts base rendering properties (transform, opacity, visibility) from a Figma node. */
export function extractBaseProps(node: FigDesignNode): BaseProps {
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






/** Extracts size properties from a Figma node, with an optional fallback value. */
export function extractSizeProps(node: FigDesignNode, fallback?: FigVector): SizeProps {
  return {
    size: node.size ?? fallback ?? { x: 100, y: 100 },
  };
}

// ---- Paint properties ----

export type PaintProps = {
  readonly fillPaints: readonly FigPaint[] | undefined;
  readonly strokePaints: readonly FigPaint[] | undefined;
  readonly strokeWeight: FigStrokeWeight | undefined;
};

/**
 * Bridge domain field names (fills/strokes) to the renderer's
 * internal naming (fillPaints/strokePaints).
 */
export function extractPaintProps(node: FigDesignNode): PaintProps {
  return {
    fillPaints: node.fills,
    strokePaints: node.strokes,
    strokeWeight: node.strokeWeight,
  };
}

// ---- Geometry properties ----

export type GeometryProps = {
  readonly fillGeometry: readonly FigFillGeometry[] | undefined;
  readonly strokeGeometry: readonly FigFillGeometry[] | undefined;
};

/**
 * fillGeometry/strokeGeometry are preserved in _raw (not first-class fields).
 */
export function extractGeometryProps(node: FigDesignNode): GeometryProps {
  const raw = node._raw;
  return {
    fillGeometry: raw?.fillGeometry as readonly FigFillGeometry[] | undefined,
    strokeGeometry: raw?.strokeGeometry as readonly FigFillGeometry[] | undefined,
  };
}

// ---- Effects ----

export type EffectsProps = {
  readonly effects: readonly FigEffect[] | undefined;
};






/** Extracts effects properties from a Figma node for rendering. */
export function extractEffectsProps(node: FigDesignNode): EffectsProps {
  return {
    effects: node.effects,
  };
}
