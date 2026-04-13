/**
 * @file Rectangle node React renderer
 */

import { memo } from "react";
import type { RectNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveTopFillAttrs } from "../primitives/fill";
import { resolveStroke } from "../../scene-graph/render";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform } from "../../scene-graph/render";

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
  const ids = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const effectsResult = resolveEffectsFilter(node.effects, ids);
  const fillResult = resolveTopFillAttrs(node.fills, ids);
  const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : {};
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  // Collect inline defs
  const defs: React.ReactNode[] = [];
  if (fillResult.defElement) {defs.push(fillResult.defElement);}
  if (effectsResult?.defElement) {defs.push(effectsResult.defElement);}

  const rectEl = (
    <rect
      x={0}
      y={0}
      width={node.width}
      height={node.height}
      rx={clampedRadius}
      ry={clampedRadius}
      fill={fillResult.fill}
      fillOpacity={fillResult.fillOpacity}
      {...strokeAttrs}
    />
  );

  // Always wrap with <g> when defs, transform, opacity, or filter needed
  if (defs.length > 0 || transformStr || node.opacity < 1 || effectsResult) {
    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
        filter={effectsResult?.filterAttr}
      >
        {defs.length > 0 && <defs>{defs}</defs>}
        {rectEl}
      </g>
    );
  }

  return rectEl;
}

export const RectNodeRenderer = memo(RectNodeRendererImpl);
