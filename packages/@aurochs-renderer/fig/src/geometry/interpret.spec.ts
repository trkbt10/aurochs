/**
 * @file Geometry interpretation SoT tests
 *
 * Verifies the shared geometry functions consumed by both renderers.
 */

import { mapWindingRule, extractUniformCornerRadius, clampCornerRadius, resolveClipsContent } from "./interpret";

describe("mapWindingRule", () => {
  it("maps NONZERO string", () => {
    expect(mapWindingRule("NONZERO")).toBe("nonzero");
  });

  it("maps EVENODD string", () => {
    expect(mapWindingRule("EVENODD")).toBe("evenodd");
  });

  it("maps ODD string to evenodd", () => {
    expect(mapWindingRule("ODD")).toBe("evenodd");
  });

  it("handles KiwiEnumValue", () => {
    expect(mapWindingRule({ value: 0, name: "NONZERO" })).toBe("nonzero");
    expect(mapWindingRule({ value: 1, name: "EVENODD" })).toBe("evenodd");
  });

  it("defaults to nonzero for undefined/null", () => {
    expect(mapWindingRule(undefined)).toBe("nonzero");
    expect(mapWindingRule(null)).toBe("nonzero");
  });
});

describe("extractUniformCornerRadius", () => {
  it("returns cornerRadius when no per-corner radii", () => {
    expect(extractUniformCornerRadius(8, undefined)).toBe(8);
  });

  it("returns undefined when cornerRadius is 0", () => {
    expect(extractUniformCornerRadius(0, undefined)).toBe(0);
  });

  it("returns undefined when both are undefined", () => {
    expect(extractUniformCornerRadius(undefined, undefined)).toBeUndefined();
  });

  it("returns uniform value when all corners equal", () => {
    expect(extractUniformCornerRadius(undefined, [10, 10, 10, 10])).toBe(10);
  });

  it("returns average when corners differ", () => {
    expect(extractUniformCornerRadius(undefined, [0, 10, 0, 10])).toBe(5);
  });

  it("prefers per-corner radii over cornerRadius", () => {
    expect(extractUniformCornerRadius(5, [10, 10, 10, 10])).toBe(10);
  });
});

describe("clampCornerRadius", () => {
  it("returns undefined for zero/undefined radius", () => {
    expect(clampCornerRadius(undefined, 100, 50)).toBeUndefined();
    expect(clampCornerRadius(0, 100, 50)).toBeUndefined();
  });

  it("clamps to min(width, height) / 2", () => {
    expect(clampCornerRadius(100, 40, 60)).toBe(20);
    expect(clampCornerRadius(100, 60, 40)).toBe(20);
  });

  it("passes through when within bounds", () => {
    expect(clampCornerRadius(5, 100, 50)).toBe(5);
  });
});

describe("resolveClipsContent", () => {
  it("returns explicit clipsContent when defined", () => {
    expect(resolveClipsContent(true, undefined, "GROUP")).toBe(true);
    expect(resolveClipsContent(false, undefined, "FRAME")).toBe(false);
  });

  it("falls back to inverted frameMaskDisabled", () => {
    expect(resolveClipsContent(undefined, false, "GROUP")).toBe(true);
    expect(resolveClipsContent(undefined, true, "FRAME")).toBe(false);
  });

  it("defaults based on node type when no explicit values", () => {
    expect(resolveClipsContent(undefined, undefined, "FRAME")).toBe(true);
    expect(resolveClipsContent(undefined, undefined, "COMPONENT")).toBe(true);
    expect(resolveClipsContent(undefined, undefined, "GROUP")).toBe(false);
    expect(resolveClipsContent(undefined, undefined, "RECTANGLE")).toBe(false);
  });
});
