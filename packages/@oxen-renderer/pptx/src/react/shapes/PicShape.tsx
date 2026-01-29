/**
 * @file PicShape (Picture) Renderer
 *
 * Renders p:pic elements as React SVG components.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.37 (p:pic)
 */

import { memo, useMemo } from "react";
import type { PicShape as PicShapeType, Transform } from "@oxen-office/pptx/domain";
import type { ShapeId } from "@oxen-office/pptx/domain/types";
import { useRenderResources, useRenderResourceStore } from "../context";
import { buildTransformAttr } from "./transform";
import { resolveImageUrl } from "../../utils/image-conversion";

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
function PicShapeRendererBase({
  shape,
  width,
  height,
  shapeId,
}: PicShapeRendererProps) {
  const resources = useRenderResources();
  const resourceStore = useRenderResourceStore();
  const { blipFill, properties } = shape;

  // Use ResourceStore (centralized) > runtime resolver (fallback)
  const imagePath = useMemo(
    () => resolveImageUrl(
      blipFill.resourceId,
      resourceStore,
      (rId) => resources.resolve(rId),
    ),
    [blipFill.resourceId, resources, resourceStore],
  );
  if (imagePath === undefined) {
    return null;
  }

  const srcRect = blipFill.sourceRect;
  const transformValue = useMemo(
    () => buildTransformAttr(properties.transform, width, height),
    [properties.transform, width, height],
  );
  const clipId = useMemo(
    () => `pic-clip-${shapeId ?? "unknown"}`,
    [shapeId],
  );
  const hasCrop = srcRect !== undefined
    && (srcRect.left !== 0 || srcRect.top !== 0 || srcRect.right !== 0 || srcRect.bottom !== 0);
  const croppedLayout = useMemo(() => {
    if (!hasCrop || srcRect === undefined) {
      return null;
    }
    return calculateCroppedImageLayout(width, height, srcRect);
  }, [hasCrop, width, height, srcRect?.left, srcRect?.top, srcRect?.right, srcRect?.bottom]);

  // Check if we have cropping
  if (hasCrop && croppedLayout !== null) {
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

function areTransformsEqual(a: Transform | undefined, b: Transform | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined) {
    return false;
  }

  const ax = a.x ?? 0;
  const ay = a.y ?? 0;
  const aRotation = a.rotation ?? 0;
  const aFlipH = a.flipH ?? false;
  const aFlipV = a.flipV ?? false;

  const bx = b.x ?? 0;
  const by = b.y ?? 0;
  const bRotation = b.rotation ?? 0;
  const bFlipH = b.flipH ?? false;
  const bFlipV = b.flipV ?? false;

  return ax === bx
    && ay === by
    && aRotation === bRotation
    && aFlipH === bFlipH
    && aFlipV === bFlipV;
}

function areSourceRectsEqual(
  a: PicShapeType["blipFill"]["sourceRect"] | undefined,
  b: PicShapeType["blipFill"]["sourceRect"] | undefined,
): boolean {
  if (a === b) {
    return true;
  }

  const aLeft = a?.left ?? 0;
  const aTop = a?.top ?? 0;
  const aRight = a?.right ?? 0;
  const aBottom = a?.bottom ?? 0;

  const bLeft = b?.left ?? 0;
  const bTop = b?.top ?? 0;
  const bRight = b?.right ?? 0;
  const bBottom = b?.bottom ?? 0;

  return aLeft === bLeft
    && aTop === bTop
    && aRight === bRight
    && aBottom === bBottom;
}

function arePicShapePropsEqual(prev: PicShapeRendererProps, next: PicShapeRendererProps): boolean {
  if (prev === next) {
    return true;
  }

  if (prev.width !== next.width || prev.height !== next.height || prev.shapeId !== next.shapeId) {
    return false;
  }

  if (prev.shape.blipFill.resourceId !== next.shape.blipFill.resourceId) {
    return false;
  }

  if (!areSourceRectsEqual(prev.shape.blipFill.sourceRect, next.shape.blipFill.sourceRect)) {
    return false;
  }

  return areTransformsEqual(prev.shape.properties.transform, next.shape.properties.transform);
}

/**
 * Renders a picture (p:pic) as React SVG elements.
 */
export const PicShapeRenderer = memo(PicShapeRendererBase, arePicShapePropsEqual);
