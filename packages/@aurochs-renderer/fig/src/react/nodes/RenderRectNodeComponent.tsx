/**
 * @file Rectangle node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderRectNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { RectShape } from "../primitives/rect-shape";
import { MultiFillRectLayers } from "../primitives/multi-fill";
import { getUniformStrokeAttrs, StrokeRenderingElements } from "../primitives/stroke-rendering";

type Props = { readonly node: RenderRectNode };

function RenderRectNodeComponentImpl({ node }: Props) {
  const sr = node.strokeRendering;
  const uniformStroke = getUniformStrokeAttrs(sr);

  if (node.fillLayers || sr) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers
          ? <MultiFillRectLayers layers={node.fillLayers} width={node.width} height={node.height} cornerRadius={node.cornerRadius} stroke={uniformStroke} />
          : <RectShape width={node.width} height={node.height} cornerRadius={node.cornerRadius} fill={node.fill.attrs.fill} fillOpacity={node.fill.attrs.fillOpacity} {...(uniformStroke ?? {})} />
        }
        {sr && <StrokeRenderingElements sr={sr} />}
      </ShapeShell>
    );
  }

  const rectEl = <RectShape width={node.width} height={node.height} cornerRadius={node.cornerRadius} fill={node.fill.attrs.fill} fillOpacity={node.fill.attrs.fillOpacity} {...(uniformStroke ?? {})} />;

  if (node.needsWrapper) {
    return <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>{rectEl}</ShapeShell>;
  }
  return rectEl;
}

export const RenderRectNodeComponent = memo(RenderRectNodeComponentImpl);
