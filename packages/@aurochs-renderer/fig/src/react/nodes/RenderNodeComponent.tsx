/**
 * @file Render node dispatcher component
 *
 * Routes each RenderNode to the appropriate type-specific formatter.
 * RenderNodes are pre-resolved — no attribute computation here.
 */

import { memo } from "react";
import type { RenderNode } from "../../scene-graph/render-tree";
import { RenderGroupNodeComponent } from "./RenderGroupNodeComponent";
import { RenderFrameNodeComponent } from "./RenderFrameNodeComponent";
import { RenderRectNodeComponent } from "./RenderRectNodeComponent";
import { RenderEllipseNodeComponent } from "./RenderEllipseNodeComponent";
import { RenderPathNodeComponent } from "./RenderPathNodeComponent";
import { RenderTextNodeComponent } from "./RenderTextNodeComponent";
import { RenderImageNodeComponent } from "./RenderImageNodeComponent";

type Props = {
  readonly node: RenderNode;
};

function RenderNodeComponentImpl({ node }: Props) {
  switch (node.type) {
    case "group":
      return <RenderGroupNodeComponent node={node} />;
    case "frame":
      return <RenderFrameNodeComponent node={node} />;
    case "rect":
      return <RenderRectNodeComponent node={node} />;
    case "ellipse":
      return <RenderEllipseNodeComponent node={node} />;
    case "path":
      return <RenderPathNodeComponent node={node} />;
    case "text":
      return <RenderTextNodeComponent node={node} />;
    case "image":
      return <RenderImageNodeComponent node={node} />;
  }
}

export const RenderNodeComponent = memo(RenderNodeComponentImpl);
