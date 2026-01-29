/**
 * @file Background Fill Component
 *
 * Renders slide background using resolved background data.
 * Supports solid, gradient, and image backgrounds.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 */

import type { ReactNode } from "react";
import { useRenderContext } from "../../context";
import { useBackground } from "./useBackground";

// =============================================================================
// Types
// =============================================================================

type BackgroundFillProps = {
  /** Optional width override (defaults to slide width) */
  readonly width?: number;
  /** Optional height override (defaults to slide height) */
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
 * Renders a slide background as SVG elements.
 *
 * @example
 * ```tsx
 * // In an SVG context
 * <svg viewBox="0 0 960 540">
 *   <BackgroundFill />
 *   {/* other slide content *\/}
 * </svg>
 * ```
 */
export function BackgroundFill({
  width: widthOverride,
  height: heightOverride,
  fallbackColor = "#ffffff",
  className,
}: BackgroundFillProps): ReactNode {
  const { slideSize } = useRenderContext();
  const bg = useBackground();

  const width = widthOverride ?? slideSize.width;
  const height = heightOverride ?? slideSize.height;

  // No background - render fallback
  if (!bg.hasBackground) {
    return <rect width={width} height={height} fill={fallbackColor} className={className} />;
  }

  // Image background - render as <image> element
  if (bg.type === "image" && bg.imageUrl) {
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
  const { slideSize } = useRenderContext();
  const bg = useBackground();

  const width = widthOverride ?? slideSize.width;
  const height = heightOverride ?? slideSize.height;

  // No background - render fallback
  if (!bg.hasBackground) {
    return <rect width={width} height={height} fill={fallbackColor} className={className} />;
  }

  // Image background
  if (bg.type === "image" && bg.imageUrl) {
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
      {bg.defElement && <defs>{bg.defElement}</defs>}
      <rect width={width} height={height} fill={bg.fill} className={className} />
    </>
  );
}
