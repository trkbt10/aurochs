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
      const availableWidth = stage.clientWidth;
      const availableHeight = stage.clientHeight;
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
