/**
 * @file Rectangle node React renderer
 */

import { memo } from "react";
import type { RectNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveTopFillAttrs } from "../primitives/fill";
import { resolveStrokeAttrs } from "../primitives/stroke";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform } from "../primitives/transform";

type Props = {
  readonly node: RectNode;
};

function clampRadius(
  radius: number | undefined,
  width: number,
  height: number,
): number | undefined {
  if (!radius || radius <= 0) {
    return undefined;
  }
  return Math.min(radius, Math.min(width, height) / 2);
}

function RectNodeRendererImpl({ node }: Props) {
  const defs = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = resolveEffectsFilter(node.effects, defs);
  const fillAttrs = resolveTopFillAttrs(node.fills, defs);
  const strokeAttrs = node.stroke ? resolveStrokeAttrs(node.stroke) : {};
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  const rectEl = (
    <rect
      x={0}
      y={0}
      width={node.width}
      height={node.height}
      rx={clampedRadius}
      ry={clampedRadius}
      fill={fillAttrs.fill}
      fillOpacity={fillAttrs.fillOpacity}
      {...strokeAttrs}
    />
  );

  if (transformStr || node.opacity < 1 || filterAttr) {
    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
        filter={filterAttr}
      >
        {rectEl}
      </g>
    );
  }

  return rectEl;
}

export const RectNodeRenderer = memo(RectNodeRendererImpl);
