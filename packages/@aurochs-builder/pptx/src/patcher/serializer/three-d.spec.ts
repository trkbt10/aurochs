/** @file 3D property serializer tests */

import { getChild } from "@aurochs/xml";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Bevel3d, Shape3d } from "@aurochs-office/pptx/domain/three-d";
import { serializeShape3d } from "./three-d";

function bevel(width: number, height: number, preset: Bevel3d["preset"] = "circle"): Bevel3d {
  return { width: px(width), height: px(height), preset };
}

describe("serializeShape3d", () => {
  it("returns null for empty shape3d", () => {
    expect(serializeShape3d({})).toBeNull();
  });

  it("serializes extrusion height", () => {
    const el = serializeShape3d({ extrusionHeight: px(10) });
    expect(el).not.toBeNull();
    expect(el!.name).toBe("a:sp3d");
    // 10px * 9525 = 95250 EMU
    expect(el!.attrs.extrusionH).toBe("95250");
  });

  it("serializes z depth", () => {
    const el = serializeShape3d({ z: px(5) });
    expect(el).not.toBeNull();
    expect(el!.name).toBe("a:sp3d");
    // 5px * 9525 = 47625 EMU
    expect(el!.attrs.z).toBe("47625");
  });

  it("serializes contour width", () => {
    const el = serializeShape3d({ contourWidth: px(2) });
    expect(el).not.toBeNull();
    expect(el!.name).toBe("a:sp3d");
    // 2px * 9525 = 19050 EMU
    expect(el!.attrs.contourW).toBe("19050");
  });

  it("serializes preset material", () => {
    const el = serializeShape3d({ preset: "metal" });
    expect(el).not.toBeNull();
    expect(el!.attrs.prstMaterial).toBe("metal");
  });

  it("serializes bevel top with all fields", () => {
    const el = serializeShape3d({ bevelTop: bevel(8, 4, "angle") });
    expect(el).not.toBeNull();
    const bevelT = getChild(el!, "a:bevelT");
    expect(bevelT).not.toBeNull();
    // 8px * 9525 = 76200
    expect(bevelT!.attrs.w).toBe("76200");
    // 4px * 9525 = 38100
    expect(bevelT!.attrs.h).toBe("38100");
    expect(bevelT!.attrs.prst).toBe("angle");
  });

  it("serializes bevel bottom with all fields", () => {
    const el = serializeShape3d({ bevelBottom: bevel(6, 3, "softRound") });
    expect(el).not.toBeNull();
    const bevelB = getChild(el!, "a:bevelB");
    expect(bevelB).not.toBeNull();
    // 6px * 9525 = 57150
    expect(bevelB!.attrs.w).toBe("57150");
    // 3px * 9525 = 28575
    expect(bevelB!.attrs.h).toBe("28575");
    expect(bevelB!.attrs.prst).toBe("softRound");
  });

  it("serializes both bevels", () => {
    const el = serializeShape3d({
      bevelTop: bevel(8, 8, "circle"),
      bevelBottom: bevel(4, 4, "cross"),
    });
    expect(el).not.toBeNull();
    expect(getChild(el!, "a:bevelT")).not.toBeNull();
    expect(getChild(el!, "a:bevelB")).not.toBeNull();
    expect(el!.children).toHaveLength(2);
  });

  it("serializes all properties together", () => {
    const shape3d: Shape3d = {
      extrusionHeight: px(10),
      z: px(5),
      contourWidth: px(2),
      preset: "warmMatte",
      bevelTop: bevel(8, 4, "circle"),
      bevelBottom: bevel(6, 3, "angle"),
    };

    const el = serializeShape3d(shape3d);
    expect(el).not.toBeNull();
    expect(el!.name).toBe("a:sp3d");

    // Attributes
    expect(el!.attrs.extrusionH).toBe("95250");
    expect(el!.attrs.z).toBe("47625");
    expect(el!.attrs.contourW).toBe("19050");
    expect(el!.attrs.prstMaterial).toBe("warmMatte");

    // Children
    expect(getChild(el!, "a:bevelT")).not.toBeNull();
    expect(getChild(el!, "a:bevelB")).not.toBeNull();
    expect(el!.children).toHaveLength(2);
  });

  it("returns null when numeric fields are zero", () => {
    expect(serializeShape3d({ extrusionHeight: px(0) })).toBeNull();
    expect(serializeShape3d({ z: px(0) })).toBeNull();
    expect(serializeShape3d({ contourWidth: px(0) })).toBeNull();
    expect(serializeShape3d({ extrusionHeight: px(0), z: px(0), contourWidth: px(0) })).toBeNull();
  });

  it("does not add negative numeric values", () => {
    expect(serializeShape3d({ extrusionHeight: px(-5) })).toBeNull();
    expect(serializeShape3d({ z: px(-1) })).toBeNull();
    expect(serializeShape3d({ contourWidth: px(-3) })).toBeNull();
  });
});
