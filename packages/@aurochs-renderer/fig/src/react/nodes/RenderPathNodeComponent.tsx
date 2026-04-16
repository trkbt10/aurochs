/**
 * @file Path node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderPathNode } from "../../scene-graph/render-tree";
import { ShapeShell } from "../primitives/shape-shell";
import { MultiFillPathLayers, MultiStrokePathLayers } from "../primitives/multi-fill";

type Props = {
  readonly node: RenderPathNode;
};

function RenderPathNodeComponentImpl({ node }: Props) {
  if (node.paths.length === 0) {
    return null;
  }

  if (node.fillLayers || node.strokeLayers) {
    const strokeForFill = node.strokeLayers ? undefined : node.stroke;
    return (
      <ShapeShell wrapper={node.wrapper} defs={node.defs} backgroundBlur={node.backgroundBlur} mask={node.mask}>
        {node.fillLayers ? (
          <MultiFillPathLayers
            layers={node.fillLayers}
            paths={node.paths}
            stroke={strokeForFill}
          />
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
                {...(strokeForFill ?? {})}
              />
            );
          })
        )}
        {node.strokeLayers && (
          <MultiStrokePathLayers
            layers={node.strokeLayers}
            paths={node.paths}
          />
        )}
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
        {...(node.stroke ?? {})}
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
