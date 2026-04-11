/**
 * @file Slide thumbnail preview component
 *
 * Renders a scaled SVG preview for a slide thumbnail.
 * Accepts an SVG string, parses it into a structured tree,
 * and renders as React elements within a viewBox-scaled container.
 */

import { useMemo, type CSSProperties } from "react";
import { parseSvgString } from "@aurochs-renderer/pptx/svg/svg-parse";
import { svgChildrenToJsx } from "@aurochs-renderer/pptx/svg/svg-to-jsx";

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
  // Parse SVG and extract inner content as React elements
  const innerContent = useMemo(() => {
    const root = parseSvgString(svg);
    if (root === null) {
      return null;
    }
    return svgChildrenToJsx(root.children, "thumb");
  }, [svg]);

  const viewBox = `0 0 ${slideWidth} ${slideHeight}`;

  return (
    <div style={containerStyle}>
      <svg
        style={svgStyle}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {innerContent}
      </svg>
    </div>
  );
}
