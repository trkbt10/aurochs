/**
 * @file Creation types tests
 *
 * Tests for isSameMode and createSelectMode.
 */

import type { CreationMode as _CreationMode } from "./creation-types";
import { createSelectMode, isSameMode } from "./creation-types";

describe("createSelectMode", () => {
  it("returns select mode", () => {
    expect(createSelectMode()).toEqual({ type: "select" });
  });
});

describe("isSameMode", () => {
  it("returns true for identical select modes", () => {
    expect(isSameMode({ type: "select" }, { type: "select" })).toBe(true);
  });

  it("returns false for different types", () => {
    expect(isSameMode({ type: "select" }, { type: "textbox" })).toBe(false);
  });

  it("compares shape preset", () => {
    expect(isSameMode({ type: "shape", preset: "rect" }, { type: "shape", preset: "rect" })).toBe(true);
    expect(isSameMode({ type: "shape", preset: "rect" }, { type: "shape", preset: "ellipse" })).toBe(false);
  });

  it("compares table rows/cols", () => {
    expect(isSameMode({ type: "table", rows: 2, cols: 3 }, { type: "table", rows: 2, cols: 3 })).toBe(true);
    expect(isSameMode({ type: "table", rows: 2, cols: 3 }, { type: "table", rows: 4, cols: 3 })).toBe(false);
  });

  it("compares chart type", () => {
    expect(isSameMode({ type: "chart", chartType: "bar" }, { type: "chart", chartType: "bar" })).toBe(true);
    expect(isSameMode({ type: "chart", chartType: "bar" }, { type: "chart", chartType: "pie" })).toBe(false);
  });

  it("compares diagram type", () => {
    expect(isSameMode({ type: "diagram", diagramType: "process" }, { type: "diagram", diagramType: "process" })).toBe(true);
    expect(isSameMode({ type: "diagram", diagramType: "process" }, { type: "diagram", diagramType: "cycle" })).toBe(false);
  });

  it("pencil modes match regardless of smoothing", () => {
    expect(isSameMode({ type: "pencil", smoothing: "low" }, { type: "pencil", smoothing: "high" })).toBe(true);
  });

  it("simple modes match", () => {
    expect(isSameMode({ type: "textbox" }, { type: "textbox" })).toBe(true);
    expect(isSameMode({ type: "connector" }, { type: "connector" })).toBe(true);
    expect(isSameMode({ type: "picture" }, { type: "picture" })).toBe(true);
    expect(isSameMode({ type: "pen" }, { type: "pen" })).toBe(true);
    expect(isSameMode({ type: "path-edit" }, { type: "path-edit" })).toBe(true);
  });
});
