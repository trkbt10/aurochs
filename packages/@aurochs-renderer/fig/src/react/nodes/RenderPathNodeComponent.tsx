/**
 * @file Path node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderPathNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";

type Props = {
  readonly node: RenderPathNode;
};

function RenderPathNodeComponentImpl({ node }: Props) {
  if (node.paths.length === 0) {
    return null;
  }

  const pathElements = node.paths.map((p, i) => (
    <path
      key={i}
      d={p.d}
      fillRule={p.fillRule}
      fill={node.fill.attrs.fill}
      fillOpacity={node.fill.attrs.fillOpacity}
      {...(node.stroke ?? {})}
    />
  ));

  if (node.needsWrapper) {
    return (
      <g
        transform={node.wrapper.transform}
        opacity={node.wrapper.opacity}
        filter={node.wrapper.filterAttr}
      >
        {formatRenderDefs(node.defs)}
        {pathElements}
      </g>
    );
  }

  return pathElements[0];
}

export const RenderPathNodeComponent = memo(RenderPathNodeComponentImpl);
