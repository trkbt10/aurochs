/**
 * @file Frame node React formatter (from RenderTree)
 */

import { memo, type ReactNode } from "react";
import type { RenderFrameNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderWrapper } from "../primitives/wrapper";
import { RectShape } from "../primitives/rect-shape";
import { MultiFillRectLayers } from "../primitives/multi-fill";
import { BackgroundBlurElement } from "../primitives/background-blur";
import { getRectStrokeAttrs, RectStrokeElements } from "../primitives/stroke-rendering";
import { RenderNodeComponent } from "./RenderNodeComponent";

type Props = {
  readonly node: RenderFrameNode;
};

function RenderFrameNodeComponentImpl({ node }: Props) {
  const defsEl = formatRenderDefs(node.defs);
  const sr = node.background?.strokeRendering;
  const uniformStrokeAttrs = getRectStrokeAttrs(sr);

  // Background rect
  let bgRect: ReactNode = null;
  if (node.background) {
    if (node.background.fillLayers) {
      bgRect = (
        <MultiFillRectLayers
          layers={node.background.fillLayers}
          width={node.width}
          height={node.height}
          cornerRadius={node.cornerRadius}
          stroke={uniformStrokeAttrs}
        />
      );
    } else {
      const { fill } = node.background;
      bgRect = (
        <RectShape
          width={node.width}
          height={node.height}
          cornerRadius={node.cornerRadius}
          fill={fill.attrs.fill}
          fillOpacity={fill.attrs.fillOpacity}
          {...(uniformStrokeAttrs ?? {})}
        />
      );
    }
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
    <RenderWrapper wrapper={node.wrapper} mask={node.mask}>
      {defsEl}
      {bgRect}
      {sr && <RectStrokeElements rendering={sr} width={node.width} height={node.height} cornerRadius={node.cornerRadius} />}
      {node.backgroundBlur && <BackgroundBlurElement blur={node.backgroundBlur} />}
      {childrenContent}
    </RenderWrapper>
  );
}

export const RenderFrameNodeComponent = memo(RenderFrameNodeComponentImpl);
