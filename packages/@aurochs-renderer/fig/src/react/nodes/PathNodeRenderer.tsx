/**
 * @file Path (vector) node React renderer
 */

import { memo } from "react";
import type { PathNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveTopFillAttrs } from "../primitives/fill";
import { resolveStroke, matrixToSvgTransform, contourToSvgD } from "../../scene-graph/render";
import { resolveEffectsFilter } from "../primitives/effects";

type Props = {
  readonly node: PathNode;
};

function PathNodeRendererImpl({ node }: Props) {
  const ids = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const effectsResult = resolveEffectsFilter(node.effects, ids);
  const fillResult = resolveTopFillAttrs(node.fills, ids);
  const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : {};

  if (node.contours.length === 0) {
    return null;
  }

  // Collect inline defs
  const defs: React.ReactNode[] = [];
  if (fillResult.defElement) defs.push(fillResult.defElement);
  if (effectsResult?.defElement) defs.push(effectsResult.defElement);

  const pathElements = node.contours.map((contour, i) => (
    <path
      key={i}
      d={contourToSvgD(contour)}
      fillRule={contour.windingRule !== "nonzero" ? contour.windingRule : undefined}
      fill={fillResult.fill}
      fillOpacity={fillResult.fillOpacity}
      {...strokeAttrs}
    />
  ));

  const needsWrapper =
    defs.length > 0 || transformStr || node.opacity < 1 || effectsResult || pathElements.length > 1;

  if (needsWrapper) {
    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
        filter={effectsResult?.filterAttr}
      >
        {defs.length > 0 && <defs>{defs}</defs>}
        {pathElements}
      </g>
    );
  }

  return pathElements[0];
}

export const PathNodeRenderer = memo(PathNodeRendererImpl);
