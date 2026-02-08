/**
 * @file Scrollbar
 *
 * A small custom scrollbar used by VirtualScroll.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { colorTokens, radiusTokens } from "../design-tokens";

export type ScrollbarProps = {
  readonly orientation: "vertical" | "horizontal";
  readonly size: number;
  readonly viewportSize: number;
  readonly scrollPosition: number;
  readonly onScrollChange: (position: number) => void;
};

const trackBaseStyle: CSSProperties = {
  position: "absolute",
  zIndex: 10,
  userSelect: "none",
  backgroundColor: `color-mix(in srgb, var(--bg-primary, ${colorTokens.background.primary}) 70%, transparent)`,
};

const thumbBaseStyle: CSSProperties = {
  position: "absolute",
  cursor: "pointer",
  borderRadius: radiusTokens.md,
  backgroundColor: `color-mix(in srgb, var(--text-secondary, ${colorTokens.text.secondary}) 35%, transparent)`,
};

function getTrackStyle(
  orientation: "vertical" | "horizontal",
  thicknessPx: number,
): CSSProperties {
  if (orientation === "vertical") {
    return { top: 0, bottom: 0, right: 0, width: thicknessPx };
  }
  return { left: 0, right: 0, bottom: 0, height: thicknessPx };
}

function getThumbStyle(
  orientation: "vertical" | "horizontal",
  thumbPosition: number,
  thumbSize: number,
): CSSProperties {
  if (orientation === "vertical") {
    return { top: thumbPosition, height: thumbSize, left: 0, right: 0, minHeight: 20 };
  }
  return { left: thumbPosition, width: thumbSize, top: 0, bottom: 0, minWidth: 20 };
}

function getThumbBackgroundColor(isDragging: boolean): string {
  if (isDragging) {
    return `color-mix(in srgb, var(--text-secondary, ${colorTokens.text.secondary}) 55%, transparent)`;
  }
  return `color-mix(in srgb, var(--text-secondary, ${colorTokens.text.secondary}) 35%, transparent)`;
}

function ScrollbarInner({
  orientation,
  viewportSize,
  maxScroll,
  scrollPosition,
  onScrollChange,
  thumbSize,
  thumbPosition,
}: {
  readonly orientation: "vertical" | "horizontal";
  readonly viewportSize: number;
  readonly maxScroll: number;
  readonly scrollPosition: number;
  readonly onScrollChange: (position: number) => void;
  readonly thumbSize: number;
  readonly thumbPosition: number;
}): React.ReactElement {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const [dragStartScroll, setDragStartScroll] = useState(0);

  const thicknessPx = 12;

  const trackStyle: CSSProperties = {
    ...trackBaseStyle,
    ...getTrackStyle(orientation, thicknessPx),
  };

  const thumbStyle: CSSProperties = {
    ...thumbBaseStyle,
    ...getThumbStyle(orientation, thumbPosition, thumbSize),
  };

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      if (!trackRef.current) {
        return;
      }

      const rect = trackRef.current.getBoundingClientRect();
      const clickPosition = orientation === "vertical" ? event.clientY - rect.top : event.clientX - rect.left;
      const trackSize = orientation === "vertical" ? rect.height : rect.width;

      const targetThumbCenter = clickPosition - thumbSize / 2;
      const scrollRatio = targetThumbCenter / (trackSize - thumbSize);
      const next = Math.max(0, Math.min(maxScroll, scrollRatio * maxScroll));
      onScrollChange(next);
    },
    [orientation, maxScroll, onScrollChange, thumbSize],
  );

  const handleThumbMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      event.stopPropagation();
      setIsDragging(true);
      setDragStartPosition(orientation === "vertical" ? event.clientY : event.clientX);
      setDragStartScroll(scrollPosition);
    },
    [orientation, scrollPosition],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const onMouseMove = (event: globalThis.MouseEvent): void => {
      const currentPosition = orientation === "vertical" ? event.clientY : event.clientX;
      const delta = currentPosition - dragStartPosition;
      const scrollDelta = (delta / (viewportSize - thumbSize)) * maxScroll;
      const next = Math.max(0, Math.min(maxScroll, dragStartScroll + scrollDelta));
      onScrollChange(next);
    };

    const onMouseUp = (): void => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    dragStartPosition,
    dragStartScroll,
    isDragging,
    orientation,
    maxScroll,
    onScrollChange,
    thumbSize,
    viewportSize,
  ]);

  return (
    <div ref={trackRef} style={trackStyle} onClick={handleTrackClick}>
      <div
        style={{
          ...thumbStyle,
          backgroundColor: getThumbBackgroundColor(isDragging),
        }}
        onMouseDown={handleThumbMouseDown}
      />
    </div>
  );
}

/**
 * Render a scrollbar when content size exceeds viewport size.
 */
export function Scrollbar({
  orientation,
  size,
  viewportSize,
  scrollPosition,
  onScrollChange,
}: ScrollbarProps): React.ReactElement | null {
  const maxScroll = Math.max(0, size - viewportSize);
  if (maxScroll <= 0 || viewportSize <= 0 || size <= 0) {
    return null;
  }

  const thumbSize = (viewportSize / size) * viewportSize;
  if (thumbSize >= viewportSize) {
    return null;
  }

  const thumbPosition = (scrollPosition / maxScroll) * (viewportSize - thumbSize);

  return (
    <ScrollbarInner
      orientation={orientation}
      viewportSize={viewportSize}
      maxScroll={maxScroll}
      scrollPosition={scrollPosition}
      onScrollChange={onScrollChange}
      thumbSize={thumbSize}
      thumbPosition={thumbPosition}
    />
  );
}
