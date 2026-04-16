/**
 * @file Group node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderGroupNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderWrapper } from "../primitives/wrapper";
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
    <RenderWrapper wrapper={node.wrapper} mask={node.mask}>
      {formatRenderDefs(node.defs)}
      {children}
    </RenderWrapper>
  );
}

export const RenderGroupNodeComponent = memo(RenderGroupNodeComponentImpl);
