/**
 * @file SlidePreview
 *
 * Single slide preview component with SVG rendering.
 */

import type { CSSProperties, MouseEvent } from "react";
import { SvgContentRenderer } from "@aurochs-renderer/pptx/react";

export type SlidePreviewProps = {
  /** SVG content to render */
  readonly svg: string;
  /** Original slide width in EMUs or pixels */
  readonly width: number;
  /** Original slide height in EMUs or pixels */
  readonly height: number;
  /** How to handle aspect ratio */
  readonly aspectRatio?: "maintain" | "fill";
  /** Show shadow around the slide */
  readonly showShadow?: boolean;
  /** Background color (default: white) */
  readonly backgroundColor?: string;
  /** Border radius in pixels */
  readonly borderRadius?: number;
  /** Click handler */
  readonly onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const containerBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  maxHeight: "100%",
};

const slideBaseStyle: CSSProperties = {
  overflow: "hidden",
  maxWidth: "100%",
  maxHeight: "100%",
};

const contentStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  lineHeight: 0,
};

/**
 * Renders a single slide preview with SVG content.
 *
 * @example
 * ```tsx
 * <SlidePreview
 *   svg={slideSvg}
 *   width={slideSize.width}
 *   height={slideSize.height}
 *   showShadow
 *   onClick={() => nav.goToSlide(slideIndex)}
 * />
 * ```
 */
export function SlidePreview({
  svg,
  width,
  height,
  aspectRatio = "maintain",
  showShadow = false,
  backgroundColor = "#fff",
  borderRadius = 4,
  onClick,
  className,
  style,
}: SlidePreviewProps) {
  const slideStyle: CSSProperties = {
    ...slideBaseStyle,
    backgroundColor,
    borderRadius: `${borderRadius}px`,
    boxShadow: showShadow ? "var(--shadow-lg)" : undefined,
    aspectRatio: aspectRatio === "maintain" ? `${width} / ${height}` : undefined,
    cursor: onClick ? "pointer" : undefined,
    ...style,
  };

  return (
    <div style={containerBaseStyle} className={className}>
      <div style={slideStyle} onClick={onClick}>
        <SvgContentRenderer svg={svg} width={width} height={height} mode="full" style={contentStyle} />
      </div>
    </div>
  );
}
