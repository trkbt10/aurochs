/**
 * @file Frame node React formatter (from RenderTree)
 */

import { memo, type ReactNode } from "react";
import type { RenderFrameNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderNodeComponent } from "./RenderNodeComponent";

type Props = {
  readonly node: RenderFrameNode;
};

function RenderFrameNodeComponentImpl({ node }: Props) {
  const defsEl = formatRenderDefs(node.defs);

  // Background rect
  let bgRect: ReactNode = null;
  if (node.background) {
    const { fill, stroke } = node.background;
    bgRect = (
      <rect
        x={0}
        y={0}
        width={node.width}
        height={node.height}
        rx={node.cornerRadius}
        ry={node.cornerRadius}
        fill={fill.attrs.fill}
        fillOpacity={fill.attrs.fillOpacity}
        {...(stroke ?? {})}
      />
    );
  }

  // Children
  const childElements = node.children.map((child) => (
    <RenderNodeComponent key={child.id} node={child} />
  ));

  let childrenContent: ReactNode;
  if (node.childClipId && childElements.length > 0) {
    childrenContent = (
      <g clipPath={`url(#${node.childClipId})`}>
        {childElements}
      </g>
    );
  } else {
    childrenContent = <>{childElements}</>;
  }

  return (
    <g
      transform={node.wrapper.transform}
      opacity={node.wrapper.opacity}
      filter={node.wrapper.filterAttr}
    >
      {defsEl}
      {bgRect}
      {childrenContent}
    </g>
  );
}

export const RenderFrameNodeComponent = memo(RenderFrameNodeComponentImpl);
