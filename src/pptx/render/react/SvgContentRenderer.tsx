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
          dangerouslySetInnerHTML={{ __html: svg }}
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
