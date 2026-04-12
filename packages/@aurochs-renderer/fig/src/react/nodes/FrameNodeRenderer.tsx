/**
 * @file Frame node React renderer
 *
 * Renders frame background, optional clip path, and children.
 */

import { memo, type ReactNode } from "react";
import type { FrameNode, SceneNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveFillAttrs } from "../primitives/fill";
import { resolveStrokeAttrs } from "../primitives/stroke";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform } from "../primitives/transform";
import { SceneNodeRenderer } from "./SceneNodeRenderer";

type Props = {
  readonly node: FrameNode;
};

type DefsApi = {
  readonly getNextId: (prefix: string) => string;
  readonly addDef: (id: string, content: ReactNode) => void;
};

/**
 * Clamp corner radius to ensure circular corners (Figma behaviour).
 * SVG clamps rx/ry independently; Figma uses min(width, height) / 2.
 */
function clampRadius(
  radius: number | undefined,
  width: number,
  height: number,
): number | undefined {
  if (!radius || radius <= 0) {
    return undefined;
  }
  return Math.min(radius, Math.min(width, height) / 2);
}

function renderBackground(
  node: FrameNode,
  defs: DefsApi,
  clampedRadius: number | undefined,
): ReactNode {
  if (node.fills.length === 0) {
    return null;
  }
  const topFill = node.fills[node.fills.length - 1];
  const fillAttrs = resolveFillAttrs(topFill, defs);
  const strokeAttrs = node.stroke ? resolveStrokeAttrs(node.stroke) : {};
  return (
    <rect
      x={0}
      y={0}
      width={node.width}
      height={node.height}
      rx={clampedRadius}
      ry={clampedRadius}
      fill={fillAttrs.fill}
      fillOpacity={fillAttrs.fillOpacity}
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
  readonly defs: DefsApi;
};

function renderChildren({
  children,
  clipsContent,
  width,
  height,
  clampedRadius,
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

  const clipId = defs.getNextId("clip");
  defs.addDef(
    clipId,
    <clipPath id={clipId}>
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
  const defs = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = resolveEffectsFilter(node.effects, defs);
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  const bgRect = renderBackground(node, defs, clampedRadius);
  const childrenContent = renderChildren({
    children: node.children,
    clipsContent: node.clipsContent,
    width: node.width,
    height: node.height,
    clampedRadius,
    defs,
  });

  return (
    <g
      transform={transformStr}
      opacity={node.opacity < 1 ? node.opacity : undefined}
      filter={filterAttr}
    >
      {bgRect}
      {childrenContent}
    </g>
  );
}

export const FrameNodeRenderer = memo(FrameNodeRendererImpl);
