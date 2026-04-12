/**
 * @file Ellipse node React renderer
 */

import { memo } from "react";
import type { EllipseNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveTopFillAttrs } from "../primitives/fill";
import { resolveStrokeAttrs } from "../primitives/stroke";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform } from "../primitives/transform";

type Props = {
  readonly node: EllipseNode;
};

function EllipseNodeRendererImpl({ node }: Props) {
  const defs = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = resolveEffectsFilter(node.effects, defs);
  const fillAttrs = resolveTopFillAttrs(node.fills, defs);
  const strokeAttrs = node.stroke ? resolveStrokeAttrs(node.stroke) : {};

  const ellipseEl = (
    <ellipse
      cx={node.cx}
      cy={node.cy}
      rx={node.rx}
      ry={node.ry}
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
        {ellipseEl}
      </g>
    );
  }

  return ellipseEl;
}

export const EllipseNodeRenderer = memo(EllipseNodeRendererImpl);
