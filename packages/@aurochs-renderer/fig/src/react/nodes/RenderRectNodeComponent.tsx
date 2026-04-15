/**
 * @file Rectangle node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderRectNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";

type Props = {
  readonly node: RenderRectNode;
};

function RenderRectNodeComponentImpl({ node }: Props) {
  const rectEl = (
    <rect
      x={0}
      y={0}
      width={node.width}
      height={node.height}
      rx={node.cornerRadius}
      ry={node.cornerRadius}
      fill={node.fill.attrs.fill}
      fillOpacity={node.fill.attrs.fillOpacity}
      {...(node.stroke ?? {})}
    />
  );

  if (node.needsWrapper) {
    return (
      <g
        transform={node.wrapper.transform}
        opacity={node.wrapper.opacity}
        filter={node.wrapper.filterAttr}
      >
        {formatRenderDefs(node.defs)}
        {rectEl}
      </g>
    );
  }

  return rectEl;
}

export const RenderRectNodeComponent = memo(RenderRectNodeComponentImpl);
