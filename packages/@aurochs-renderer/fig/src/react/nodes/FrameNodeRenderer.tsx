/**
 * @file Frame node React renderer
 *
 * Renders frame background, optional clip path, and children.
 * All defs (gradients, filters, clip paths) are rendered inline.
 */

import { memo, type ReactNode } from "react";
import type { FrameNode, SceneNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import type { FigSvgIdGenerator } from "../context/FigSvgDefsContext";
import { resolveFillAttrs, type FillResult } from "../primitives/fill";
import { resolveStroke, matrixToSvgTransform } from "../../scene-graph/render";
import { resolveEffectsFilter } from "../primitives/effects";
import { SceneNodeRenderer } from "./SceneNodeRenderer";

type Props = {
  readonly node: FrameNode;
};

/**
 * Clamp corner radius to ensure circular corners (Figma behaviour).
 * SVG clamps rx/ry independently; Figma uses min(width, height) / 2.
 */
function clampRadius(
  radius: number | readonly [number, number, number, number] | undefined,
  width: number,
  height: number,
): number | undefined {
  if (radius === undefined) { return undefined; }
  const r = typeof radius === "number" ? radius : (radius[0] + radius[1] + radius[2] + radius[3]) / 4;
  if (r <= 0) { return undefined; }
  return Math.min(r, Math.min(width, height) / 2);
}

function renderBackground(
  node: FrameNode,
  fillResult: FillResult,
  clampedRadius: number | undefined,
): ReactNode {
  if (node.fills.length === 0) {
    return null;
  }
  const strokeAttrs = node.stroke ? resolveStroke(node.stroke) : {};
  return (
    <rect
      x={0}
      y={0}
      width={node.width}
      height={node.height}
      rx={clampedRadius}
      ry={clampedRadius}
      fill={fillResult.fill}
      fillOpacity={fillResult.fillOpacity}
      {...strokeAttrs}
    />
  );
}

type RenderChildrenParams = {
  readonly children: readonly SceneNode[];
  readonly clipsContent: boolean;
  readonly width: number;
  readonly height: number;
  readonly clampedRadius: number | undefined;
  readonly ids: FigSvgIdGenerator;
  readonly defs: ReactNode[];
};

function renderChildren({
  children,
  clipsContent,
  width,
  height,
  clampedRadius,
  ids,
  defs,
}: RenderChildrenParams): ReactNode {
  const childElements = children.map((child) => (
    <SceneNodeRenderer key={child.id} node={child} />
  ));

  if (childElements.length === 0) {
    return null;
  }

  if (!clipsContent) {
    return <>{childElements}</>;
  }

  const clipId = ids.getNextId("clip");
  defs.push(
    <clipPath key={clipId} id={clipId}>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={clampedRadius}
        ry={clampedRadius}
      />
    </clipPath>,
  );
  return <g clipPath={`url(#${clipId})`}>{childElements}</g>;
}

function FrameNodeRendererImpl({ node }: Props) {
  const ids = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const effectsResult = resolveEffectsFilter(node.effects, ids);
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  // Resolve fill for background
  const lastFill = node.fills.length > 0 ? node.fills[node.fills.length - 1] : undefined;
  const fillResult: FillResult = lastFill ? resolveFillAttrs(lastFill, ids) : { fill: "none" };

  // Collect inline defs
  const defs: ReactNode[] = [];
  if (fillResult.defElement) {defs.push(fillResult.defElement);}
  if (effectsResult?.defElement) {defs.push(effectsResult.defElement);}

  const bgRect = renderBackground(node, fillResult, clampedRadius);
  const childrenContent = renderChildren({
    children: node.children,
    clipsContent: node.clipsContent,
    width: node.width,
    height: node.height,
    clampedRadius,
    ids,
    defs, // clip path defs will be added here
  });

  return (
    <g
      transform={transformStr}
      opacity={node.opacity < 1 ? node.opacity : undefined}
      filter={effectsResult?.filterAttr}
    >
      {defs.length > 0 && <defs>{defs}</defs>}
      {bgRect}
      {childrenContent}
    </g>
  );
}

export const FrameNodeRenderer = memo(FrameNodeRendererImpl);
