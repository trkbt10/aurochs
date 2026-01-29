/**
 * @file Unit tests for PatternDef
 */

import {
  getTextPatternSize,
  renderTextPatternContent,
} from "./PatternDef";

// =============================================================================
// getTextPatternSize Tests
// =============================================================================

describe("getTextPatternSize", () => {
  it("returns correct size for horizontal patterns", () => {
    expect(getTextPatternSize("horz")).toBe(8);
    expect(getTextPatternSize("ltHorz")).toBe(8);
    expect(getTextPatternSize("dkHorz")).toBe(8);
    expect(getTextPatternSize("narHorz")).toBe(4);
  });

  it("returns correct size for vertical patterns", () => {
    expect(getTextPatternSize("vert")).toBe(8);
    expect(getTextPatternSize("ltVert")).toBe(8);
    expect(getTextPatternSize("dkVert")).toBe(8);
    expect(getTextPatternSize("narVert")).toBe(4);
  });

  it("returns correct size for grid patterns", () => {
    expect(getTextPatternSize("smGrid")).toBe(4);
    expect(getTextPatternSize("lgGrid")).toBe(8);
    expect(getTextPatternSize("cross")).toBe(8);
    expect(getTextPatternSize("dotGrid")).toBe(8);
  });

  it("returns correct size for diagonal patterns", () => {
    expect(getTextPatternSize("upDiag")).toBe(6);
    expect(getTextPatternSize("dnDiag")).toBe(6);
    expect(getTextPatternSize("wdUpDiag")).toBe(8);
    expect(getTextPatternSize("wdDnDiag")).toBe(8);
  });

  it("returns correct size for check patterns", () => {
    expect(getTextPatternSize("smCheck")).toBe(4);
    expect(getTextPatternSize("lgCheck")).toBe(8);
  });

  it("returns 4 for percentage patterns", () => {
    expect(getTextPatternSize("pct5")).toBe(4);
    expect(getTextPatternSize("pct10")).toBe(4);
    expect(getTextPatternSize("pct50")).toBe(4);
  });

  it("returns default size for unknown patterns", () => {
    expect(getTextPatternSize("unknownPattern")).toBe(8);
  });
});

// =============================================================================
// renderTextPatternContent Tests
// =============================================================================

describe("renderTextPatternContent", () => {
  it("returns JSX for horizontal pattern", () => {
    const result = renderTextPatternContent("horz", "#000000", 8);
    expect(result).toBeDefined();
  });

  it("returns JSX for vertical pattern", () => {
    const result = renderTextPatternContent("vert", "#FF0000", 8);
    expect(result).toBeDefined();
  });

  it("returns JSX for grid pattern", () => {
    const result = renderTextPatternContent("smGrid", "#0000FF", 4);
    expect(result).toBeDefined();
  });

  it("returns JSX for diagonal pattern", () => {
    const result = renderTextPatternContent("upDiag", "#00FF00", 6);
    expect(result).toBeDefined();
  });

  it("returns JSX for percentage pattern", () => {
    const result = renderTextPatternContent("pct50", "#FFFFFF", 4);
    expect(result).toBeDefined();
  });

  it("returns fallback JSX for unknown pattern", () => {
    const result = renderTextPatternContent("unknownPattern", "#000000", 8);
    expect(result).toBeDefined();
  });
});
