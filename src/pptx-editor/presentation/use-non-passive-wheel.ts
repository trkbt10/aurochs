/**
 * @file Non-passive wheel listener
 *
 * Allows preventDefault on wheel events for custom zoom behavior.
 */

import { useEffect, type RefObject } from "react";

/**
 * Attach a non-passive wheel listener to a target element.
 */
export function useNonPassiveWheel(
  targetRef: RefObject<HTMLElement>,
  onWheel: (event: WheelEvent) => void
): void {
  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    target.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      target.removeEventListener("wheel", onWheel);
    };
  }, [targetRef, onWheel]);
}
