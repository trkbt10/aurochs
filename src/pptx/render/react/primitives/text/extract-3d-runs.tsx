/**
 * @file Extract text runs for 3D WebGL rendering
 *
 * Converts TextBody to Text3DRunConfig array using the layout engine.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import type { TextBody } from "../../../../domain/text";
import type { FontScheme } from "../../../../domain/theme";
import type { RenderOptions } from "../../../core/types";
import type { ColorContext } from "../../../../domain/resolution";
import type { Text3DRunConfig } from "../../../webgl/text3d";
import { layoutTextBody, toLayoutInput } from "../../../text-layout";
import { px } from "../../../../domain/types";
import { PT_TO_PX } from "../../../../domain/unit-conversion";

// =============================================================================
// Text 3D Run Extraction
// =============================================================================

/**
 * Extract Text3DRunConfig array from TextBody using the text-layout engine.
 *
 * Uses the same layout engine as SVG rendering to ensure:
 * - Proper theme font resolution (+mj-lt, +mn-lt, etc.)
 * - Correct style inheritance from paragraph defaults
 * - Accurate position calculation for each span
 * - Proper handling of line breaks and multiple lines
 *
 * @param textBody - Text body to convert
 * @param width - Text box width in pixels
 * @param height - Text box height in pixels
 * @param colorContext - Color resolution context
 * @param fontScheme - Font scheme for theme font resolution
 * @param options - Render options
 * @param resourceResolver - Resource resolver for images
 * @returns Array of text runs for 3D rendering
 */
export function extractText3DRuns(
  textBody: TextBody,
  width: number,
  height: number,
  colorContext: ColorContext,
  fontScheme: FontScheme | undefined,
  options: RenderOptions | undefined,
  resourceResolver: (resourceId: string) => string | undefined,
): Text3DRunConfig[] {
  // Use the same layout engine as SVG rendering
  const layoutInput = toLayoutInput({
    body: textBody,
    width: px(width),
    height: px(height),
    colorContext,
    fontScheme,
    renderOptions: options,
    resourceResolver,
  });

  // Run the layout engine
  const layoutResult = layoutTextBody(layoutInput);

  // Convert layout result to Text3DRunConfig array
  const runs: Text3DRunConfig[] = [];

  for (const para of layoutResult.paragraphs) {
    for (const line of para.lines) {
      // Use reduce to track cursor position (Rule 3 - avoid reassignment)
      line.spans.reduce(
        (cursorX, span) => {
          // Skip empty spans and line breaks
          if (span.text.length === 0 || span.isBreak) {
            return cursorX;
          }

          // Get font size in pixels (layout engine returns Points)
          const fontSizePx = px((span.fontSize as number) * PT_TO_PX);

          runs.push({
            text: span.text,
            color: span.color,
            fontSize: fontSizePx,
            fontFamily: span.fontFamily,
            fontWeight: span.fontWeight,
            fontStyle: span.fontStyle,
            letterSpacing: span.letterSpacing,
            opticalKerning: span.opticalKerning,
            x: px(cursorX),
            y: line.y,
            width: span.width,
          });

          // Advance cursor for next span
          return cursorX + (span.width as number) + (span.dx as number);
        },
        line.x as number,
      );
    }
  }

  return runs;
}
