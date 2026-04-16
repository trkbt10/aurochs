/**
 * @file Ellipse node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderEllipseNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { MultiFillEllipseLayers } from "../primitives/multi-fill";
import { getUniformStrokeAttrs, StrokeRenderingElements } from "../primitives/stroke-rendering";

type Props = { readonly node: RenderEllipseNode };

function RenderEllipseNodeComponentImpl({ node }: Props) {
  const sr = node.strokeRendering;
  const uniformStroke = getUniformStrokeAttrs(sr);
  const isCircle = node.rx === node.ry;

  const fillAttrs = { fill: node.fill.attrs.fill, fillOpacity: node.fill.attrs.fillOpacity };
  const shapeEl = isCircle
    ? <circle cx={node.cx} cy={node.cy} r={node.rx} {...fillAttrs} {...(uniformStroke ?? {})} />
    : <ellipse cx={node.cx} cy={node.cy} rx={node.rx} ry={node.ry} {...fillAttrs} {...(uniformStroke ?? {})} />;

  if (node.fillLayers || sr) {
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers
          ? <MultiFillEllipseLayers layers={node.fillLayers} cx={node.cx} cy={node.cy} rx={node.rx} ry={node.ry} stroke={uniformStroke} />
          : shapeEl
        }
        {sr && <StrokeRenderingElements sr={sr} />}
      </ShapeShell>
    );
  }

  if (node.needsWrapper) {
    return <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>{shapeEl}</ShapeShell>;
  }
  return shapeEl;
}

export const RenderEllipseNodeComponent = memo(RenderEllipseNodeComponentImpl);
