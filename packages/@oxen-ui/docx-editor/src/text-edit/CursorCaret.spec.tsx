/**
 * @file CursorCaret unit tests
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";

function ensureDom(): void {
  if (typeof document !== "undefined") {
    return;
  }

  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  const jsdomWindow = dom.window as unknown as Window & typeof globalThis;

  Object.defineProperty(globalThis, "window", { value: jsdomWindow, writable: true });
  Object.defineProperty(globalThis, "document", { value: jsdomWindow.document, writable: true });
  Object.defineProperty(globalThis, "self", { value: jsdomWindow, writable: true });
  Object.defineProperty(globalThis, "HTMLElement", { value: jsdomWindow.HTMLElement, writable: true });
  Object.defineProperty(globalThis, "getComputedStyle", { value: jsdomWindow.getComputedStyle, writable: true });

  const maybeNavigator = jsdomWindow.navigator;
  try {
    Object.defineProperty(globalThis, "navigator", { value: maybeNavigator, writable: true });
  } catch {
    // Some runtimes expose `navigator` as a non-writable getter; tests don't require setting it.
  }

  const domGlobals: ReadonlyArray<keyof typeof jsdomWindow> = [
    "Node",
    "Text",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "FocusEvent",
    "InputEvent",
    "CompositionEvent",
  ];
  for (const key of domGlobals) {
    const value = jsdomWindow[key];
    if (value) {
      Object.defineProperty(globalThis, key, { value, writable: true });
    }
  }

  const htmlElementProto = jsdomWindow.HTMLElement.prototype as unknown as {
    attachEvent?: (name: string, handler: EventListenerOrEventListenerObject) => void;
    detachEvent?: (name: string, handler: EventListenerOrEventListenerObject) => void;
  };
  htmlElementProto.attachEvent ??= () => {};
  htmlElementProto.detachEvent ??= () => {};
}

ensureDom();
const React = await import("react");
const { render, act } = await import("@testing-library/react");
const { CursorCaret } = await import("./CursorCaret");

const BLINK_INTERVAL = 530;

describe("CursorCaret", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a caret line at the specified position/height", () => {
    const { container } = render(
      <svg>
        <CursorCaret x={10} y={20} height={30} isBlinking={false} />
      </svg>
    );

    const line = container.querySelector("line");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("x1")).toBe("10");
    expect(line?.getAttribute("y1")).toBe("20");
    expect(line?.getAttribute("x2")).toBe("10");
    expect(line?.getAttribute("y2")).toBe("50");
    expect(line?.getAttribute("stroke")).toBe("var(--text-inverse)");
  });

  it("applies a custom color", () => {
    const { container } = render(
      <svg>
        <CursorCaret x={0} y={0} height={10} isBlinking={false} color="#f00" />
      </svg>
    );

    const line = container.querySelector("line");
    expect(line?.getAttribute("stroke")).toBe("#f00");
  });

  it("blinks when isBlinking=true", () => {
    vi.useFakeTimers();

    const { container } = render(
      <svg>
        <CursorCaret x={0} y={0} height={10} isBlinking={true} />
      </svg>
    );

    expect(container.querySelector("line")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(BLINK_INTERVAL);
    });
    expect(container.querySelector("line")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(BLINK_INTERVAL);
    });
    expect(container.querySelector("line")).not.toBeNull();
  });

  it("stays visible when isBlinking=false", () => {
    vi.useFakeTimers();

    const { container } = render(
      <svg>
        <CursorCaret x={0} y={0} height={10} isBlinking={false} />
      </svg>
    );

    act(() => {
      vi.advanceTimersByTime(BLINK_INTERVAL * 3);
    });
    expect(container.querySelector("line")).not.toBeNull();
  });
});
