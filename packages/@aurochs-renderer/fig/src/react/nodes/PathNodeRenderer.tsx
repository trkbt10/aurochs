/**
 * @file Path (vector) node React renderer
 */

import { memo } from "react";
import type { PathNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveTopFillAttrs } from "../primitives/fill";
import { resolveStrokeAttrs } from "../primitives/stroke";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform } from "../primitives/transform";
import { contourToSvgD } from "../primitives/path";

type Props = {
  readonly node: PathNode;
};

function PathNodeRendererImpl({ node }: Props) {
  const defs = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = resolveEffectsFilter(node.effects, defs);
  const fillAttrs = resolveTopFillAttrs(node.fills, defs);
  const strokeAttrs = node.stroke ? resolveStrokeAttrs(node.stroke) : {};

  if (node.contours.length === 0) {
    return null;
  }

  const pathElements = node.contours.map((contour, i) => (
    <path
      key={i}
      d={contourToSvgD(contour)}
      fillRule={contour.windingRule !== "nonzero" ? contour.windingRule : undefined}
      fill={fillAttrs.fill}
      fillOpacity={fillAttrs.fillOpacity}
      {...strokeAttrs}
    />
  ));

  const needsWrapper =
    transformStr || node.opacity < 1 || filterAttr || pathElements.length > 1;

  if (needsWrapper) {
    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
        filter={filterAttr}
      >
        {pathElements}
      </g>
    );
  }

  return pathElements[0];
}

export const PathNodeRenderer = memo(PathNodeRendererImpl);
