/**
 * @file Ellipse node React renderer
 */

import { memo } from "react";
import type { EllipseNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveTopFillAttrs } from "../primitives/fill";
import { resolveStroke } from "../../scene-graph/render";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform } from "../../scene-graph/render";

type Props = {
  readonly node: EllipseNode;
};

function EllipseNodeRendererImpl({ node }: Props) {
  const ids = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const effectsResult = resolveEffectsFilter(node.effects, ids);
  const fillResult = resolveTopFillAttrs(node.fills, ids);
  const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : {};

  // Collect inline defs
  const defs: React.ReactNode[] = [];
  if (fillResult.defElement) {defs.push(fillResult.defElement);}
  if (effectsResult?.defElement) {defs.push(effectsResult.defElement);}

  const ellipseEl = (
    <ellipse
      cx={node.cx}
      cy={node.cy}
      rx={node.rx}
      ry={node.ry}
      fill={fillResult.fill}
      fillOpacity={fillResult.fillOpacity}
      {...strokeAttrs}
    />
  );

  if (defs.length > 0 || transformStr || node.opacity < 1 || effectsResult) {
    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
        filter={effectsResult?.filterAttr}
      >
        {defs.length > 0 && <defs>{defs}</defs>}
        {ellipseEl}
      </g>
    );
  }

  return ellipseEl;
}

export const EllipseNodeRenderer = memo(EllipseNodeRendererImpl);
