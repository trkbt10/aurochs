/**
 * @file SVG Content Renderer
 *
 * Unified component for rendering SVG content with proper memoization.
 * Supports both full SVG strings and inner content extraction.
 *
 * SVG strings are parsed into XmlElement trees (via @aurochs/xml) and
 * converted to React elements. Attribute manipulation (responsive sizing,
 * preserveAspectRatio) operates on the structured tree, not on strings.
 */

import { forwardRef, memo, useMemo, type CSSProperties } from "react";
import { parseSvgString, normalizeSvgForScaling, svgElementToJsx, svgChildrenToJsx } from "@aurochs-renderer/svg";

// =============================================================================
// Types
// =============================================================================

/**
 * Render mode for SVG content
 *
 * - `full`: Render the complete SVG element with responsive scaling
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
 * - **full**: Parses the SVG, normalizes dimensions to 100% for responsive
 *   scaling, and converts to React elements.
 *
 * - **inner**: Parses the SVG, extracts the children of the root `<svg>`
 *   element, and wraps them in a new `<svg>` with the provided viewBox.
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
    // Parse SVG string into structured tree (shared between both modes)
    const parsedSvg = useMemo(() => parseSvgString(svg), [svg]);

    // Full mode: normalize for responsive scaling, then convert to JSX
    const fullContent = useMemo(() => {
      if (mode !== "full" || parsedSvg === null) {
        return null;
      }
      const normalized = normalizeSvgForScaling(parsedSvg);
      return svgElementToJsx(normalized);
    }, [parsedSvg, mode]);

    // Inner mode: extract children and convert to JSX
    const innerContent = useMemo(() => {
      if (mode === "full" || parsedSvg === null) {
        return null;
      }
      return svgChildrenToJsx(parsedSvg.children);
    }, [parsedSvg, mode]);

    // Memoize viewBox for inner mode
    const viewBox = useMemo(() => `0 0 ${width} ${height}`, [width, height]);

    // Merge styles
    const mergedStyle = useMemo(
      () => (style !== undefined ? { ...containerStyle, ...style } : containerStyle),
      [style],
    );

    if (mode === "full") {
      return (
        <div ref={ref} className={className} style={mergedStyle}>
          {fullContent}
        </div>
      );
    }

    return (
      <div ref={ref} className={className} style={mergedStyle}>
        <svg
          style={svgStyle}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          {innerContent}
        </svg>
      </div>
    );
  }),
);
