/**
 * @file Rectangle node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderRectNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { RectShape } from "../primitives/rect-shape";
import { MultiFillRectLayers, MultiStrokeRectLayers } from "../primitives/multi-fill";

type Props = {
  readonly node: RenderRectNode;
};

function RenderRectNodeComponentImpl({ node }: Props) {
  if (node.fillLayers || node.strokeLayers) {
    const strokeForFill = node.strokeLayers ? undefined : node.stroke;
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers ? (
          <MultiFillRectLayers
            layers={node.fillLayers}
            width={node.width}
            height={node.height}
            cornerRadius={node.cornerRadius}
            stroke={strokeForFill}
          />
        ) : (
          <RectShape
            width={node.width}
            height={node.height}
            cornerRadius={node.cornerRadius}
            fill={node.fill.attrs.fill}
            fillOpacity={node.fill.attrs.fillOpacity}
            {...(strokeForFill ?? {})}
          />
        )}
        {node.strokeLayers && (
          <MultiStrokeRectLayers
            layers={node.strokeLayers}
            width={node.width}
            height={node.height}
            cornerRadius={node.cornerRadius}
          />
        )}
      </ShapeShell>
    );
  }

  const rectEl = (
    <RectShape
      width={node.width}
      height={node.height}
      cornerRadius={node.cornerRadius}
      fill={node.fill.attrs.fill}
      fillOpacity={node.fill.attrs.fillOpacity}
      {...(node.stroke ?? {})}
    />
  );

  if (node.needsWrapper) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {rectEl}
      </ShapeShell>
    );
  }

  return rectEl;
}

export const RenderRectNodeComponent = memo(RenderRectNodeComponentImpl);
