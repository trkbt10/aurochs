/**
 * @file VirtualScroll
 */

import type { CSSProperties, ReactNode } from "react";
import { VirtualScrollProvider } from "./VirtualScrollContext";
import { Scrollbar } from "./Scrollbar";
import { useVirtualScroll, type UseVirtualScrollOptions } from "./useVirtualScroll";

export type VirtualScrollProps = UseVirtualScrollOptions & {
  readonly children: ReactNode;
  readonly style?: CSSProperties;
  readonly onKeyDown?: (event: React.KeyboardEvent) => void;
};

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  outline: "none",
};

const viewportStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
};

const contentStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  willChange: "transform",
};

/**
 * Virtual scroll container with custom scrollbars and key handling.
 */
export function VirtualScroll({
  contentWidth,
  contentHeight,
  children,
  style,
  onKeyDown,
}: VirtualScrollProps) {
  const scroll = useVirtualScroll({ contentWidth, contentHeight });
  const {
    containerRef,
    handleKeyDown,
    scrollTop,
    scrollLeft,
    viewportWidth,
    viewportHeight,
    setScrollTop,
    setScrollLeft,
  } = scroll;

  return (
    <VirtualScrollProvider value={scroll}>
      <div
        ref={containerRef}
        data-virtual-scroll-root="true"
        style={{ ...containerStyle, ...style }}
        tabIndex={0}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) {
            return;
          }
          handleKeyDown(event);
        }}
      >
        <div style={viewportStyle}>
          <div style={contentStyle}>{children}</div>
        </div>
        <Scrollbar
          orientation="vertical"
          size={contentHeight}
          viewportSize={viewportHeight}
          scrollPosition={scrollTop}
          onScrollChange={setScrollTop}
        />
        <Scrollbar
          orientation="horizontal"
          size={contentWidth}
          viewportSize={viewportWidth}
          scrollPosition={scrollLeft}
          onScrollChange={setScrollLeft}
        />
      </div>
    </VirtualScrollProvider>
  );
}
