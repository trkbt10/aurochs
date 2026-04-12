/**
 * @file Scene node dispatcher component
 *
 * Routes each SceneNode to the appropriate type-specific renderer.
 */

import { memo } from "react";
import type { SceneNode } from "../../scene-graph/types";
import { GroupNodeRenderer } from "./GroupNodeRenderer";
import { FrameNodeRenderer } from "./FrameNodeRenderer";
import { RectNodeRenderer } from "./RectNodeRenderer";
import { EllipseNodeRenderer } from "./EllipseNodeRenderer";
import { PathNodeRenderer } from "./PathNodeRenderer";
import { TextNodeRenderer } from "./TextNodeRenderer";
import { ImageNodeRenderer } from "./ImageNodeRenderer";

type Props = {
  readonly node: SceneNode;
};

function SceneNodeRendererImpl({ node }: Props) {
  if (!node.visible) {
    return null;
  }

  switch (node.type) {
    case "group":
      return <GroupNodeRenderer node={node} />;
    case "frame":
      return <FrameNodeRenderer node={node} />;
    case "rect":
      return <RectNodeRenderer node={node} />;
    case "ellipse":
      return <EllipseNodeRenderer node={node} />;
    case "path":
      return <PathNodeRenderer node={node} />;
    case "text":
      return <TextNodeRenderer node={node} />;
    case "image":
      return <ImageNodeRenderer node={node} />;
  }
}

export const SceneNodeRenderer = memo(SceneNodeRendererImpl);
