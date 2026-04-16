/**
 * @file Ellipse node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderEllipseNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { getEllipseStrokeAttrs, EllipseStrokeElements } from "../primitives/stroke-rendering";

type Props = {
  readonly node: RenderEllipseNode;
};

function RenderEllipseNodeComponentImpl({ node }: Props) {
  const sr = node.strokeRendering;
  const uniformStrokeAttrs = getEllipseStrokeAttrs(sr);
  const isCircle = node.rx === node.ry;

  if (node.fillLayers || sr) {
    const fillAttrs = { fill: node.fill.attrs.fill, fillOpacity: node.fill.attrs.fillOpacity };
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers ? (
          // Multi-fill layers render individual elements per layer
          node.fillLayers.map((layer, i) =>
            isCircle ? (
              <circle key={i} cx={node.cx} cy={node.cy} r={node.rx} fill={layer.attrs.fill} fillOpacity={layer.attrs.fillOpacity}
                style={layer.blendMode ? { mixBlendMode: layer.blendMode as React.CSSProperties["mixBlendMode"] } : undefined}
                {...(i === node.fillLayers!.length - 1 ? (uniformStrokeAttrs ?? {}) : {})}
              />
            ) : (
              <ellipse key={i} cx={node.cx} cy={node.cy} rx={node.rx} ry={node.ry} fill={layer.attrs.fill} fillOpacity={layer.attrs.fillOpacity}
                style={layer.blendMode ? { mixBlendMode: layer.blendMode as React.CSSProperties["mixBlendMode"] } : undefined}
                {...(i === node.fillLayers!.length - 1 ? (uniformStrokeAttrs ?? {}) : {})}
              />
            ),
          )
        ) : isCircle ? (
          <circle cx={node.cx} cy={node.cy} r={node.rx} {...fillAttrs} {...(uniformStrokeAttrs ?? {})} />
        ) : (
          <ellipse cx={node.cx} cy={node.cy} rx={node.rx} ry={node.ry} {...fillAttrs} {...(uniformStrokeAttrs ?? {})} />
        )}
        {sr && <EllipseStrokeElements rendering={sr} cx={node.cx} cy={node.cy} rx={node.rx} ry={node.ry} />}
      </ShapeShell>
    );
  }

  const fillAttrs = { fill: node.fill.attrs.fill, fillOpacity: node.fill.attrs.fillOpacity };
  const ellipseEl = isCircle ? (
    <circle cx={node.cx} cy={node.cy} r={node.rx} {...fillAttrs} {...(uniformStrokeAttrs ?? {})} />
  ) : (
    <ellipse cx={node.cx} cy={node.cy} rx={node.rx} ry={node.ry} {...fillAttrs} {...(uniformStrokeAttrs ?? {})} />
  );

  if (node.needsWrapper) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {ellipseEl}
      </ShapeShell>
    );
  }

  return ellipseEl;
}

export const RenderEllipseNodeComponent = memo(RenderEllipseNodeComponentImpl);
