/**
 * @file Rectangle node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderRectNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { RectShape } from "../primitives/rect-shape";
import { MultiFillRectLayers } from "../primitives/multi-fill";
import { getRectStrokeAttrs, RectStrokeElements } from "../primitives/stroke-rendering";

type Props = {
  readonly node: RenderRectNode;
};

function RenderRectNodeComponentImpl({ node }: Props) {
  const sr = node.strokeRendering;
  const uniformStrokeAttrs = getRectStrokeAttrs(sr);

  if (node.fillLayers || sr) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers ? (
          <MultiFillRectLayers
            layers={node.fillLayers}
            width={node.width}
            height={node.height}
            cornerRadius={node.cornerRadius}
            stroke={uniformStrokeAttrs}
          />
        ) : (
          <RectShape
            width={node.width}
            height={node.height}
            cornerRadius={node.cornerRadius}
            fill={node.fill.attrs.fill}
            fillOpacity={node.fill.attrs.fillOpacity}
            {...(uniformStrokeAttrs ?? {})}
          />
        )}
        {sr && <RectStrokeElements rendering={sr} width={node.width} height={node.height} cornerRadius={node.cornerRadius} />}
      </ShapeShell>
    );
  }

  const rectEl = (
    <RectShape
      width={node.width}
      height={node.height}
      cornerRadius={node.cornerRadius}
      fill={node.fill.attrs.fill}
      fillOpacity={node.fill.attrs.fillOpacity}
      {...(uniformStrokeAttrs ?? {})}
    />
  );

  if (node.needsWrapper) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {rectEl}
      </ShapeShell>
    );
  }

  return rectEl;
}

export const RenderRectNodeComponent = memo(RenderRectNodeComponentImpl);
