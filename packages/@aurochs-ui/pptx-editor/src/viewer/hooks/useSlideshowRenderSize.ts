/**
 * @file useSlideshowRenderSize
 *
 * Hook for computing slide render size to fit available space.
 */

import { useState, useLayoutEffect, type RefObject } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";

export type RenderSize = {
  readonly width: number;
  readonly height: number;
};

export type UseSlideshowRenderSizeOptions = {
  /** Ref to the stage container element */
  readonly stageRef: RefObject<HTMLElement | null>;
  /** Original slide size */
  readonly slideSize: SlideSize;
};

/**
 * Hook for computing slide render size based on available container space.
 * Maintains aspect ratio while fitting within the container.
 */
export function useSlideshowRenderSize({
  stageRef,
  slideSize,
}: UseSlideshowRenderSizeOptions): RenderSize {
  const [renderSize, setRenderSize] = useState<RenderSize>(() => ({
    width: slideSize.width as number,
    height: slideSize.height as number,
  }));

  useLayoutEffect(() => {
    const stageElement = stageRef.current;
    if (!stageElement) {
      return;
    }

    function updateRenderSize() {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      // Use getBoundingClientRect for accurate dimensions including padding
      const rect = stage.getBoundingClientRect();
      // Account for padding by using clientWidth/clientHeight (content area only)
      const computedStyle = getComputedStyle(stage);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

      const availableWidth = rect.width - paddingLeft - paddingRight;
      const availableHeight = rect.height - paddingTop - paddingBottom;

      if (availableWidth <= 0 || availableHeight <= 0) {
        return;
      }

      if (slideSize.width <= 0 || slideSize.height <= 0) {
        throw new Error("Slide size must be positive to compute preview scale.");
      }

      const scale = Math.min(availableWidth / slideSize.width, availableHeight / slideSize.height);

      const nextWidth = Math.round(slideSize.width * scale);
      const nextHeight = Math.round(slideSize.height * scale);

      setRenderSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    }

    // Call immediately - useLayoutEffect runs synchronously after DOM mutations
    updateRenderSize();

    const resizeObserver = new ResizeObserver(() => {
      updateRenderSize();
    });
    resizeObserver.observe(stageElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [stageRef, slideSize.height, slideSize.width]);

  return renderSize;
}
