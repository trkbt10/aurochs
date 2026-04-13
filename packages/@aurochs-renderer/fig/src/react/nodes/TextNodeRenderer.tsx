/**
 * @file Text node React renderer
 *
 * Renders text as:
 * 1. Glyph path contours (when available) — high-fidelity outlines
 * 2. SVG <text> elements via TextLineLayout — browser renders with system fonts
 *
 * When textAutoResize is NONE or TRUNCATE, the text is clipped to the
 * bounding box via a SVG clipPath (matching Figma's behavior).
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

  // Clip text to bounding box when textAutoResize is NONE or TRUNCATE
  const needsClip = node.textAutoResize === "NONE" || node.textAutoResize === "TRUNCATE";

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

    const clipId = needsClip ? ids.getNextId("text-clip") : undefined;

    return (
      <g
        transform={transformStr}
        opacity={node.opacity < 1 ? node.opacity : undefined}
        filter={effectsResult?.filterAttr}
      >
        {effectsResult?.defElement && <defs>{effectsResult.defElement}</defs>}
        {clipId && (
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={node.width} height={node.height} />
            </clipPath>
          </defs>
        )}
        {clipId ? <g clipPath={`url(#${clipId})`}>{pathEl}</g> : pathEl}
      </g>
    );
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

  const clipId = needsClip ? ids.getNextId("text-clip") : undefined;

  return (
    <g
      transform={transformStr}
      opacity={node.opacity < 1 ? node.opacity : undefined}
      filter={effectsResult?.filterAttr}
    >
      {effectsResult?.defElement && <defs>{effectsResult.defElement}</defs>}
      {clipId && (
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={node.width} height={node.height} />
          </clipPath>
        </defs>
      )}
      {clipId ? <g clipPath={`url(#${clipId})`}>{textContent}</g> : textContent}
    </g>
  );
}

export const TextNodeRenderer = memo(TextNodeRendererImpl);
