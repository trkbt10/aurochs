/**
 * @file SVG Content Renderer
 *
 * Unified component for rendering SVG content with proper memoization.
 * Supports both full SVG strings and inner content extraction.
 */

import { forwardRef, memo, useMemo, type CSSProperties } from "react";
import { extractSvgContent } from "../svg/svg-utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Render mode for SVG content
 *
 * - `full`: Render the complete SVG as-is using dangerouslySetInnerHTML
 * - `inner`: Extract inner content and wrap in a new SVG with proper viewBox
 */
export type SvgRenderMode = "full" | "inner";

/**
 * Props for SvgContentRenderer
 */
export type SvgContentRendererProps = {
  /** Full SVG string to render */
  readonly svg: string;
  /** Slide/content width for viewBox (required for 'inner' mode) */
  readonly width: number;
  /** Slide/content height for viewBox (required for 'inner' mode) */
  readonly height: number;
  /** Render mode: 'full' preserves outer SVG, 'inner' extracts content */
  readonly mode?: SvgRenderMode;
  /** Additional className for container */
  readonly className?: string;
  /** Additional style for container */
  readonly style?: CSSProperties;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize SVG for responsive scaling.
 *
 * Replaces fixed pixel width/height with 100% and ensures preserveAspectRatio
 * is set. This allows SVGs with viewBox to scale properly within their container.
 *
 * @param svg - Original SVG string
 * @returns SVG string with normalized dimensions
 */
function normalizeForScaling(svg: string): string {
  // Replace width="..." and height="..." (numeric or percentage) with 100%
  // Preserves viewBox which controls the actual aspect ratio
  let result = svg.replace(/(<svg[^>]*)\s+width=["'][^"']*["']/, "$1 width=\"100%\"");
  result = result.replace(/(<svg[^>]*)\s+height=["'][^"']*["']/, "$1 height=\"100%\"");

  // Add preserveAspectRatio if not present (defaults to xMidYMid meet per SVG spec,
  // but being explicit ensures consistent behavior)
  if (!result.includes("preserveAspectRatio")) {
    result = result.replace(/(<svg[^>]*)>/, '$1 preserveAspectRatio="xMidYMid meet">');
  }

  return result;
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  lineHeight: 0,
  overflow: "hidden",
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
 * SVG content renderer with memoization
 *
 * Renders an SVG string efficiently with proper memoization to prevent
 * unnecessary re-renders. Supports two modes:
 *
 * - **full**: Renders the complete SVG as-is, wrapped in a container div.
 *   Use this for main slide display where the SVG already has correct dimensions.
 *
 * - **inner**: Extracts the inner content from the SVG and wraps it in a new
 *   SVG element with the provided viewBox dimensions. Use this for thumbnails
 *   or scaled previews.
 *
 * @example
 * ```tsx
 * import { renderSlideToSvg } from "../svg";
 *
 * const { svg } = renderSlideToSvg(slide);
 *
 * // Main slide display (full mode)
 * <SvgContentRenderer
 *   svg={svg}
 *   width={slideWidth}
 *   height={slideHeight}
 *   mode="full"
 * />
 *
 * // Thumbnail preview (inner mode)
 * <SvgContentRenderer
 *   svg={svg}
 *   width={slideWidth}
 *   height={slideHeight}
 *   mode="inner"
 * />
 * ```
 */
export const SvgContentRenderer = memo(
  forwardRef<HTMLDivElement, SvgContentRendererProps>(function SvgContentRenderer(
    { svg, width, height, mode = "inner", className, style },
    ref,
  ) {
    // Memoize normalized SVG for full mode (responsive scaling)
    const normalizedSvg = useMemo(() => {
      if (mode !== "full") {
        return null;
      }
      return normalizeForScaling(svg);
    }, [svg, mode]);

    // Memoize content extraction for inner mode
    const innerContent = useMemo(() => {
      if (mode === "full") {
        return null;
      }
      return extractSvgContent(svg);
    }, [svg, mode]);

    // Memoize viewBox for inner mode
    const viewBox = useMemo(() => `0 0 ${width} ${height}`, [width, height]);

    // Merge styles
    const mergedStyle = useMemo(
      () => (style !== undefined ? { ...containerStyle, ...style } : containerStyle),
      [style],
    );

    if (mode === "full") {
      return (
        <div
          ref={ref}
          className={className}
          style={mergedStyle}
          dangerouslySetInnerHTML={{ __html: normalizedSvg ?? "" }}
        />
      );
    }

    return (
      <div ref={ref} className={className} style={mergedStyle}>
        <svg
          style={svgStyle}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          dangerouslySetInnerHTML={{ __html: innerContent ?? "" }}
        />
      </div>
    );
  }),
);
