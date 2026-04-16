/**
 * @file Rectangle node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderRectNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderWrapper } from "../primitives/wrapper";
import { RectShape } from "../primitives/rect-shape";
import { MultiFillRectLayers, MultiStrokeRectLayers } from "../primitives/multi-fill";

type Props = {
  readonly node: RenderRectNode;
};

function RenderRectNodeComponentImpl({ node }: Props) {
  if (node.fillLayers || node.strokeLayers) {
    const strokeForFill = node.strokeLayers ? undefined : node.stroke;
    return (
      <RenderWrapper wrapper={node.wrapper}>
        {formatRenderDefs(node.defs)}
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
      </RenderWrapper>
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
      <RenderWrapper wrapper={node.wrapper}>
        {formatRenderDefs(node.defs)}
        {rectEl}
      </RenderWrapper>
    );
  }

  return rectEl;
}

export const RenderRectNodeComponent = memo(RenderRectNodeComponentImpl);
