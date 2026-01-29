/**
 * @file Unit tests for bevel-filter
 */

import { getBevelOffsets } from "./bevel-filter";

// =============================================================================
// getBevelOffsets Tests
// =============================================================================

describe("getBevelOffsets", () => {
  it("returns correct offsets for top-left light", () => {
    const result = getBevelOffsets("tl");
    expect(result.highlightOffset).toEqual({ x: -1, y: -1 });
    expect(result.shadowOffset).toEqual({ x: 1, y: 1 });
  });

  it("returns correct offsets for top light", () => {
    const result = getBevelOffsets("t");
    expect(result.highlightOffset).toEqual({ x: 0, y: -1 });
    expect(result.shadowOffset).toEqual({ x: 0, y: 1 });
  });

  it("returns correct offsets for top-right light", () => {
    const result = getBevelOffsets("tr");
    expect(result.highlightOffset).toEqual({ x: 1, y: -1 });
    expect(result.shadowOffset).toEqual({ x: -1, y: 1 });
  });

  it("returns correct offsets for left light", () => {
    const result = getBevelOffsets("l");
    expect(result.highlightOffset).toEqual({ x: -1, y: 0 });
    expect(result.shadowOffset).toEqual({ x: 1, y: 0 });
  });

  it("returns correct offsets for right light", () => {
    const result = getBevelOffsets("r");
    expect(result.highlightOffset).toEqual({ x: 1, y: 0 });
    expect(result.shadowOffset).toEqual({ x: -1, y: 0 });
  });

  it("returns correct offsets for bottom-left light", () => {
    const result = getBevelOffsets("bl");
    expect(result.highlightOffset).toEqual({ x: -1, y: 1 });
    expect(result.shadowOffset).toEqual({ x: 1, y: -1 });
  });

  it("returns correct offsets for bottom light", () => {
    const result = getBevelOffsets("b");
    expect(result.highlightOffset).toEqual({ x: 0, y: 1 });
    expect(result.shadowOffset).toEqual({ x: 0, y: -1 });
  });

  it("returns correct offsets for bottom-right light", () => {
    const result = getBevelOffsets("br");
    expect(result.highlightOffset).toEqual({ x: 1, y: 1 });
    expect(result.shadowOffset).toEqual({ x: -1, y: -1 });
  });

  it("returns default (top-left) offsets for unknown direction", () => {
    const result = getBevelOffsets("unknown");
    expect(result.highlightOffset).toEqual({ x: -1, y: -1 });
    expect(result.shadowOffset).toEqual({ x: 1, y: 1 });
  });
});
