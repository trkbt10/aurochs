/**
 * @file Slide thumbnail preview component
 *
 * Renders scaled SVG preview for a slide thumbnail.
 * Extracts inner content from full SVG document and displays with proper scaling.
 */

import { useMemo, type CSSProperties } from "react";
import { extractSvgContent } from "@oxen/pptx-render/svg";

// =============================================================================
// Types
// =============================================================================

export type SlideThumbnailPreviewProps = {
  readonly svg: string;
  readonly slideWidth: number;
  readonly slideHeight: number;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  backgroundColor: "#fff",
};

const svgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Slide thumbnail preview component
 *
 * Renders an SVG string as a scaled preview within its container.
 */
export function SlideThumbnailPreview({ svg, slideWidth, slideHeight }: SlideThumbnailPreviewProps) {
  // Extract inner content from full SVG document
  const innerContent = useMemo(() => extractSvgContent(svg), [svg]);

  // Use provided dimensions for viewBox (fallback to extraction if needed)
  const viewBox = `0 0 ${slideWidth} ${slideHeight}`;

  return (
    <div style={containerStyle}>
      <svg
        style={svgStyle}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: innerContent }}
      />
    </div>
  );
}
