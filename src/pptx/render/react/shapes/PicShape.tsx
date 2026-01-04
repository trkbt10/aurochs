/**
 * @file PicShape (Picture) Renderer
 *
 * Renders p:pic elements as React SVG components.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.37 (p:pic)
 */

import type { PicShape as PicShapeType } from "../../../domain";
import type { ShapeId } from "../../../domain/types";
import { useRenderContext } from "../context";
import { buildTransformAttr } from "./transform";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PicShapeRenderer
 */
export type PicShapeRendererProps = {
  /** Shape to render */
  readonly shape: PicShapeType;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Shape ID for data attribute */
  readonly shapeId?: ShapeId;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate image position and size for a:srcRect cropping
 *
 * Per ECMA-376 Part 1, Section 20.1.8.55 (a:srcRect):
 * - l, t, r, b specify percentages of the image to crop from each side
 * - Values are in 1/1000ths of a percent (0-100000)
 */
function calculateCroppedImageLayout(
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
 * Renders a picture (p:pic) as React SVG elements.
 */
export function PicShapeRenderer({
  shape,
  width,
  height,
  shapeId,
}: PicShapeRendererProps) {
  const { resources } = useRenderContext();
  const { blipFill, properties } = shape;

  const imagePath = resources.resolve(blipFill.resourceId);
  if (imagePath === undefined) {
    return null;
  }

  const srcRect = blipFill.sourceRect;
  const transformValue = buildTransformAttr(properties.transform, width, height);

  // Check if we have cropping
  if (srcRect && (srcRect.left !== 0 || srcRect.top !== 0 || srcRect.right !== 0 || srcRect.bottom !== 0)) {
    const layout = calculateCroppedImageLayout(width, height, srcRect);
    const clipId = `pic-clip-${shapeId ?? "unknown"}`;

    return (
      <g
        transform={transformValue || undefined}
        data-shape-id={shapeId}
        data-shape-type="pic"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={width} height={height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <image
            href={imagePath}
            x={layout.x}
            y={layout.y}
            width={layout.width}
            height={layout.height}
            preserveAspectRatio="none"
          />
        </g>
      </g>
    );
  }

  // Simple case: no cropping
  return (
    <g
      transform={transformValue || undefined}
      data-shape-id={shapeId}
      data-shape-type="pic"
    >
      <image
        href={imagePath}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="none"
      />
    </g>
  );
}
