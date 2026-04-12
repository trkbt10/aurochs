/**
 * @file Group node React renderer
 */

import { memo } from "react";
import type { GroupNode } from "../../scene-graph/types";
import { matrixToSvgTransform } from "../primitives/transform";
import { SceneNodeRenderer } from "./SceneNodeRenderer";

type Props = {
  readonly node: GroupNode;
};

function GroupNodeRendererImpl({ node }: Props) {
  const transformStr = matrixToSvgTransform(node.transform);

  const children = node.children.map((child) => (
    <SceneNodeRenderer key={child.id} node={child} />
  ));

  // Optimization: unwrap single child if no transform/opacity needed
  if (!transformStr && node.opacity >= 1 && children.length === 1) {
    return <>{children[0]}</>;
  }

  return (
    <g
      transform={transformStr}
      opacity={node.opacity < 1 ? node.opacity : undefined}
    >
      {children}
    </g>
  );
}

export const GroupNodeRenderer = memo(GroupNodeRendererImpl);
