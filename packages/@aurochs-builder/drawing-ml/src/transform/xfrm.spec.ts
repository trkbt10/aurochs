/** @file Unit tests for transform builder */
import { buildTransform, buildGroupTransform } from "./xfrm";

describe("buildTransform", () => {
  it("builds transform with position and size", () => {
    const t = buildTransform({ x: 10, y: 20, width: 300, height: 200 });
    expect(t.x).toBe(10);
    expect(t.y).toBe(20);
    expect(t.width).toBe(300);
    expect(t.height).toBe(200);
  });

  it("defaults rotation to 0", () => {
    const t = buildTransform({ x: 0, y: 0, width: 100, height: 100 });
    expect(t.rotation).toBe(0);
  });

  it("sets rotation when specified", () => {
    const t = buildTransform({ x: 0, y: 0, width: 100, height: 100, rotation: 45 });
    expect(t.rotation).toBe(45);
  });

  it("defaults flipH and flipV to false", () => {
    const t = buildTransform({ x: 0, y: 0, width: 100, height: 100 });
    expect(t.flipH).toBe(false);
    expect(t.flipV).toBe(false);
  });

  it("sets flipH and flipV when specified", () => {
    const t = buildTransform({ x: 0, y: 0, width: 100, height: 100, flipH: true, flipV: true });
    expect(t.flipH).toBe(true);
    expect(t.flipV).toBe(true);
  });
});

describe("buildGroupTransform", () => {
  it("includes base transform properties", () => {
    const t = buildGroupTransform({ x: 5, y: 10, width: 200, height: 150 });
    expect(t.x).toBe(5);
    expect(t.y).toBe(10);
    expect(t.width).toBe(200);
    expect(t.height).toBe(150);
  });

  it("defaults child offset to 0", () => {
    const t = buildGroupTransform({ x: 0, y: 0, width: 100, height: 100 });
    expect(t.childOffsetX).toBe(0);
    expect(t.childOffsetY).toBe(0);
  });

  it("defaults child extent to parent size", () => {
    const t = buildGroupTransform({ x: 0, y: 0, width: 200, height: 150 });
    expect(t.childExtentWidth).toBe(200);
    expect(t.childExtentHeight).toBe(150);
  });

  it("sets child offset and extent when specified", () => {
    const t = buildGroupTransform({
      x: 0, y: 0, width: 200, height: 150,
      childOffsetX: 10, childOffsetY: 20,
      childExtentWidth: 180, childExtentHeight: 130,
    });
    expect(t.childOffsetX).toBe(10);
    expect(t.childOffsetY).toBe(20);
    expect(t.childExtentWidth).toBe(180);
    expect(t.childExtentHeight).toBe(130);
  });
});
