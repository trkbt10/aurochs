/**
 * @file Ellipse node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderEllipseNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { MultiFillEllipseLayers, MultiStrokeEllipseLayers } from "../primitives/multi-fill";

type Props = {
  readonly node: RenderEllipseNode;
};

function RenderEllipseNodeComponentImpl({ node }: Props) {
  if (node.fillLayers || node.strokeLayers) {
    const strokeForFill = node.strokeLayers ? undefined : node.stroke;
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
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
      </ShapeShell>
    );
  }

  const isCircle = node.rx === node.ry;
  const ellipseEl = isCircle ? (
    <circle
      cx={node.cx}
      cy={node.cy}
      r={node.rx}
      fill={node.fill.attrs.fill}
      fillOpacity={node.fill.attrs.fillOpacity}
      {...(node.stroke ?? {})}
    />
  ) : (
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
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {ellipseEl}
      </ShapeShell>
    );
  }

  return ellipseEl;
}

export const RenderEllipseNodeComponent = memo(RenderEllipseNodeComponentImpl);
