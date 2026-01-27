/**
 * @file Viewport Overlay component
 *
 * Wraps HTML content with viewport transform for proper positioning
 * during pan/zoom operations. Used for overlays like text editing,
 * pen tools, and path editing that need to stay aligned with the canvas.
 */

import type { ReactNode, CSSProperties, ReactElement } from "react";
import type { ViewportTransform, ViewportSize } from "@oxen/pptx-render/svg-viewport";

export type ViewportOverlayProps = {
  /** Current viewport transform */
  readonly viewport: ViewportTransform;
  /** Viewport dimensions */
  readonly viewportSize: ViewportSize;
  /** Slide width in pixels */
  readonly slideWidth: number;
  /** Slide height in pixels */
  readonly slideHeight: number;
  /** Ruler thickness offset */
  readonly rulerThickness: number;
  /** Child content to render inside the overlay */
  readonly children: ReactNode;
  /** Whether pointer events are enabled on the content (default: true) */
  readonly pointerEvents?: boolean;
};

/**
 * Container for HTML overlays that need to follow viewport pan/zoom.
 *
 * Applies the same transform as the SVG canvas viewport to keep
 * HTML elements aligned with the slide content.
 */
export function ViewportOverlay({
  viewport,
  viewportSize,
  slideWidth,
  slideHeight,
  rulerThickness,
  children,
  pointerEvents = true,
}: ViewportOverlayProps): ReactElement {
  const containerStyle: CSSProperties = {
    position: "absolute",
    top: rulerThickness,
    left: rulerThickness,
    width: viewportSize.width - rulerThickness,
    height: viewportSize.height - rulerThickness,
    overflow: "hidden",
    pointerEvents: "none",
  };

  const transformStyle: CSSProperties = {
    position: "absolute",
    transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`,
    transformOrigin: "0 0",
    width: slideWidth,
    height: slideHeight,
    pointerEvents: pointerEvents ? "auto" : "none",
  };

  return (
    <div style={containerStyle}>
      <div style={transformStyle}>{children}</div>
    </div>
  );
}
