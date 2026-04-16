/**
 * @file Path node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderPathNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { MultiFillPathLayers } from "../primitives/multi-fill";
import { getUniformStrokeAttrs, StrokeRenderingElements } from "../primitives/stroke-rendering";

type Props = { readonly node: RenderPathNode };

function RenderPathNodeComponentImpl({ node }: Props) {
  if (node.paths.length === 0) { return null; }

  const sr = node.strokeRendering;
  const uniformStroke = getUniformStrokeAttrs(sr);

  if (node.fillLayers || sr) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers
          ? <MultiFillPathLayers layers={node.fillLayers} paths={node.paths} stroke={uniformStroke} />
          : node.paths.map((p, i) => {
              const fa = p.fillOverride ?? node.fill;
              return <path key={i} d={p.d} fillRule={p.fillRule} fill={fa.attrs.fill} fillOpacity={fa.attrs.fillOpacity} {...(uniformStroke ?? {})} />;
            })
        }
        {sr && <StrokeRenderingElements sr={sr} />}
      </ShapeShell>
    );
  }

  const pathElements = node.paths.map((p, i) => {
    const fa = p.fillOverride ?? node.fill;
    return <path key={i} d={p.d} fillRule={p.fillRule} fill={fa.attrs.fill} fillOpacity={fa.attrs.fillOpacity} {...(uniformStroke ?? {})} />;
  });

  if (node.needsWrapper) {
    return <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>{pathElements}</ShapeShell>;
  }
  return pathElements[0];
}

export const RenderPathNodeComponent = memo(RenderPathNodeComponentImpl);
