/**
 * @file Frame node React formatter (from RenderTree)
 */

import { memo, type ReactNode } from "react";
import type { RenderFrameNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderWrapper } from "../primitives/wrapper";
import { RectShape } from "../primitives/rect-shape";
import { MultiFillRectLayers, MultiStrokeRectLayers } from "../primitives/multi-fill";
import { BackgroundBlurElement } from "../primitives/background-blur";
import { MaskedRectStroke, IndividualStrokeLines } from "../primitives/stroke-rendering";
import { RenderNodeComponent } from "./RenderNodeComponent";

type Props = {
  readonly node: RenderFrameNode;
};

function RenderFrameNodeComponentImpl({ node }: Props) {
  const defsEl = formatRenderDefs(node.defs);

  // Background rect (multi-paint layers or single fill + stroke layers)
  let bgRect: ReactNode = null;
  let bgStrokeLayers: ReactNode = null;
  let bgStrokeMasked: ReactNode = null;
  let bgIndividualStrokes: ReactNode = null;
  if (node.background) {
    // When strokeMaskId is set, stroke is rendered separately under a mask
    const hasStrokeMask = !!node.background.strokeMaskId;
    const strokeForFill = (node.background.strokeLayers || hasStrokeMask)
      ? undefined
      : node.background.stroke;

    if (node.background.fillLayers) {
      bgRect = (
        <MultiFillRectLayers
          layers={node.background.fillLayers}
          width={node.width}
          height={node.height}
          cornerRadius={node.cornerRadius}
          stroke={strokeForFill}
        />
      );
    } else {
      const { fill } = node.background;
      bgRect = (
        <RectShape
          width={node.width}
          height={node.height}
          cornerRadius={node.cornerRadius}
          fill={fill.attrs.fill}
          fillOpacity={fill.attrs.fillOpacity}
          {...(strokeForFill ?? {})}
        />
      );
    }

    // Stroke rendering: masked (INSIDE/OUTSIDE), multi-layer, or individual
    if (hasStrokeMask && node.background.stroke) {
      bgStrokeMasked = (
        <MaskedRectStroke
          maskId={node.background.strokeMaskId!}
          stroke={node.background.stroke}
          width={node.width}
          height={node.height}
          cornerRadius={node.cornerRadius}
        />
      );
    } else if (node.background.strokeLayers) {
      bgStrokeLayers = (
        <MultiStrokeRectLayers
          layers={node.background.strokeLayers}
          width={node.width}
          height={node.height}
          cornerRadius={node.cornerRadius}
        />
      );
    }

    if (node.background.individualStrokes) {
      bgIndividualStrokes = (
        <IndividualStrokeLines
          strokes={node.background.individualStrokes}
          width={node.width}
          height={node.height}
        />
      );
    }
  }

  // Children
  const childElements = node.children.map((child) => (
    <RenderNodeComponent key={child.id} node={child} />
  ));

  let childrenContent: ReactNode;
  if (node.childClipId && childElements.length > 0) {
    childrenContent = (
      <g clipPath={`url(#${node.childClipId})`}>
        {childElements}
      </g>
    );
  } else {
    childrenContent = <>{childElements}</>;
  }

  return (
    <RenderWrapper wrapper={node.wrapper} mask={node.mask}>
      {defsEl}
      {bgRect}
      {bgStrokeMasked}
      {bgStrokeLayers}
      {bgIndividualStrokes}
      {node.backgroundBlur && <BackgroundBlurElement blur={node.backgroundBlur} />}
      {childrenContent}
    </RenderWrapper>
  );
}

export const RenderFrameNodeComponent = memo(RenderFrameNodeComponentImpl);
