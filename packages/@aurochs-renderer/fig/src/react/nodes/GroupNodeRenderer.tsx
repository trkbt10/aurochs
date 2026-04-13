/**
 * @file Group node React renderer
 */

import { memo } from "react";
import type { GroupNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform } from "../../scene-graph/render";
import { SceneNodeRenderer } from "./SceneNodeRenderer";

type Props = {
  readonly node: GroupNode;
};

function GroupNodeRendererImpl({ node }: Props) {
  const ids = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const effectsResult = resolveEffectsFilter(node.effects, ids);

  const children = node.children.map((child) => (
    <SceneNodeRenderer key={child.id} node={child} />
  ));

  // Optimization: unwrap single child if no transform/opacity/effects needed
  if (!transformStr && node.opacity >= 1 && !effectsResult && children.length === 1) {
    return <>{children[0]}</>;
  }

  return (
    <g
      transform={transformStr}
      opacity={node.opacity < 1 ? node.opacity : undefined}
      filter={effectsResult?.filterAttr}
    >
      {effectsResult?.defElement && <defs>{effectsResult.defElement}</defs>}
      {children}
    </g>
  );
}

export const GroupNodeRenderer = memo(GroupNodeRendererImpl);
