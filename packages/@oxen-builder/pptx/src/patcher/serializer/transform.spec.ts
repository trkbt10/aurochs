/**
 * @file Transform serializer tests
 */

import { createElement, getChild, type XmlElement } from "@oxen/xml";
import type { Transform } from "@oxen-office/pptx/domain/geometry";
import { deg, px } from "@oxen-office/ooxml/domain/units";
import { patchTransformElement, serializeTransform } from "./transform";

function createTransform(overrides: Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}> = {}): Transform {
  const defaults = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    flipH: false,
    flipV: false,
    ...overrides,
  };
  return {
    x: px(defaults.x),
    y: px(defaults.y),
    width: px(defaults.width),
    height: px(defaults.height),
    rotation: deg(defaults.rotation),
    flipH: defaults.flipH,
    flipV: defaults.flipV,
  };
}

describe("serializeTransform", () => {
  it("serializes off/ext in EMU", () => {
    const transform = createTransform({ x: 96, y: 48, width: 192, height: 96 });
    const xfrm = serializeTransform(transform);

    expect(xfrm.name).toBe("a:xfrm");

    const off = getChild(xfrm, "a:off");
    const ext = getChild(xfrm, "a:ext");

    // 1px = 9525 EMU at 96 DPI
    expect(off?.attrs.x).toBe("914400");
    expect(off?.attrs.y).toBe("457200");
    expect(ext?.attrs.cx).toBe("1828800");
    expect(ext?.attrs.cy).toBe("914400");
  });

  it("omits rot when rotation is 0 degrees", () => {
    const xfrm = serializeTransform(createTransform({ rotation: 0 }));
    expect(xfrm.attrs.rot).toBeUndefined();
  });

  it("serializes rotation to 60000ths of a degree", () => {
    expect(serializeTransform(createTransform({ rotation: 45 })).attrs.rot).toBe("2700000");
    expect(serializeTransform(createTransform({ rotation: 90 })).attrs.rot).toBe("5400000");
    expect(serializeTransform(createTransform({ rotation: 180 })).attrs.rot).toBe("10800000");
  });

  it("serializes negative rotation", () => {
    expect(serializeTransform(createTransform({ rotation: -45 })).attrs.rot).toBe("-2700000");
  });

  it("rounds fractional values", () => {
    const transform = createTransform({ x: 0.5, y: 0.4, width: 0.49, height: 0.51 });
    const xfrm = serializeTransform(transform);

    const off = getChild(xfrm, "a:off");
    const ext = getChild(xfrm, "a:ext");

    // 0.5px -> 4762.5 EMU -> round(4763)
    expect(off?.attrs.x).toBe("4763");
    // 0.4px -> 3810 EMU
    expect(off?.attrs.y).toBe("3810");
    // 0.49px -> 4667.25 -> round(4667)
    expect(ext?.attrs.cx).toBe("4667");
    // 0.51px -> 4857.75 -> round(4858)
    expect(ext?.attrs.cy).toBe("4858");
  });

  it("serializes zero size", () => {
    const xfrm = serializeTransform(createTransform({ width: 0, height: 0 }));
    const ext = getChild(xfrm, "a:ext");
    expect(ext?.attrs.cx).toBe("0");
    expect(ext?.attrs.cy).toBe("0");
  });

  it("serializes large values", () => {
    const xfrm = serializeTransform(
      createTransform({ x: 1_000_000, y: 2_000_000, width: 3_000_000, height: 4_000_000 }),
    );
    const off = getChild(xfrm, "a:off");
    const ext = getChild(xfrm, "a:ext");

    // 1px = 9525 EMU at 96 DPI
    expect(off?.attrs.x).toBe("9525000000");
    expect(off?.attrs.y).toBe("19050000000");
    expect(ext?.attrs.cx).toBe("28575000000");
    expect(ext?.attrs.cy).toBe("38100000000");
  });
});

describe("patchTransformElement", () => {
  function createExistingXfrm(attrs: Record<string, string>, children: XmlElement[]): XmlElement {
    return createElement("a:xfrm", attrs, children);
  }

  it("replaces a:off/a:ext while preserving other children", () => {
    const existing = createExistingXfrm(
      { rot: "123", flipH: "1", foo: "bar" },
      [
        createElement("a:off", { x: "1", y: "2" }),
        createElement("a:ext", { cx: "3", cy: "4" }),
        createElement("a:chOff", { x: "10", y: "20" }),
        createElement("a:chExt", { cx: "30", cy: "40" }),
        createElement("a:extLst", {}, [createElement("a:ext", { uri: "{dummy}" })]),
      ],
    );

    const updated = patchTransformElement(existing, createTransform({ x: 96, y: 48, width: 192, height: 96, rotation: 45 }));

    const off = getChild(updated, "a:off");
    const ext = getChild(updated, "a:ext");
    expect(off?.attrs.x).toBe("914400");
    expect(off?.attrs.y).toBe("457200");
    expect(ext?.attrs.cx).toBe("1828800");
    expect(ext?.attrs.cy).toBe("914400");

    // rot updated
    expect(updated.attrs.rot).toBe("2700000");
    // preserve other attrs
    expect(updated.attrs.foo).toBe("bar");
    // preserve flip flags present in existing
    expect(updated.attrs.flipH).toBe("1");

    expect(getChild(updated, "a:chOff")).not.toBeNull();
    expect(getChild(updated, "a:chExt")).not.toBeNull();
    expect(getChild(updated, "a:extLst")).not.toBeNull();
  });

  it("removes rot attribute when rotation becomes 0", () => {
    const existing = createExistingXfrm(
      { rot: "2700000" },
      [createElement("a:off", { x: "1", y: "2" }), createElement("a:ext", { cx: "3", cy: "4" })],
    );

    const updated = patchTransformElement(existing, createTransform({ rotation: 0 }));
    expect(updated.attrs.rot).toBeUndefined();
  });
});
