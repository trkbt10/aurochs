/**
 * @file VirtualScroll tests
 */

// @vitest-environment jsdom

import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { triggerResizeObservers } from "../../../spec/test-utils/resize-observer";
import { VirtualScroll } from "./VirtualScroll";
import { useVirtualScrollContext } from "./VirtualScrollContext";

function createResizeObserverEntry(width: number, height: number): ResizeObserverEntry {
  const target = document.createElement("div");
  const rect = new DOMRect(0, 0, width, height);
  const size = [{ inlineSize: width, blockSize: height }];
  return {
    target,
    contentRect: rect,
    borderBoxSize: size,
    contentBoxSize: size,
    devicePixelContentBoxSize: size,
  };
}

function Debugger() {
  const { scrollTop, scrollLeft, maxScrollTop, maxScrollLeft } = useVirtualScrollContext();
  return (
    <div>
      <div data-testid="scrollTop">{scrollTop}</div>
      <div data-testid="scrollLeft">{scrollLeft}</div>
      <div data-testid="maxScrollTop">{maxScrollTop}</div>
      <div data-testid="maxScrollLeft">{maxScrollLeft}</div>
    </div>
  );
}

describe("VirtualScroll", () => {
  it("updates scrollTop/Left via wheel and clamps to max", async () => {
    const { container, getByTestId } = render(
      <VirtualScroll contentWidth={1000} contentHeight={1000}>
        <Debugger />
      </VirtualScroll>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(100, 80)]);
    });

    await waitFor(() => {
      expect(getByTestId("maxScrollTop").textContent).toBe("920");
      expect(getByTestId("maxScrollLeft").textContent).toBe("900");
    });

    const scrollRoot = container.firstElementChild as HTMLElement;
    act(() => {
      fireEvent.wheel(scrollRoot, { deltaX: 10, deltaY: 30, cancelable: true });
    });

    await waitFor(() => {
      expect(getByTestId("scrollTop").textContent).toBe("30");
      expect(getByTestId("scrollLeft").textContent).toBe("10");
    });

    act(() => {
      fireEvent.wheel(scrollRoot, { deltaX: 9999, deltaY: 9999, cancelable: true });
    });

    await waitFor(() => {
      expect(getByTestId("scrollTop").textContent).toBe("920");
      expect(getByTestId("scrollLeft").textContent).toBe("900");
    });
  });

  it("supports keyboard scrolling", async () => {
    const { container, getByTestId } = render(
      <VirtualScroll contentWidth={1000} contentHeight={1000}>
        <Debugger />
      </VirtualScroll>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(100, 80)]);
    });

    const scrollRoot = container.firstElementChild as HTMLElement;
    await waitFor(() => {
      expect(getByTestId("maxScrollTop").textContent).toBe("920");
    });

    act(() => {
      fireEvent.keyDown(scrollRoot, { key: "End" });
    });

    await waitFor(() => {
      expect(getByTestId("scrollTop").textContent).toBe("920");
    });
  });

  it("clamps scroll positions when content shrinks", async () => {
    const { container, getByTestId, rerender } = render(
      <VirtualScroll contentWidth={1000} contentHeight={1000}>
        <Debugger />
      </VirtualScroll>,
    );

    act(() => {
      triggerResizeObservers([createResizeObserverEntry(100, 80)]);
    });

    const scrollRoot = container.firstElementChild as HTMLElement;
    await waitFor(() => {
      expect(getByTestId("maxScrollTop").textContent).toBe("920");
    });

    act(() => {
      fireEvent.wheel(scrollRoot, { deltaX: 9999, deltaY: 9999, cancelable: true });
    });

    await waitFor(() => {
      expect(getByTestId("scrollTop").textContent).toBe("920");
      expect(getByTestId("scrollLeft").textContent).toBe("900");
    });

    rerender(
      <VirtualScroll contentWidth={200} contentHeight={200}>
        <Debugger />
      </VirtualScroll>,
    );

    await waitFor(() => {
      expect(getByTestId("maxScrollTop").textContent).toBe("120");
      expect(getByTestId("maxScrollLeft").textContent).toBe("100");
      expect(getByTestId("scrollTop").textContent).toBe("120");
      expect(getByTestId("scrollLeft").textContent).toBe("100");
    });
  });
});
