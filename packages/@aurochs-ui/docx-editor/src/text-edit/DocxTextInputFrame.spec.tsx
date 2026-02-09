/**
 * @file DocxTextInputFrame unit tests
 */

// @vitest-environment jsdom

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import type { DocxTextInputFrameProps } from "./DocxTextInputFrame";
import { DocxTextInputFrame } from "./DocxTextInputFrame";

type CallTracker<TArgs extends readonly unknown[]> = {
  readonly calls: readonly TArgs[];
  readonly fn: (...args: TArgs) => void;
};

function createCallTracker<TArgs extends readonly unknown[]>(): CallTracker<TArgs> {
  const calls: TArgs[] = [];
  return {
    calls,
    fn: (...args) => {
      calls.push(args);
    },
  };
}

describe("DocxTextInputFrame", () => {
  function renderFrame(overrides?: Partial<DocxTextInputFrameProps>) {
    const textareaRef = React.createRef<HTMLTextAreaElement>();
    const onChange = createCallTracker<[React.ChangeEvent<HTMLTextAreaElement>]>();
    const onSelect = createCallTracker<[]>();
    const onKeyDown = createCallTracker<[React.KeyboardEvent<HTMLTextAreaElement>]>();
    const onCompositionStart = createCallTracker<[]>();
    const onCompositionEnd = createCallTracker<[]>();
    const onBlur = createCallTracker<[]>();

    const utils = render(
      <DocxTextInputFrame
        value="Hello"
        selectionStart={0}
        selectionEnd={0}
        onChange={onChange.fn}
        onSelect={onSelect.fn}
        onKeyDown={onKeyDown.fn}
        onCompositionStart={onCompositionStart.fn}
        onCompositionEnd={onCompositionEnd.fn}
        onBlur={onBlur.fn}
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
    const onChange = createCallTracker<[React.ChangeEvent<HTMLTextAreaElement>]>();
    const { textarea } = renderFrame({ onChange: onChange.fn });

    fireEvent.change(textarea, { target: { value: "Hello!" } });
    expect(onChange.calls.length).toBe(1);
  });

  it("calls onSelect when selection changes", () => {
    const onSelect = createCallTracker<[]>();
    const { textarea } = renderFrame({ onSelect: onSelect.fn });

    textarea.setSelectionRange(1, 3);
    fireEvent.select(textarea);

    expect(onSelect.calls.length).toBe(1);
  });

  it("calls composition start/end callbacks", () => {
    const onCompositionStart = createCallTracker<[]>();
    const onCompositionEnd = createCallTracker<[]>();
    const { textarea } = renderFrame({
      onCompositionStart: onCompositionStart.fn,
      onCompositionEnd: onCompositionEnd.fn,
    });

    fireEvent.compositionStart(textarea);
    fireEvent.compositionEnd(textarea);

    expect(onCompositionStart.calls.length).toBe(1);
    expect(onCompositionEnd.calls.length).toBe(1);
  });

  it("calls onBlur when focus is lost", () => {
    const onBlur = createCallTracker<[]>();
    const { textarea } = renderFrame({ onBlur: onBlur.fn });

    fireEvent.blur(textarea);
    expect(onBlur.calls.length).toBe(1);
  });
});
