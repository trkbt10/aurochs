/**
 * @file Tests for useTextEditHandlers hook
 *
 * Verifies the shared text edit commit/cancel logic that is the
 * Single Source of Truth for both pptx-editor and potx-editor.
 */

// @vitest-environment jsdom

import { renderHook, act } from "@testing-library/react";
import type { TextBody } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createActiveTextEditState, createInactiveTextEditState } from "./input-support/state";
import { useTextEditHandlers } from "./use-text-edit-handlers";

// =============================================================================
// Fake callback tracker
// =============================================================================

type CallTracker<Args extends unknown[] = unknown[]> = {
  (...args: Args): void;
  readonly calls: Args[];
};

/** Create a fake callback that records its calls */
function createFakeCallback<Args extends unknown[] = unknown[]>(): CallTracker<Args> {
  const calls: Args[] = [];
  const fn = ((...args: Args) => {
    calls.push(args);
  }) as CallTracker<Args>;
  Object.defineProperty(fn, "calls", { get: () => calls });
  return fn;
}

// =============================================================================
// Helpers
// =============================================================================

function makeTextBody(text: string): TextBody {
  return {
    bodyProperties: {},
    paragraphs: [{ properties: {}, runs: [{ type: "text", text }] }],
  };
}

const BOUNDS = { x: px(10), y: px(20), width: px(200), height: px(100), rotation: 0 };

// =============================================================================
// Tests
// =============================================================================

describe("useTextEditHandlers", () => {
  it("editingShapeId is undefined when inactive", () => {
    const { result } = renderHook(() =>
      useTextEditHandlers({
        textEditState: createInactiveTextEditState(),
        onCommit: createFakeCallback(),
        onExit: createFakeCallback(),
      }),
    );
    expect(result.current.editingShapeId).toBeUndefined();
  });

  it("editingShapeId matches active state shapeId", () => {
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({
        textEditState: state,
        onCommit: createFakeCallback(),
        onExit: createFakeCallback(),
      }),
    );
    expect(result.current.editingShapeId).toBe("shape-1");
  });

  it("handleTextEditCancel calls onExit without onCommit", () => {
    const onCommit = createFakeCallback();
    const onExit = createFakeCallback();
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({ textEditState: state, onCommit, onExit }),
    );

    act(() => result.current.handleTextEditCancel());

    expect(onExit.calls).toHaveLength(1);
    expect(onCommit.calls).toHaveLength(0);
  });

  it("handleTextEditComplete with unchanged text calls onExit only", () => {
    const onCommit = createFakeCallback();
    const onExit = createFakeCallback();
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({ textEditState: state, onCommit, onExit }),
    );

    act(() => result.current.handleTextEditComplete("Hello"));

    expect(onExit.calls).toHaveLength(1);
    expect(onCommit.calls).toHaveLength(0);
  });

  it("handleTextEditComplete with changed text calls onCommit then onExit", () => {
    const onCommit = createFakeCallback();
    const onExit = createFakeCallback();
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({ textEditState: state, onCommit, onExit }),
    );

    act(() => result.current.handleTextEditComplete("Updated"));

    expect(onCommit.calls).toHaveLength(1);
    expect(onCommit.calls[0][0]).toBe("shape-1");
    expect(onCommit.calls[0][1]).toEqual(expect.objectContaining({
      paragraphs: expect.arrayContaining([
        expect.objectContaining({
          runs: expect.arrayContaining([
            expect.objectContaining({ text: "Updated" }),
          ]),
        }),
      ]),
    }));
    expect(onExit.calls).toHaveLength(1);
  });

  it("handleTextEditComplete when inactive still calls onExit", () => {
    const onCommit = createFakeCallback();
    const onExit = createFakeCallback();
    const { result } = renderHook(() =>
      useTextEditHandlers({
        textEditState: createInactiveTextEditState(),
        onCommit,
        onExit,
      }),
    );

    act(() => result.current.handleTextEditComplete("Anything"));

    expect(onCommit.calls).toHaveLength(0);
    expect(onExit.calls).toHaveLength(1);
  });
});
