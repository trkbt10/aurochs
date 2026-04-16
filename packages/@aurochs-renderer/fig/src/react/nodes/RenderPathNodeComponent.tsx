/**
 * @file Path node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderPathNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { getPathStrokeAttrs, PathStrokeElements } from "../primitives/stroke-rendering";

type Props = {
  readonly node: RenderPathNode;
};

function RenderPathNodeComponentImpl({ node }: Props) {
  if (node.paths.length === 0) {
    return null;
  }

  const sr = node.strokeRendering;
  const uniformStrokeAttrs = getPathStrokeAttrs(sr);

  if (node.fillLayers || sr) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers ? (
          node.fillLayers.map((layer, i) =>
            node.paths.map((p, j) => (
              <path
                key={`${i}-${j}`}
                d={p.d}
                fillRule={p.fillRule}
                fill={layer.attrs.fill}
                fillOpacity={layer.attrs.fillOpacity}
                style={layer.blendMode ? { mixBlendMode: layer.blendMode as React.CSSProperties["mixBlendMode"] } : undefined}
                {...(i === node.fillLayers!.length - 1 ? (uniformStrokeAttrs ?? {}) : {})}
              />
            )),
          )
        ) : (
          node.paths.map((p, i) => {
            const fa = p.fillOverride ?? node.fill;
            return (
              <path
                key={i}
                d={p.d}
                fillRule={p.fillRule}
                fill={fa.attrs.fill}
                fillOpacity={fa.attrs.fillOpacity}
                {...(uniformStrokeAttrs ?? {})}
              />
            );
          })
        )}
        {sr && <PathStrokeElements rendering={sr} paths={node.paths} />}
      </ShapeShell>
    );
  }

  const pathElements = node.paths.map((p, i) => {
    const fa = p.fillOverride ?? node.fill;
    return (
      <path
        key={i}
        d={p.d}
        fillRule={p.fillRule}
        fill={fa.attrs.fill}
        fillOpacity={fa.attrs.fillOpacity}
        {...(uniformStrokeAttrs ?? {})}
      />
    );
  });

  if (node.needsWrapper) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {pathElements}
      </ShapeShell>
    );
  }

  return pathElements[0];
}

export const RenderPathNodeComponent = memo(RenderPathNodeComponentImpl);
