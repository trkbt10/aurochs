/**
 * @file LayoutShapeResult[] → FigDesignNode[]
 *
 * Converts diagram layout engine output to Fig design nodes.
 *
 * LayoutShapeResult is the format-agnostic output of the diagram
 * layout engine (@aurochs-office/diagram). It uses DrawingML types
 * (BaseFill, BaseLine, Effects) which we convert via the interop layer.
 *
 * Each LayoutShapeResult becomes a FigDesignNode with:
 *   - Geometry preset → Fig node type (rect, ellipse, etc.)
 *   - Fill, line, effects → via dml-to-fig converters
 *   - Transform → Fig affine matrix + size
 *   - Text → Fig TextData (when present and parseable)
 */

import type { LayoutShapeResult, LayoutTransform } from "@aurochs-office/diagram/domain/layout-shape-result";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigNodeType, FigMatrix, FigVector } from "@aurochs/fig/types";
import { dmlFillToFig } from "./fill";
import { dmlLineTofig } from "./line";
import { dmlEffectsToFig } from "./effects";

/**
 * Convert diagram LayoutShapeResult[] to FigDesignNode[].
 *
 * @param shapes - Output from the diagram layout engine
 * @param colorContext - For resolving scheme colors in fills/lines
 * @param idOffset - Starting offset for node IDs (to avoid collisions)
 */
export function diagramShapesToFig(
  shapes: readonly LayoutShapeResult[],
  colorContext?: ColorContext,
  idOffset = 0,
): readonly FigDesignNode[] {
  return shapes.map((shape, index) =>
    layoutShapeToFigNode(shape, idOffset + index, colorContext),
  );
}

function layoutShapeToFigNode(
  shape: LayoutShapeResult,
  index: number,
  colorContext?: ColorContext,
): FigDesignNode {
  const id = `0:dgm-${index}` as FigNodeId;
  const { transform, size } = layoutTransformToFig(shape.transform);
  const nodeType = resolveNodeType(shape.geometry?.preset);

  const fills = shape.fill ? dmlFillToFig(shape.fill, colorContext) : [];
  const strokeResult = dmlLineTofig(shape.line, colorContext);
  const effects = dmlEffectsToFig(shape.effects, colorContext);

  const cornerRadius = resolveCornerRadius(
    shape.geometry?.preset,
    shape.geometry?.adjustValues,
    size.x,
    size.y,
  );

  return {
    id,
    type: nodeType,
    name: shape.name,
    visible: true,
    opacity: 1,
    transform,
    size,
    fills,
    strokes: strokeResult?.strokePaints ?? [],
    strokeWeight: strokeResult?.strokeWeight ?? 0,
    strokeCap: strokeResult?.strokeCap,
    strokeJoin: strokeResult?.strokeJoin,
    effects,
    cornerRadius,
  };
}

/**
 * Convert LayoutTransform to Fig affine matrix + size.
 *
 * LayoutTransform has decomposed x, y, width, height, rotation, flip.
 * Fig uses a 2x3 affine matrix with separate size vector.
 */
function layoutTransformToFig(t: LayoutTransform): { transform: FigMatrix; size: FigVector } {
  const rotRad = ((t.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  let m00 = cos;
  let m01 = -sin;
  let m10 = sin;
  let m11 = cos;

  if (t.flipHorizontal) { m00 = -m00; m10 = -m10; }
  if (t.flipVertical) { m01 = -m01; m11 = -m11; }

  return {
    transform: { m00, m01, m02: t.x, m10, m11, m12: t.y },
    size: { x: t.width, y: t.height },
  };
}

/**
 * Map DrawingML preset shape type to Fig node type.
 */
function resolveNodeType(preset?: string): FigNodeType {
  if (!preset) return "RECTANGLE";

  switch (preset) {
    case "rect":
      return "RECTANGLE";
    case "ellipse":
      return "ELLIPSE";
    case "line":
      return "LINE";
    case "roundRect":
      return "ROUNDED_RECTANGLE";
    case "triangle":
    case "pentagon":
    case "hexagon":
    case "octagon":
    case "diamond":
      return "REGULAR_POLYGON";
    default:
      if (preset.startsWith("star")) return "STAR";
      console.warn(
        `[diagram-to-fig] Unknown preset shape type "${preset}". Mapping to RECTANGLE.`,
      );
      return "RECTANGLE";
  }
}

/**
 * Extract corner radius for roundRect presets.
 *
 * DrawingML roundRect adj value: percentage of shorter side (0-50000).
 * Fig cornerRadius: absolute pixels.
 */
function resolveCornerRadius(
  preset?: string,
  adjustValues?: readonly { name: string; value: number }[],
  width?: number,
  height?: number,
): number | undefined {
  if (preset !== "roundRect") return undefined;
  if (!adjustValues || !width || !height) return undefined;

  const adj = adjustValues.find((a) => a.name === "adj");
  if (!adj) return undefined;

  const minDim = Math.min(width, height);
  return (adj.value / 50000) * minDim;
}
