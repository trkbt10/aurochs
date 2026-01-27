/**
 * @file Path drawing state tests
 */

import { describe, it, expect } from "vitest";
import { px } from "@oxen/ooxml/domain/units";
import {
  createIdlePathDrawState,
  createDrawingPathDrawState,
  isPathDrawIdle,
  isPathDrawDrawing,
  setPreviewPoint,
  type DrawingPathDrawState,
} from "./path-draw";

describe("createIdlePathDrawState", () => {
  it("creates idle state", () => {
    const state = createIdlePathDrawState();
    expect(state.type).toBe("idle");
  });
});

describe("createDrawingPathDrawState", () => {
  it("creates drawing state", () => {
    const state = createDrawingPathDrawState();
    expect(state.type).toBe("drawing");
    expect(state.path.points).toEqual([]);
  });
});

describe("type guards", () => {
  it("isPathDrawIdle returns true for idle", () => {
    expect(isPathDrawIdle(createIdlePathDrawState())).toBe(true);
  });

  it("isPathDrawDrawing returns true for drawing", () => {
    expect(isPathDrawDrawing(createDrawingPathDrawState())).toBe(true);
  });
});

describe("setPreviewPoint", () => {
  it("sets preview point for drawing state", () => {
    const state: DrawingPathDrawState = createDrawingPathDrawState();
    const next = setPreviewPoint(state, { x: px(10), y: px(20) });
    expect(next.previewPoint).toEqual({ x: px(10), y: px(20) });
  });
});

