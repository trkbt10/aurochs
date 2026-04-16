/**
 * @file Ellipse node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderEllipseNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderWrapper } from "../primitives/wrapper";
import { MultiFillEllipseLayers, MultiStrokeEllipseLayers } from "../primitives/multi-fill";

type Props = {
  readonly node: RenderEllipseNode;
};

function RenderEllipseNodeComponentImpl({ node }: Props) {
  if (node.fillLayers || node.strokeLayers) {
    const strokeForFill = node.strokeLayers ? undefined : node.stroke;
    return (
      <RenderWrapper wrapper={node.wrapper}>
        {formatRenderDefs(node.defs)}
        {node.fillLayers ? (
          <MultiFillEllipseLayers
            layers={node.fillLayers}
            cx={node.cx}
            cy={node.cy}
            rx={node.rx}
            ry={node.ry}
            stroke={strokeForFill}
          />
        ) : (
          <ellipse
            cx={node.cx}
            cy={node.cy}
            rx={node.rx}
            ry={node.ry}
            fill={node.fill.attrs.fill}
            fillOpacity={node.fill.attrs.fillOpacity}
            {...(strokeForFill ?? {})}
          />
        )}
        {node.strokeLayers && (
          <MultiStrokeEllipseLayers
            layers={node.strokeLayers}
            cx={node.cx}
            cy={node.cy}
            rx={node.rx}
            ry={node.ry}
          />
        )}
      </RenderWrapper>
    );
  }

  const ellipseEl = (
    <ellipse
      cx={node.cx}
      cy={node.cy}
      rx={node.rx}
      ry={node.ry}
      fill={node.fill.attrs.fill}
      fillOpacity={node.fill.attrs.fillOpacity}
      {...(node.stroke ?? {})}
    />
  );

  if (node.needsWrapper) {
    return (
      <RenderWrapper wrapper={node.wrapper}>
        {formatRenderDefs(node.defs)}
        {ellipseEl}
      </RenderWrapper>
    );
  }

  return ellipseEl;
}

export const RenderEllipseNodeComponent = memo(RenderEllipseNodeComponentImpl);
