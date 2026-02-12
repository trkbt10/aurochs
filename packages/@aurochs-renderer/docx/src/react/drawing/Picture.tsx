/**
 * @file Picture Component for DOCX Drawings
 *
 * Renders pic:pic elements as SVG image elements.
 *
 * @see ECMA-376 Part 1, Section 20.2.2.6 (pic:pic)
 */

import { memo, useMemo } from "react";
import type { DrawingPicture, DrawingBlipFill } from "@aurochs-office/ooxml/domain/drawing";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for Picture component.
 */
export type PictureProps = {
  /** Picture data from drawing */
  readonly picture: DrawingPicture;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Resolved image URL (data URL or path) */
  readonly imageUrl: string | undefined;
  /** Unique ID for clip path */
  readonly clipId?: string;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract source rect percentages from blipFill.
 * Values are stored as 1/1000ths of a percent, convert to percentages.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.55 (a:srcRect)
 */
function extractSourceRect(blipFill: DrawingBlipFill | undefined): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} | undefined {
  const srcRect = blipFill?.srcRect;
  if (srcRect === undefined) {
    return undefined;
  }

  return {
    left: (srcRect.l ?? 0) / 1000,
    top: (srcRect.t ?? 0) / 1000,
    right: (srcRect.r ?? 0) / 1000,
    bottom: (srcRect.b ?? 0) / 1000,
  };
}

/**
 * Calculate image position and size for cropping.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.55 (a:srcRect):
 * - l, t, r, b specify percentages of the image to crop from each side
 */
function calculateCroppedLayout(
  w: number,
  h: number,
  srcRect: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number; width: number; height: number } {
  const visibleWidthPct = 100 - srcRect.left - srcRect.right;
  const visibleHeightPct = 100 - srcRect.top - srcRect.bottom;

  const safeVisibleWidthPct = Math.max(visibleWidthPct, 0.001);
  const safeVisibleHeightPct = Math.max(visibleHeightPct, 0.001);

  const imageWidth = w * (100 / safeVisibleWidthPct);
  const imageHeight = h * (100 / safeVisibleHeightPct);

  const x = -imageWidth * (srcRect.left / 100);
  const y = -imageHeight * (srcRect.top / 100);

  return { x, y, width: imageWidth, height: imageHeight };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a picture (pic:pic) as SVG image element.
 */
function PictureBase({ picture, width, height, imageUrl, clipId }: PictureProps) {
  // Don't render if no image URL
  if (imageUrl === undefined) {
    return null;
  }

  // Extract source rect for cropping
  const srcRect = useMemo(() => extractSourceRect(picture.blipFill), [picture.blipFill]);

  // Check if we need cropping
  const hasCrop = useMemo(() => {
    if (srcRect === undefined) {
      return false;
    }
    return srcRect.left !== 0 || srcRect.top !== 0 || srcRect.right !== 0 || srcRect.bottom !== 0;
  }, [srcRect]);

  // Calculate cropped layout
  const croppedLayout = useMemo(() => {
    if (!hasCrop || srcRect === undefined) {
      return null;
    }
    return calculateCroppedLayout(width, height, srcRect);
  }, [hasCrop, width, height, srcRect]);

  // Generate clip ID
  const effectiveClipId = clipId ?? `pic-clip-${Date.now()}`;

  // Render with cropping
  if (hasCrop && croppedLayout !== null) {
    return (
      <g data-element-type="picture">
        <defs>
          <clipPath id={effectiveClipId}>
            <rect x={0} y={0} width={width} height={height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${effectiveClipId})`}>
          <image
            href={imageUrl}
            x={croppedLayout.x}
            y={croppedLayout.y}
            width={croppedLayout.width}
            height={croppedLayout.height}
            preserveAspectRatio="none"
          />
        </g>
      </g>
    );
  }

  // Simple case: no cropping
  return (
    <image
      href={imageUrl}
      x={0}
      y={0}
      width={width}
      height={height}
      preserveAspectRatio="none"
      data-element-type="picture"
    />
  );
}

/**
 * Memoized Picture component.
 */
export const Picture = memo(PictureBase);
