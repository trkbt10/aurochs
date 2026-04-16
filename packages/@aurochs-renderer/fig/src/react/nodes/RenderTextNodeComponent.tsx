/**
 * @file Text node React formatter (from RenderTree)
 */

import { memo, type ReactNode } from "react";
import type { RenderTextNode } from "../../scene-graph/render-tree";
import { formatRenderDefs } from "../primitives/render-defs";
import { RenderWrapper } from "../primitives/wrapper";
import { FigTextLines } from "./FigTextLines";

type Props = {
  readonly node: RenderTextNode;
};

/** Wrap content in <a> if hyperlink is present */
function wrapHyperlink(content: ReactNode, href: string | undefined): ReactNode {
  if (!href) { return content; }
  return <a href={href}>{content}</a>;
}

function RenderTextNodeComponentImpl({ node }: Props) {
  const defsEl = formatRenderDefs(node.defs);

  // Glyph contours (pre-outlined paths)
  if (node.content.mode === "glyphs") {
    if (node.content.d === "") {
      return null;
    }

    let glyphContent: ReactNode = (
      <path
        d={node.content.d}
        fill={node.fillColor}
        fillOpacity={node.fillOpacity}
      />
    );
    glyphContent = wrapHyperlink(glyphContent, node.hyperlink);

    return (
      <RenderWrapper wrapper={node.wrapper} mask={node.mask}>
        {defsEl}
        {node.textClipId
          ? <g clipPath={`url(#${node.textClipId})`}>{glyphContent}</g>
          : glyphContent}
      </RenderWrapper>
    );
  }

  // Text line layout: <text> elements
  if (node.content.layout.lines.length === 0) {
    return null;
  }

  let textContent: ReactNode = (
    <FigTextLines
      textLineLayout={node.content.layout}
      fill={node.fillColor}
      fillOpacity={node.fillOpacity}
    />
  );
  textContent = wrapHyperlink(textContent, node.hyperlink);

  return (
    <RenderWrapper wrapper={node.wrapper} mask={node.mask}>
      {defsEl}
      {node.textClipId
        ? <g clipPath={`url(#${node.textClipId})`}>{textContent}</g>
        : textContent}
    </RenderWrapper>
  );
}

export const RenderTextNodeComponent = memo(RenderTextNodeComponentImpl);
