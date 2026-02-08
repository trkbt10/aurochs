import { describe, expect, it } from "bun:test";
import { buildBevel, buildShape3d } from "./shape-3d";

describe("buildBevel", () => {
  it("builds with defaults", () => {
    const bevel = buildBevel({});
    expect(bevel.preset).toBe("circle");
    expect(bevel.width).toBe(8);
    expect(bevel.height).toBe(8);
  });

  it("builds with custom values", () => {
    const bevel = buildBevel({ preset: "angle", width: 12, height: 6 });
    expect(bevel.preset).toBe("angle");
    expect(bevel.width).toBe(12);
    expect(bevel.height).toBe(6);
  });
});

describe("buildShape3d", () => {
  it("returns empty object when no properties", () => {
    const shape3d = buildShape3d({});
    expect(Object.keys(shape3d)).toHaveLength(0);
  });

  it("builds bevelTop", () => {
    const shape3d = buildShape3d({ bevelTop: { preset: "convex", width: 10, height: 10 } });
    expect(shape3d.bevelTop).toBeDefined();
    expect(shape3d.bevelTop!.preset).toBe("convex");
  });

  it("builds bevelBottom", () => {
    const shape3d = buildShape3d({ bevelBottom: {} });
    expect(shape3d.bevelBottom).toBeDefined();
    expect(shape3d.bevelBottom!.preset).toBe("circle");
  });

  it("maps material to preset", () => {
    const shape3d = buildShape3d({ material: "metal" });
    expect(shape3d.preset).toBe("metal");
  });

  it("sets extrusionHeight", () => {
    const shape3d = buildShape3d({ extrusionHeight: 20 });
    expect(shape3d.extrusionHeight).toBe(20);
  });

  it("builds all properties at once", () => {
    const shape3d = buildShape3d({
      bevelTop: { preset: "circle" },
      bevelBottom: { preset: "angle", width: 5, height: 5 },
      material: "plastic",
      extrusionHeight: 15,
    });
    expect(shape3d.bevelTop).toBeDefined();
    expect(shape3d.bevelBottom).toBeDefined();
    expect(shape3d.preset).toBe("plastic");
    expect(shape3d.extrusionHeight).toBe(15);
  });
});
