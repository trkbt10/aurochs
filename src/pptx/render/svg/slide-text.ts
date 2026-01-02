/**
 * @file SVG text rendering for slides
 *
 * Renders text content to SVG using the text-layout engine.
 * This module handles:
 * - Text layout and positioning
 * - Font styling (family, size, weight, style)
 * - Text decorations (underline, strikethrough)
 * - Text fills (solid, gradient)
 * - Hyperlinks and bookmarks
 * - Bullets (character and picture)
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import type { TextBody } from "../../domain/text";
import type { Color } from "../../domain/color";
import type { ColorContext } from "../../domain/resolution";
import type { RenderContext } from "../context";
import type { SvgDefsCollector } from "./slide-utils";
import type { LayoutResult, LayoutLine, LayoutSpan } from "../text-layout";
import { layoutTextBody, toLayoutInput } from "../text-layout";
import { escapeXml } from "../../../xml";
import { px, deg } from "../../domain/types";
import { PT_TO_PX } from "../../core/units/conversion";

// =============================================================================
// Main Text Rendering
// =============================================================================

/**
 * Render text content to SVG using the text-layout engine.
 *
 * @param textBody - Text body domain object
 * @param ctx - Render context
 * @param boxWidth - Text box width in pixels
 * @param boxHeight - Text box height in pixels
 * @param defsCollector - SVG defs collector
 * @returns SVG string for text content
 */
export function renderTextSvg(
  textBody: TextBody,
  ctx: RenderContext,
  boxWidth: number,
  boxHeight: number,
  defsCollector: SvgDefsCollector,
): string {
  if (textBody.paragraphs.length === 0) {
    return "";
  }

  // Get body rotation for text box
  // @see ECMA-376 Part 1, Section 21.1.2.1.2 (bodyPr rot attribute)
  const bodyRotation = textBody.bodyProperties.rotation ?? deg(0);

  // Convert TextBody to layout input
  // Pass resource resolver for picture bullet support
  // Pass fontScheme for resolving theme font references (+mj-lt, +mn-lt, etc.)
  // Pass renderOptions for dialect-specific adjustments (e.g., LibreOffice line spacing)
  // @see ECMA-376 Part 1, Section 21.1.2.4.2 (a:buBlip)
  // @see ECMA-376 Part 1, Section 20.1.4.1.16-17 (theme fonts)

  const resourceResolver = (resourceId: string) => ctx.resources.resolve(resourceId);
  const layoutInput = toLayoutInput({
    body: textBody,
    width: px(boxWidth),
    height: px(boxHeight),
    colorContext: ctx.colorContext,
    fontScheme: ctx.fontScheme,
    renderOptions: ctx.options,
    resourceResolver,
  });

  // Run the layout engine
  const layoutResult = layoutTextBody(layoutInput);

  const baseTextSvg = renderLayoutResultToSvg(layoutResult, defsCollector);
  const rotatedTextSvg = applyBodyRotation(baseTextSvg, bodyRotation, boxWidth, boxHeight);
  const clippedTextSvg = applyOverflowClip(rotatedTextSvg, textBody, defsCollector, boxWidth, boxHeight);
  const antiAliasedSvg = applyForceAntiAlias(clippedTextSvg, textBody);
  return applyUprightText(antiAliasedSvg, textBody);
}

function applyBodyRotation(
  textSvg: string,
  rotation: number,
  boxWidth: number,
  boxHeight: number
): string {
  if (rotation === 0) {
    return textSvg;
  }
  const centerX = boxWidth / 2;
  const centerY = boxHeight / 2;
  return `<g transform="rotate(${rotation}, ${centerX}, ${centerY})">${textSvg}</g>`;
}

function applyOverflowClip(
  textSvg: string,
  textBody: TextBody,
  defsCollector: SvgDefsCollector,
  boxWidth: number,
  boxHeight: number
): string {
  const horzOverflow = textBody.bodyProperties.overflow;
  const vertOverflow = textBody.bodyProperties.verticalOverflow ?? "overflow";
  if (horzOverflow !== "clip" && vertOverflow !== "clip") {
    return textSvg;
  }
  const clipId = defsCollector.getNextId("text-clip");
  defsCollector.addDef(
    `<clipPath id="${clipId}"><rect x="0" y="0" width="${boxWidth}" height="${boxHeight}"/></clipPath>`,
  );
  return `<g clip-path="url(#${clipId})">${textSvg}</g>`;
}

function applyForceAntiAlias(textSvg: string, textBody: TextBody): string {
  if (textBody.bodyProperties.forceAntiAlias !== true) {
    return textSvg;
  }
  return `<g text-rendering="geometricPrecision">${textSvg}</g>`;
}

function applyUprightText(textSvg: string, textBody: TextBody): string {
  const vertType = textBody.bodyProperties.verticalType;
  if (textBody.bodyProperties.upright === true && vertType !== "horz") {
    return `<g style="text-orientation: upright; writing-mode: vertical-rl">${textSvg}</g>`;
  }
  return textSvg;
}

// =============================================================================
// Layout Result Rendering
// =============================================================================

function buildMouseOverTooltip(tooltip: string | undefined): string {
  if (tooltip === undefined) {
    return "";
  }
  return `<title>${escapeXml(tooltip)}</title>`;
}

/**
 * Render layout result to SVG text elements
 */
function renderLayoutResultToSvg(layoutResult: LayoutResult, defsCollector: SvgDefsCollector): string {
  const elements: string[] = [];

  for (const para of layoutResult.paragraphs) {
    // Render bullet if present
    // @see ECMA-376 21.1.2.2.7: Bullet position = marL + indent
    // Since firstLine.x = marL + indent + bulletWidth, we subtract bulletWidth
    if (para.bullet !== undefined && para.lines.length > 0) {
      const firstLine = para.lines[0];
      const bulletX = (firstLine.x as number) - (para.bulletWidth as number);
      const bulletY = firstLine.y as number;
      const bulletFontSize = (para.bullet.fontSize as number) * PT_TO_PX;

      // Check if this is a picture bullet
      // @see ECMA-376 Part 1, Section 21.1.2.4.2 (a:buBlip)
      if (para.bullet.imageUrl !== undefined) {
        // Render picture bullet as an image
        // Position: center vertically relative to line baseline
        const imageSize = bulletFontSize;
        const imageY = bulletY - imageSize * 0.8; // Adjust for baseline alignment
        elements.push(
          `<image href="${para.bullet.imageUrl}" x="${bulletX}" y="${imageY}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet"/>`,
        );
      } else {
        // Render character bullet as text
        elements.push(
          `<text x="${bulletX}" y="${bulletY}" font-size="${bulletFontSize}px" fill="${para.bullet.color}" font-family="${escapeXml(para.bullet.fontFamily)}">${escapeXml(para.bullet.char)}</text>`,
        );
      }
    }

    // Render each line
    for (const line of para.lines) {
      const lineElements = renderLineToSvg(line, para.fontAlignment, defsCollector);
      elements.push(...lineElements);
    }
  }

  return elements.join("\n");
}

// =============================================================================
// Line Rendering
// =============================================================================

/**
 * Convert fontAlignment to SVG dominant-baseline value.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
 */
function toSvgDominantBaseline(fontAlignment: "auto" | "top" | "center" | "base" | "bottom"): string | undefined {
  switch (fontAlignment) {
    case "top":
      return "text-top";
    case "center":
      return "central";
    case "bottom":
      return "text-bottom";
    case "auto":
    case "base":
    default:
      // Default alphabetic baseline - no need to specify
      return undefined;
  }
}

/**
 * Render a single line to SVG text elements
 */
function renderLineToSvg(
  line: LayoutLine,
  fontAlignment: "auto" | "top" | "center" | "base" | "bottom",
  defsCollector: SvgDefsCollector,
): string[] {
  const elements: string[] = [];
  const cursor = { value: line.x as number };

  // Get dominant-baseline for this paragraph
  // @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
  const dominantBaseline = toSvgDominantBaseline(fontAlignment);

  for (const span of line.spans) {
    if (span.text.length === 0) {
      continue;
    }

    const fontSizePx = (span.fontSize as number) * PT_TO_PX;
    const lineY = line.y as number;

    // Build style attributes
    const styleAttrs: string[] = [];
    styleAttrs.push(`font-size="${fontSizePx}px"`);

    // Build font-family with fallback fonts
    // @see ECMA-376 Part 1, Section 21.1.2.3.1-2, 21.1.2.3.10 (a:cs, a:ea, a:sym)
    const fontFamilies = [span.fontFamily];
    if (span.fontFamilyEastAsian !== undefined) {
      fontFamilies.push(span.fontFamilyEastAsian);
    }
    if (span.fontFamilyComplexScript !== undefined && span.fontFamilyComplexScript !== span.fontFamily) {
      fontFamilies.push(span.fontFamilyComplexScript);
    }
    if (span.fontFamilySymbol !== undefined && span.fontFamilySymbol !== span.fontFamily) {
      fontFamilies.push(span.fontFamilySymbol);
    }
    const fontFamilyAttr = fontFamilies.map(f => escapeXml(f)).join(", ");
    styleAttrs.push(`font-family="${fontFamilyAttr}"`);

    // Apply font alignment via dominant-baseline
    if (dominantBaseline !== undefined) {
      styleAttrs.push(`dominant-baseline="${dominantBaseline}"`);
    }

    // Handle text fill (gradient, solid, or noFill)
    // @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
    if (span.textFill !== undefined) {
      if (span.textFill.type === "gradient") {
        // Create gradient definition
        const gradId = defsCollector.getNextId("text-grad");
        const gradDef = createTextGradientDef(span.textFill, gradId);
        defsCollector.addDef(gradDef);
        styleAttrs.push(`fill="url(#${gradId})"`);
      } else if (span.textFill.type === "noFill") {
        // No fill - transparent text
        // @see ECMA-376 Part 1, Section 20.1.8.44 (a:noFill)
        styleAttrs.push(`fill="none"`);
      } else {
        // Solid fill with alpha
        if (span.textFill.alpha < 1) {
          styleAttrs.push(`fill="${span.textFill.color}"`);
          styleAttrs.push(`fill-opacity="${span.textFill.alpha}"`);
        } else {
          styleAttrs.push(`fill="${span.textFill.color}"`);
        }
      }
    } else {
      // Fall back to span.color for backward compatibility
      styleAttrs.push(`fill="${span.color}"`);
    }

    if (span.fontWeight !== 400) {
      styleAttrs.push(`font-weight="${span.fontWeight}"`);
    }
    if (span.fontStyle !== "normal") {
      styleAttrs.push(`font-style="${span.fontStyle}"`);
    }
    if (span.textDecoration !== undefined) {
      styleAttrs.push(`text-decoration="${span.textDecoration}"`);
      // Handle custom underline color
      // @see ECMA-376 Part 1, Section 21.1.2.3.33 (a:uLn)
      if (span.underlineColor !== undefined) {
        styleAttrs.push(`style="text-decoration-color: ${span.underlineColor}"`);
      }
    }

    // Handle highlight background
    if (span.highlightColor !== undefined) {
      const spanWidth = span.width as number;
      elements.push(
        `<rect x="${cursor.value}" y="${lineY - fontSizePx * 0.8}" width="${spanWidth}" height="${fontSizePx}" fill="${span.highlightColor}"/>`,
      );
    }

    // Apply text transform
    const textContent = applyTextTransform(span.text, span.textTransform);

    // Handle vertical alignment
    const adjustedY = applyVerticalAlign(lineY, fontSizePx, span.verticalAlign);

    // Handle text outline (stroke)
    // @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
    if (span.textOutline !== undefined) {
      styleAttrs.push(`stroke="${span.textOutline.color}"`);
      styleAttrs.push(`stroke-width="${span.textOutline.width}"`);
      styleAttrs.push(`stroke-linecap="${span.textOutline.cap}"`);
      styleAttrs.push(`stroke-linejoin="${span.textOutline.join}"`);
      // Paint order: stroke first, then fill, so fill appears on top
      styleAttrs.push(`paint-order="stroke fill"`);
    }

    // Handle character spacing (letter-spacing)
    // Per ECMA-376 Part 1, Section 21.1.2.3.9:
    // spc attribute specifies additional spacing between characters.
    // @see ECMA-376 Part 1, Section 21.1.2.3.9 (spc attribute)
    if (span.letterSpacing !== undefined) {
      const letterSpacingPx = span.letterSpacing as number;
      if (letterSpacingPx !== 0) {
        styleAttrs.push(`letter-spacing="${letterSpacingPx}px"`);
      }
    }

    // Handle kerning
    // Per ECMA-376 Part 1, Section 21.1.2.3.9:
    // kern attribute specifies minimum font size (in points) for kerning.
    // Kerning is enabled when fontSize >= kern threshold.
    // @see ECMA-376 Part 1, Section 21.1.2.3.9 (kern attribute)
    if (span.kerning !== undefined) {
      const kerningThreshold = span.kerning as number;
      const fontSize = span.fontSize as number;
      if (fontSize >= kerningThreshold) {
        styleAttrs.push(`font-kerning="normal"`);
      } else {
        styleAttrs.push(`font-kerning="none"`);
      }
    }

    // Handle text direction (RTL)
    // Per ECMA-376 Part 1, Section 21.1.2.3.12:
    // rtl attribute specifies run-level right-to-left direction.
    // @see ECMA-376 Part 1, Section 21.1.2.3.12 (a:rtl)
    if (span.direction === "rtl") {
      styleAttrs.push(`direction="rtl"`);
      styleAttrs.push(`unicode-bidi="bidi-override"`);
    }

    // Handle bookmark (id attribute)
    // @see ECMA-376 Part 1, Section 21.1.2.3.9 (bmk attribute)
    if (span.bookmark !== undefined) {
      styleAttrs.push(`id="${escapeXml(span.bookmark)}"`);
    }

    // Build the text element
    const baseTextElement = `<text x="${cursor.value}" y="${adjustedY}" ${styleAttrs.join(" ")}>${escapeXml(textContent)}</text>`;
    const textElement = wrapTextWithLinks(baseTextElement, span);

    // Wrap with hyperlink if linkId is present
    // @see ECMA-376 Part 1, Section 21.1.2.3.5 (a:hlinkClick)
    elements.push(textElement);

    cursor.value += (span.width as number) + (span.dx as number);
  }

  return elements;
}

function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

function applyVerticalAlign(
  lineY: number,
  fontSizePx: number,
  verticalAlign: "baseline" | "superscript" | "subscript"
): number {
  if (verticalAlign === "superscript") {
    return lineY - fontSizePx * 0.4;
  }
  if (verticalAlign === "subscript") {
    return lineY + fontSizePx * 0.2;
  }
  return lineY;
}

function wrapTextWithLinks(textElement: string, span: LayoutSpan): string {
  if (span.linkId !== undefined) {
    const tooltipAttr = span.linkTooltip !== undefined ? ` title="${escapeXml(span.linkTooltip)}"` : "";
    return `<a href="#${escapeXml(span.linkId)}"${tooltipAttr}>${textElement}</a>`;
  }
  if (span.mouseOverLinkId !== undefined) {
    const mouseOverTooltip = buildMouseOverTooltip(span.mouseOverLinkTooltip);
    return `<a href="#${escapeXml(span.mouseOverLinkId)}">${mouseOverTooltip}${textElement}</a>`;
  }
  return textElement;
}

// =============================================================================
// Gradient Utilities
// =============================================================================

/**
 * Create gradient definition for text fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
function createTextGradientDef(
  fill: { type: "gradient"; stops: readonly { position: number; color: string; alpha: number }[]; angle: number; isRadial: boolean; radialCenter?: { cx: number; cy: number } },
  gradId: string,
): string {
  const stops = fill.stops
    .map((stop) => {
      const color = stop.color;
      const opacity = stop.alpha < 1 ? ` stop-opacity="${stop.alpha}"` : "";
      return `<stop offset="${stop.position}%" stop-color="${color}"${opacity}/>`;
    })
    .join("\n");

  if (fill.isRadial) {
    const cx = fill.radialCenter?.cx ?? 50;
    const cy = fill.radialCenter?.cy ?? 50;
    return `<radialGradient id="${gradId}" cx="${cx}%" cy="${cy}%" r="50%">\n${stops}\n</radialGradient>`;
  }

  // Linear gradient: convert angle to SVG coordinates
  // ECMA-376 angle is in degrees, 0 = right, 90 = down
  // SVG uses x1,y1,x2,y2 with 0,0 at top-left
  const angleRad = (fill.angle * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(angleRad);
  const y1 = 50 - 50 * Math.sin(angleRad);
  const x2 = 50 + 50 * Math.cos(angleRad);
  const y2 = 50 + 50 * Math.sin(angleRad);

  return `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">\n${stops}\n</linearGradient>`;
}

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Resolve a color to SVG fill value
 */
export function resolveColorForSvg(
  color: Color,
  colorContext: ColorContext,
): string {
  const { spec } = color;

  switch (spec.type) {
    case "srgb":
      return `#${spec.value}`;
    case "scheme": {
      const mapped = colorContext.colorMap[spec.value] ?? spec.value;
      const resolved = colorContext.colorScheme[mapped];
      return resolved !== undefined ? `#${resolved}` : "#000000";
    }
    case "system":
      return spec.lastColor !== undefined ? `#${spec.lastColor}` : "#000000";
    default:
      return "#000000";
  }
}

// =============================================================================
// Dash Pattern Utilities
// =============================================================================

/**
 * Get dash array for a preset dash style.
 *
 * @param dashStyle - Preset dash style name
 * @param lineWidth - Line width for dash pattern scaling
 * @returns SVG stroke-dasharray value or undefined for solid
 *
 * @see ECMA-376 Part 1, Section 20.1.10.48 (ST_PresetLineDashVal)
 */
export function getDashArray(dashStyle: string, lineWidth: number): string | undefined {
  const w = Math.max(1, lineWidth);
  switch (dashStyle) {
    case "dot":
      return `${w} ${w * 2}`;
    case "dash":
      return `${w * 4} ${w * 3}`;
    case "lgDash":
      return `${w * 8} ${w * 3}`;
    case "dashDot":
      return `${w * 4} ${w * 2} ${w} ${w * 2}`;
    case "lgDashDot":
      return `${w * 8} ${w * 2} ${w} ${w * 2}`;
    case "lgDashDotDot":
      return `${w * 8} ${w * 2} ${w} ${w * 2} ${w} ${w * 2}`;
    case "sysDot":
      return `${w} ${w}`;
    case "sysDash":
      return `${w * 3} ${w}`;
    case "sysDashDot":
      return `${w * 3} ${w} ${w} ${w}`;
    case "sysDashDotDot":
      return `${w * 3} ${w} ${w} ${w} ${w} ${w}`;
    default:
      return undefined;
  }
}
