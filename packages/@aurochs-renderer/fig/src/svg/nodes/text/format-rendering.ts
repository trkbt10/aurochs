/**
 * @file Format a resolved TextRendering to SVG.
 *
 * This is the single SVG-specific transducer from the shared `TextRendering`
 * SoT (src/text/rendering) to SvgString. Direct-SVG and scene-graph SVG
 * paths both funnel through here.
 */

import type { TextRendering } from "../../../text/rendering";
import type { PathContour } from "../../../text/paths/types";
import { path as svgPath, text, g, type SvgString, EMPTY_SVG } from "../../primitives";
import { buildTransformAttr } from "../../transform";
import { buildTextAttrs } from "./attrs";

/** Default floating-point precision for path coordinate emission. */
const PATH_PRECISION = 5;

function roundTo(n: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
}

/** Serialize a set of contours to a single SVG `d` string. */
function contoursToPathD(contours: readonly PathContour[], precision: number): string {
  const r = (n: number | undefined): string => roundTo(n ?? 0, precision).toString();
  const parts: string[] = [];
  for (const c of contours) {
    for (const cmd of c.commands) {
      switch (cmd.type) {
        case "M":
          parts.push(`M${r(cmd.x)} ${r(cmd.y)}`);
          break;
        case "L":
          parts.push(`L${r(cmd.x)} ${r(cmd.y)}`);
          break;
        case "C":
          parts.push(`C${r(cmd.x1)} ${r(cmd.y1)} ${r(cmd.x2)} ${r(cmd.y2)} ${r(cmd.x)} ${r(cmd.y)}`);
          break;
        case "Q":
          parts.push(`Q${r(cmd.x1)} ${r(cmd.y1)} ${r(cmd.x)} ${r(cmd.y)}`);
          break;
        case "Z":
          parts.push("Z");
          break;
      }
    }
  }
  return parts.join("");
}

/** Wrap rendered text body in a group when transform/opacity is present. */
function wrapGroup(body: SvgString, transform: string | undefined, opacity: number): SvgString {
  if (!transform && opacity >= 1) {
    return body;
  }
  return g(
    {
      transform: transform || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    body,
  );
}

/**
 * Format a resolved `TextRendering` into a backend-agnostic SvgString.
 *
 * - `empty`  → EMPTY_SVG (no output)
 * - `glyphs` → combined `<path>` with all glyph + decoration contours
 * - `lines`  → one or more `<text>` elements per line, via `buildTextAttrs`
 */
export function formatTextRenderingToSvg(rendering: TextRendering): SvgString {
  if (rendering.kind === "empty") {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(rendering.transform);

  if (rendering.kind === "glyphs") {
    const glyphD = contoursToPathD(rendering.glyphContours, PATH_PRECISION);
    const decoD = contoursToPathD(rendering.decorationContours, PATH_PRECISION);
    const combined = glyphD + decoD;
    if (combined === "") {
      return EMPTY_SVG;
    }
    const pathEl = svgPath({
      d: combined,
      fill: rendering.fillColor,
      "fill-opacity": rendering.fillOpacity < 1 ? rendering.fillOpacity : undefined,
    });
    return wrapGroup(pathEl, transformStr, rendering.opacity);
  }

  // kind === "lines"
  const { layout, props, fillColor, fillOpacity } = rendering;
  if (layout.lines.length === 0) {
    return EMPTY_SVG;
  }

  const textAttrs = buildTextAttrs({
    props,
    fillColor,
    fillOpacity,
    lineCount: layout.lines.length,
  });

  if (layout.lines.length === 1) {
    const line = layout.lines[0];
    const el = text({ ...textAttrs, x: line.x, y: line.y }, line.text);
    return wrapGroup(el, transformStr, rendering.opacity);
  }

  const els: SvgString[] = layout.lines.map((line) =>
    text({ ...textAttrs, x: line.x, y: line.y }, line.text),
  );
  return wrapGroup(g({}, ...els), transformStr, rendering.opacity);
}
