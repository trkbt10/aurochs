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
  FigStrokeCap,
  FigStrokeJoin,
  FigStrokeAlign,
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
  readonly strokeCap: FigStrokeCap | undefined;
  readonly strokeJoin: FigStrokeJoin | undefined;
  readonly strokeDashes: readonly number[] | undefined;
  readonly strokeAlign: FigStrokeAlign | undefined;
};

/**
 * Extract paint properties from a FigDesignNode.
 *
 * Uses domain field names (fills/strokes) which are the authoritative
 * paint source — already resolved from styleIdForFill during domain
 * construction. The renderer-internal naming (fillPaints/strokePaints)
 * is preserved in the return type for backward compatibility with
 * conversion functions that expect those names.
 */
export function extractPaintProps(node: FigDesignNode): PaintProps {
  return {
    fillPaints: node.fills,
    strokePaints: node.strokes,
    strokeWeight: node.strokeWeight,
    strokeCap: node.strokeCap,
    strokeJoin: node.strokeJoin,
    strokeDashes: node.strokeDashes,
    strokeAlign: node.strokeAlign,
  };
}

// ---- Geometry properties ----

export type GeometryProps = {
  readonly fillGeometry: readonly FigFillGeometry[] | undefined;
  readonly strokeGeometry: readonly FigFillGeometry[] | undefined;
};

/**
 * Extract fillGeometry/strokeGeometry from a FigDesignNode.
 *
 * These are domain fields containing blob references (indices into
 * the document's blobs array). Now first-class domain fields, so
 * they participate in deep clone, override application, and
 * INSTANCE child inheritance.
 */
export function extractGeometryProps(node: FigDesignNode): GeometryProps {
  return {
    fillGeometry: node.fillGeometry,
    strokeGeometry: node.strokeGeometry,
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
