/**
 * @file Text node rendering
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../../types";
import { text, g, type SvgString, EMPTY_SVG } from "../../primitives";
import { buildTransformAttr } from "../../transform";
import { extractTextProps } from "../../../text/layout/extract-props";
import { getFillColorAndOpacity } from "../../../text/layout/fill";
import { buildTextAttrs } from "./attrs";
import type { ExtractedTextProps } from "../../../text/layout/types";
import { createMeasurementProvider } from "../../../text/measure/provider";
import { breakLines } from "../../../text/measure/line-break";
import type { FontSpec } from "../../../text/measure/types";

/**
 * Shared measurement provider instance
 */
let measurementProvider: ReturnType<typeof createMeasurementProvider> | null = null;

function getMeasurementProvider() {
  if (!measurementProvider) {
    measurementProvider = createMeasurementProvider();
  }
  return measurementProvider;
}

/**
 * Check if text wrapping is needed
 */
function needsTextWrapping(props: ExtractedTextProps): boolean {
  // Text wrapping is enabled when:
  // 1. textAutoResize is not WIDTH_AND_HEIGHT (fixed width)
  // 2. Text box has a width
  return props.textAutoResize !== "WIDTH_AND_HEIGHT" && props.size !== undefined && props.size.width > 0;
}

/**
 * Get lines for rendering, applying text wrapping if needed
 */
function getTextLines(props: ExtractedTextProps): readonly string[] {
  const characters = props.characters;

  // First split by explicit line breaks
  const explicitLines = characters.split("\n");

  // If no wrapping needed, return explicit lines
  if (!needsTextWrapping(props)) {
    return explicitLines;
  }

  // Measure character widths and apply line breaking
  const provider = getMeasurementProvider();
  const fontSpec: FontSpec = {
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    fontWeight: props.fontWeight,
    fontStyle: props.fontStyle as "normal" | "italic" | "oblique" | undefined,
    letterSpacing: props.letterSpacing,
  };

  const maxWidth = props.size!.width;
  const allLines: string[] = [];

  // Process each explicit line separately
  for (const explicitLine of explicitLines) {
    if (!explicitLine) {
      // Empty line from double newline
      allLines.push("");
      continue;
    }

    // Measure character widths
    const charWidths = provider.measureCharWidths
      ? provider.measureCharWidths(explicitLine, fontSpec)
      : estimateCharWidths(explicitLine, props.fontSize, props.letterSpacing);

    // Break line if needed
    const brokenLines = breakLines(explicitLine, charWidths, maxWidth, "auto");

    for (const line of brokenLines) {
      allLines.push(line.text);
    }
  }

  return allLines;
}

/**
 * Estimate character widths when measurement provider doesn't support it
 */
function estimateCharWidths(text: string, fontSize: number, letterSpacing?: number): readonly number[] {
  const avgWidth = fontSize * 0.5; // Rough estimate
  const spacing = letterSpacing ?? 0;
  return Array.from(text).map((_, i) => (i < text.length - 1 ? avgWidth + spacing : avgWidth));
}

/**
 * Render a TEXT node to SVG
 *
 * Converts a Figma TEXT node into SVG <text> elements.
 * Handles single-line and multi-line text with proper
 * alignment, styling, and transforms.
 *
 * @param node - Figma TEXT node
 * @param _ctx - Render context (unused but required for interface)
 * @returns SVG string representation
 */
export function renderTextNode(node: FigNode, _ctx: FigSvgRenderContext): SvgString {
  const props = extractTextProps(node);

  if (!props.characters) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(props.transform);
  const { color: fillColor, opacity: fillOpacity } = getFillColorAndOpacity(props.fillPaints);

  // Get lines (with text wrapping applied if needed)
  const lines = getTextLines(props);
  const textAttrs = buildTextAttrs(props, fillColor, fillOpacity, lines.length);
  const baseY = textAttrs.y as number;

  if (lines.length === 1) {
    return renderSingleLine(lines[0], textAttrs, transformStr, props.opacity);
  }

  return renderMultiLine(lines, textAttrs, baseY, props.lineHeight, transformStr, props.opacity);
}

/**
 * Render single-line text
 */
function renderSingleLine(
  content: string,
  textAttrs: Parameters<typeof text>[0],
  transformStr: string | undefined,
  opacity: number,
): SvgString {
  const textEl = text(textAttrs, content);

  if (transformStr || opacity < 1) {
    return g(
      {
        transform: transformStr || undefined,
        opacity: opacity < 1 ? opacity : undefined,
      },
      textEl,
    );
  }

  return textEl;
}

/**
 * Render multi-line text
 */
function renderMultiLine(
  lines: readonly string[],
  textAttrs: Parameters<typeof text>[0],
  baseY: number,
  lineHeight: number,
  transformStr: string | undefined,
  opacity: number,
): SvgString {
  const textElements: SvgString[] = lines.map((lineText, i) =>
    text(
      {
        ...textAttrs,
        y: baseY + i * lineHeight,
      },
      lineText,
    ),
  );

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...textElements,
  );
}
