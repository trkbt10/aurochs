/**
 * @file Background Fill Component
 *
 * Renders slide/page background using resolved background data.
 * Supports solid, gradient, and image backgrounds.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 */

import type { ReactNode } from "react";
import { useDrawingMLContext } from "../context";
import { useBackground } from "./useBackground";

// =============================================================================
// Types
// =============================================================================

type BackgroundFillProps = {
  /** Optional width override (defaults to renderSize.width or 960) */
  readonly width?: number;
  /** Optional height override (defaults to renderSize.height or 540) */
  readonly height?: number;
  /** Optional fallback color when no background (defaults to white) */
  readonly fallbackColor?: string;
  /** Additional class name */
  readonly className?: string;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a background as SVG elements.
 *
 * Uses the renderSize from DrawingML context or defaults to 960x540.
 *
 * @example
 * ```tsx
 * // In an SVG context
 * <svg viewBox="0 0 960 540">
 *   <BackgroundFill />
 *   {/* other content *\/}
 * </svg>
 * ```
 */
export function BackgroundFill({
  width: widthOverride,
  height: heightOverride,
  fallbackColor = "#ffffff",
  className,
}: BackgroundFillProps): ReactNode {
  const { renderSize } = useDrawingMLContext();
  const bg = useBackground();

  const width = widthOverride ?? renderSize?.width ?? 960;
  const height = heightOverride ?? renderSize?.height ?? 540;

  // No background - render fallback
  if (!bg.hasBackground) {
    return <rect width={width} height={height} fill={fallbackColor} className={className} />;
  }

  // Image background - render as <image> element
  if (bg.type === "image" && bg.imageUrl !== undefined) {
    return (
      <image
        href={bg.imageUrl}
        width={width}
        height={height}
        preserveAspectRatio={bg.imageMode === "stretch" ? "none" : "xMidYMid slice"}
        className={className}
      />
    );
  }

  // Solid or gradient background
  return (
    <>
      {bg.defElement}
      <rect width={width} height={height} fill={bg.fill} className={className} />
    </>
  );
}

/**
 * Standalone background renderer with defs wrapper.
 * Use this when you need the <defs> element included.
 */
export function BackgroundFillWithDefs({
  width: widthOverride,
  height: heightOverride,
  fallbackColor = "#ffffff",
  className,
}: BackgroundFillProps): ReactNode {
  const { renderSize } = useDrawingMLContext();
  const bg = useBackground();

  const width = widthOverride ?? renderSize?.width ?? 960;
  const height = heightOverride ?? renderSize?.height ?? 540;

  // No background - render fallback
  if (!bg.hasBackground) {
    return <rect width={width} height={height} fill={fallbackColor} className={className} />;
  }

  // Image background
  if (bg.type === "image" && bg.imageUrl !== undefined) {
    return (
      <image
        href={bg.imageUrl}
        width={width}
        height={height}
        preserveAspectRatio={bg.imageMode === "stretch" ? "none" : "xMidYMid slice"}
        className={className}
      />
    );
  }

  // Solid or gradient with defs
  return (
    <>
      {bg.defElement !== undefined && <defs>{bg.defElement}</defs>}
      <rect width={width} height={height} fill={bg.fill} className={className} />
    </>
  );
}
