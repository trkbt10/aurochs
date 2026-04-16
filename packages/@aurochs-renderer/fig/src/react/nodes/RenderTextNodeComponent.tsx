/**
 * @file Text node React formatter (from RenderTree)
 */

import { memo } from "react";
import type { RenderTextNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderWrapper } from "../primitives/wrapper";
import { FigTextLines } from "./FigTextLines";

type Props = {
  readonly node: RenderTextNode;
};

function RenderTextNodeComponentImpl({ node }: Props) {
  const defsEl = formatRenderDefs(node.defs);

  // Glyph contours (pre-outlined paths)
  if (node.content.mode === "glyphs") {
    if (node.content.d === "") {
      return null;
    }

    const pathEl = (
      <path
        d={node.content.d}
        fill={node.fillColor}
        fillOpacity={node.fillOpacity}
      />
    );

    return (
      <RenderWrapper wrapper={node.wrapper}>
        {defsEl}
        {node.textClipId
          ? <g clipPath={`url(#${node.textClipId})`}>{pathEl}</g>
          : pathEl}
      </RenderWrapper>
    );
  }

  // Text line layout: <text> elements
  if (node.content.layout.lines.length === 0) {
    return null;
  }

  const textContent = (
    <FigTextLines
      textLineLayout={node.content.layout}
      fill={node.fillColor}
      fillOpacity={node.fillOpacity}
    />
  );

  return (
    <RenderWrapper wrapper={node.wrapper}>
      {defsEl}
      {node.textClipId
        ? <g clipPath={`url(#${node.textClipId})`}>{textContent}</g>
        : textContent}
    </RenderWrapper>
  );
}

export const RenderTextNodeComponent = memo(RenderTextNodeComponentImpl);
