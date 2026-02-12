/**
 * @file Floating Image Overlay Component
 *
 * Renders positioned floating images (from FloatingImageConfig) as SVG elements.
 * This component handles the rendering of anchor drawings that have been positioned by the layout engine.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.3 (wp:anchor)
 */

import { memo, useMemo } from "react";
import type { PositionedFloatingImage } from "@aurochs-office/text-layout";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for FloatingImageOverlay component.
 */
export type FloatingImageOverlayProps = {
  /** Array of positioned floating images to render */
  readonly images: readonly PositionedFloatingImage[];
  /** Unique ID prefix for clip paths */
  readonly idPrefix?: string;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if srcRect has non-zero cropping values.
 */
function hasCropping(srcRect: { left: number; top: number; right: number; bottom: number } | undefined): boolean {
  return srcRect !== undefined && (srcRect.left !== 0 || srcRect.top !== 0 || srcRect.right !== 0 || srcRect.bottom !== 0);
}

/**
 * Calculate image position and size for srcRect cropping.
 */
function calculateCroppedLayout(
  width: number,
  height: number,
  srcRect: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number; width: number; height: number } {
  const visibleWidthPct = 100 - srcRect.left - srcRect.right;
  const visibleHeightPct = 100 - srcRect.top - srcRect.bottom;

  const safeVisibleWidthPct = Math.max(visibleWidthPct, 0.001);
  const safeVisibleHeightPct = Math.max(visibleHeightPct, 0.001);

  const imageWidth = width * (100 / safeVisibleWidthPct);
  const imageHeight = height * (100 / safeVisibleHeightPct);

  const cropX = -imageWidth * (srcRect.left / 100);
  const cropY = -imageHeight * (srcRect.top / 100);

  return { x: cropX, y: cropY, width: imageWidth, height: imageHeight };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a single floating image.
 */
function FloatingImage({ image, clipId }: { image: PositionedFloatingImage; clipId: string }) {
  const width = image.width as number;
  const height = image.height as number;
  const x = image.x as number;
  const y = image.y as number;

  // Skip if no src
  if (image.src === undefined || image.src === "") {
    return null;
  }

  const titleElement = image.alt !== undefined ? <title>{image.alt}</title> : null;

  // Handle cropped images
  if (hasCropping(image.srcRect)) {
    const layout = calculateCroppedLayout(width, height, image.srcRect!);

    return (
      <g
        transform={`translate(${x}, ${y})`}
        data-element-type="floating-image"
        data-behind-doc={image.behindDoc}
        data-relative-height={image.relativeHeight}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={width} height={height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <image
            x={layout.x}
            y={layout.y}
            width={layout.width}
            height={layout.height}
            href={image.src}
            preserveAspectRatio="none"
          >
            {titleElement}
          </image>
        </g>
      </g>
    );
  }

  // Simple case: no cropping
  return (
    <g
      data-element-type="floating-image"
      data-behind-doc={image.behindDoc}
      data-relative-height={image.relativeHeight}
    >
      <image
        x={x}
        y={y}
        width={width}
        height={height}
        href={image.src}
        preserveAspectRatio="none"
      >
        {titleElement}
      </image>
    </g>
  );
}

/**
 * Renders all floating images as an overlay.
 * Images are sorted by z-index (relativeHeight) and behindDoc flag.
 */
function FloatingImageOverlayBase({ images, idPrefix }: FloatingImageOverlayProps) {
  // Sort images: behind doc first, then by relativeHeight
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      // Behind doc images come first (rendered behind text)
      if (a.behindDoc !== b.behindDoc) {
        return a.behindDoc ? -1 : 1;
      }
      // Then sort by relativeHeight
      return a.relativeHeight - b.relativeHeight;
    });
  }, [images]);

  if (sortedImages.length === 0) {
    return null;
  }

  const prefix = idPrefix ?? "float";

  return (
    <>
      {sortedImages.map((image, index) => (
        <FloatingImage
          key={`${prefix}-${index}`}
          image={image}
          clipId={`${prefix}-clip-${index}`}
        />
      ))}
    </>
  );
}

/**
 * Memoized FloatingImageOverlay component.
 */
export const FloatingImageOverlay = memo(FloatingImageOverlayBase);
