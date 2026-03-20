/**
 * @file Tests for useTextEditHandlers hook
 *
 * Verifies the shared text edit commit/cancel logic that is the
 * Single Source of Truth for both pptx-editor and potx-editor.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { TextBody } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createActiveTextEditState, createInactiveTextEditState } from "./input-support/state";
import { useTextEditHandlers } from "./use-text-edit-handlers";

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
        onCommit: vi.fn(),
        onExit: vi.fn(),
      }),
    );
    expect(result.current.editingShapeId).toBeUndefined();
  });

  it("editingShapeId matches active state shapeId", () => {
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({
        textEditState: state,
        onCommit: vi.fn(),
        onExit: vi.fn(),
      }),
    );
    expect(result.current.editingShapeId).toBe("shape-1");
  });

  it("handleTextEditCancel calls onExit without onCommit", () => {
    const onCommit = vi.fn();
    const onExit = vi.fn();
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({ textEditState: state, onCommit, onExit }),
    );

    act(() => result.current.handleTextEditCancel());

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("handleTextEditComplete with unchanged text calls onExit only", () => {
    const onCommit = vi.fn();
    const onExit = vi.fn();
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({ textEditState: state, onCommit, onExit }),
    );

    act(() => result.current.handleTextEditComplete("Hello"));

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("handleTextEditComplete with changed text calls onCommit then onExit", () => {
    const onCommit = vi.fn();
    const onExit = vi.fn();
    const state = createActiveTextEditState("shape-1" as ShapeId, BOUNDS, makeTextBody("Hello"));
    const { result } = renderHook(() =>
      useTextEditHandlers({ textEditState: state, onCommit, onExit }),
    );

    act(() => result.current.handleTextEditComplete("Updated"));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("shape-1", expect.objectContaining({
      paragraphs: expect.arrayContaining([
        expect.objectContaining({
          runs: expect.arrayContaining([
            expect.objectContaining({ text: "Updated" }),
          ]),
        }),
      ]),
    }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("handleTextEditComplete when inactive still calls onExit", () => {
    const onCommit = vi.fn();
    const onExit = vi.fn();
    const { result } = renderHook(() =>
      useTextEditHandlers({
        textEditState: createInactiveTextEditState(),
        onCommit,
        onExit,
      }),
    );

    act(() => result.current.handleTextEditComplete("Anything"));

    expect(onCommit).not.toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
