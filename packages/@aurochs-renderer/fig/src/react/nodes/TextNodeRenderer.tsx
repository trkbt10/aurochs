/**
 * @file Text node React renderer
 *
 * Renders text as:
 * 1. Glyph path contours (when available) — high-fidelity outlines
 * 2. SVG <text> elements via TextLineLayout — browser renders with system fonts
 */

import { memo } from "react";
import type { TextNode } from "../../scene-graph/types";
import { useFigSvgDefs } from "../context/FigSvgDefsContext";
import { resolveEffectsFilter } from "../primitives/effects";
import { matrixToSvgTransform, colorToHex, contourToSvgD } from "../../scene-graph/render";
import { FigTextLines } from "./FigTextLines";

type Props = {
  readonly node: TextNode;
};

function TextNodeRendererImpl({ node }: Props) {
  const ids = useFigSvgDefs();
  const transformStr = matrixToSvgTransform(node.transform);
  const effectsResult = resolveEffectsFilter(node.effects, ids);
  const fillColor = colorToHex(node.fill.color);
  const fillOpacity = node.fill.opacity;

  // Priority 1: Glyph contours (pre-outlined paths)
  if (node.glyphContours && node.glyphContours.length > 0) {
    const allD: string[] = [];
    for (const contour of node.glyphContours) {
      allD.push(contourToSvgD(contour));
    }
    if (node.decorationContours) {
      for (const contour of node.decorationContours) {
        allD.push(contourToSvgD(contour));
      }
    }

    const pathEl = (
      <path
        d={allD.join("")}
        fill={fillColor}
        fillOpacity={fillOpacity < 1 ? fillOpacity : undefined}
      />
    );

    if (transformStr || node.opacity < 1 || effectsResult) {
      return (
        <g
          transform={transformStr}
          opacity={node.opacity < 1 ? node.opacity : undefined}
          filter={effectsResult?.filterAttr}
        >
          {effectsResult?.defElement && <defs>{effectsResult.defElement}</defs>}
          {pathEl}
        </g>
      );
    }
    return pathEl;
  }

  // Priority 2: SVG <text> elements via shared FigTextLines component
  if (!node.textLineLayout || node.textLineLayout.lines.length === 0) {
    return null;
  }

  const textContent = (
    <FigTextLines
      textLineLayout={node.textLineLayout}
      fill={fillColor}
      fillOpacity={fillOpacity}
    />
  );

  if (transformStr || node.opacity < 1 || effectsResult || node.textLineLayout.lines.length > 1) {
    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
        filter={effectsResult?.filterAttr}
      >
        {effectsResult?.defElement && <defs>{effectsResult.defElement}</defs>}
        {textContent}
      </g>
    );
  }

  return textContent;
}

export const TextNodeRenderer = memo(TextNodeRendererImpl);
