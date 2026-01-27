/**
 * @file DocxTextInputFrame unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import type { DocxTextInputFrameProps } from "./DocxTextInputFrame";

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

  // React may hit old-IE input polyfill paths depending on environment feature detection.
  // Provide no-op stubs so event wiring doesn't crash under Bun's runtime.
  const htmlElementProto = jsdomWindow.HTMLElement.prototype as unknown as {
    attachEvent?: (name: string, handler: EventListenerOrEventListenerObject) => void;
    detachEvent?: (name: string, handler: EventListenerOrEventListenerObject) => void;
  };
  htmlElementProto.attachEvent ??= () => {};
  htmlElementProto.detachEvent ??= () => {};
}

ensureDom();
const React = await import("react");
const { render, fireEvent, waitFor } = await import("@testing-library/react");
const { DocxTextInputFrame } = await import("./DocxTextInputFrame");

describe("DocxTextInputFrame", () => {
  function renderFrame(overrides?: Partial<DocxTextInputFrameProps>) {
    const textareaRef = React.createRef<HTMLTextAreaElement>();

    const utils = render(
      <DocxTextInputFrame
        value="Hello"
        selectionStart={0}
        selectionEnd={0}
        onChange={vi.fn()}
        onSelect={vi.fn()}
        onKeyDown={vi.fn()}
        onCompositionStart={vi.fn()}
        onCompositionEnd={vi.fn()}
        onBlur={vi.fn()}
        textareaRef={textareaRef}
        {...overrides}
      />
    );

    const textarea = utils.container.querySelector("textarea");
    if (!textarea) {
      throw new Error("Expected textarea to be rendered");
    }

    return { ...utils, textarea: textarea as HTMLTextAreaElement, textareaRef };
  }

  it("renders an invisible textarea", () => {
    const { textarea } = renderFrame();

    expect(textarea.className).toContain("docx-text-input-frame");
    expect(textarea.style.opacity).toBe("0");
    expect(textarea.style.caretColor).toBe("transparent");
    expect(textarea.style.pointerEvents).toBe("auto");
  });

  it("auto-focuses on mount", async () => {
    const { textarea } = renderFrame();

    await waitFor(() => {
      expect(document.activeElement).toBe(textarea);
    });
  });

  it("keeps selection range in sync", async () => {
    const { textarea } = renderFrame({ selectionStart: 1, selectionEnd: 4 });

    await waitFor(() => {
      expect(textarea.selectionStart).toBe(1);
      expect(textarea.selectionEnd).toBe(4);
    });
  });

  it("calls onChange when text is entered", async () => {
    const onChange = vi.fn();
    const { textarea } = renderFrame({ onChange });

    fireEvent.change(textarea, { target: { value: "Hello!" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect when selection changes", () => {
    const onSelect = vi.fn();
    const { textarea } = renderFrame({ onSelect });

    textarea.setSelectionRange(1, 3);
    fireEvent.select(textarea);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("calls composition start/end callbacks", () => {
    const onCompositionStart = vi.fn();
    const onCompositionEnd = vi.fn();
    const { textarea } = renderFrame({ onCompositionStart, onCompositionEnd });

    fireEvent.compositionStart(textarea);
    fireEvent.compositionEnd(textarea);

    expect(onCompositionStart).toHaveBeenCalledTimes(1);
    expect(onCompositionEnd).toHaveBeenCalledTimes(1);
  });

  it("calls onBlur when focus is lost", () => {
    const onBlur = vi.fn();
    const { textarea } = renderFrame({ onBlur });

    fireEvent.blur(textarea);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
