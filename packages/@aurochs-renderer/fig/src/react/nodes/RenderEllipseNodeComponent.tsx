/**
 * @file Ellipse node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderEllipseNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";

type Props = {
  readonly node: RenderEllipseNode;
};

function RenderEllipseNodeComponentImpl({ node }: Props) {
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
      <g
        transform={node.wrapper.transform}
        opacity={node.wrapper.opacity}
        filter={node.wrapper.filterAttr}
      >
        {formatRenderDefs(node.defs)}
        {ellipseEl}
      </g>
    );
  }

  return ellipseEl;
}

export const RenderEllipseNodeComponent = memo(RenderEllipseNodeComponentImpl);
