/**
 * @file Group node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderGroupNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderNodeComponent } from "./RenderNodeComponent";

type Props = {
  readonly node: RenderGroupNode;
};

function RenderGroupNodeComponentImpl({ node }: Props) {
  const children = node.children.map((child) => (
    <RenderNodeComponent key={child.id} node={child} />
  ));

  // Optimization: unwrap single child if no wrapper attrs needed
  if (node.canUnwrapSingleChild && children.length === 1 && node.defs.length === 0) {
    return <>{children[0]}</>;
  }

  return (
    <g
      transform={node.wrapper.transform}
      opacity={node.wrapper.opacity}
      filter={node.wrapper.filterAttr}
    >
      {formatRenderDefs(node.defs)}
      {children}
    </g>
  );
}

export const RenderGroupNodeComponent = memo(RenderGroupNodeComponentImpl);
