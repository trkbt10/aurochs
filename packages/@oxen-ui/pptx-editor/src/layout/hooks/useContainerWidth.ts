/**
 * @file useContainerWidth
 *
 * Measures an element's content width using ResizeObserver.
 * Used for responsive editor layout (desktop/tablet/mobile) without relying on window width.
 */

import { useEffect, useState, type RefObject } from "react";

/**
 * Returns the current rendered width (px) of the given container element.
 * Falls back to `0` until the element is mounted and measured.
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      setWidth(Math.round(rect.width));
    };

    update();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (observer) {
      observer.observe(node);
    }

    return () => {
      observer?.disconnect();
    };
  }, [ref]);

  return width;
}
