/**
 * @file Image node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderImageNode } from "../../scene-graph/render-tree";

type Props = {
  readonly node: RenderImageNode;
};

function RenderImageNodeComponentImpl({ node }: Props) {
  if (!node.dataUri) {
    return null;
  }

  const imageEl = (
    <image
      href={node.dataUri}
      x={0}
      y={0}
      width={node.width}
      height={node.height}
      preserveAspectRatio="xMidYMid slice"
    />
  );

  if (node.needsWrapper) {
    return (
      <g
        transform={node.wrapper.transform}
        opacity={node.wrapper.opacity}
      >
        {imageEl}
      </g>
    );
  }

  return imageEl;
}

export const RenderImageNodeComponent = memo(RenderImageNodeComponentImpl);
