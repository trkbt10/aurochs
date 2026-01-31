/** @file Unit tests for slide transition serialization */
import { getChild } from "@oxen/xml";
import type { SlideTransition } from "../../domain/transition";
import { isTransitionType, serializeSlideTransition, TRANSITION_TYPES } from "./transition";

describe("serializeSlideTransition", () => {
  it("returns null for 'none' transition", () => {
    const result = serializeSlideTransition({ type: "none" });
    expect(result).toBeNull();
  });

  it("serializes a basic fade transition", () => {
    const result = serializeSlideTransition({ type: "fade" });

    expect(result).not.toBeNull();
    expect(result!.name).toBe("p:transition");

    const fadeEl = getChild(result!, "p:fade");
    expect(fadeEl).toBeDefined();
  });

  it("serializes duration as speed attribute", () => {
    const fast = serializeSlideTransition({ type: "fade", duration: 500 });
    expect(fast!.attrs.spd).toBe("fast");

    const med = serializeSlideTransition({ type: "fade", duration: 1000 });
    expect(med!.attrs.spd).toBe("med");

    const slow = serializeSlideTransition({ type: "fade", duration: 2000 });
    expect(slow!.attrs.spd).toBe("slow");
  });

  it("serializes advanceOnClick", () => {
    const result = serializeSlideTransition({ type: "fade", advanceOnClick: true });
    expect(result!.attrs.advClick).toBe("1");

    const resultFalse = serializeSlideTransition({ type: "fade", advanceOnClick: false });
    expect(resultFalse!.attrs.advClick).toBe("0");
  });

  it("serializes advanceAfter", () => {
    const result = serializeSlideTransition({ type: "fade", advanceAfter: 3000 });
    expect(result!.attrs.advTm).toBe("3000");
  });

  it("serializes direction for wipe transition", () => {
    const result = serializeSlideTransition({ type: "wipe", direction: "r" });
    const wipeEl = getChild(result!, "p:wipe");
    expect(wipeEl!.attrs.dir).toBe("r");
  });

  it("serializes orientation for blinds transition", () => {
    const result = serializeSlideTransition({ type: "blinds", orientation: "vert" });
    const blindsEl = getChild(result!, "p:blinds");
    expect(blindsEl!.attrs.dir).toBe("vert");
  });

  it("serializes spokes for wheel transition", () => {
    const result = serializeSlideTransition({ type: "wheel", spokes: 8 });
    const wheelEl = getChild(result!, "p:wheel");
    expect(wheelEl!.attrs.spkCnt).toBe("8");
  });

  it("serializes inOutDirection for split transition", () => {
    const result = serializeSlideTransition({ type: "split", inOutDirection: "out" });
    const splitEl = getChild(result!, "p:split");
    expect(splitEl!.attrs.dir).toBe("out");
  });

  it("throws for unsupported attribute combinations", () => {
    expect(() =>
      serializeSlideTransition({ type: "fade", direction: "r" } as SlideTransition),
    ).toThrow('direction is not supported for transition type "fade"');

    expect(() =>
      serializeSlideTransition({ type: "wipe", orientation: "vert" } as SlideTransition),
    ).toThrow('orientation is not supported for transition type "wipe"');

    expect(() =>
      serializeSlideTransition({ type: "fade", spokes: 4 } as SlideTransition),
    ).toThrow('spokes is not supported for transition type "fade"');

    expect(() =>
      serializeSlideTransition({ type: "fade", inOutDirection: "in" } as SlideTransition),
    ).toThrow('inOutDirection is not supported for transition type "fade"');
  });
});

describe("isTransitionType", () => {
  it("returns true for valid transition types", () => {
    for (const type of TRANSITION_TYPES) {
      expect(isTransitionType(type)).toBe(true);
    }
  });

  it("returns false for invalid types", () => {
    expect(isTransitionType("invalid")).toBe(false);
    expect(isTransitionType("")).toBe(false);
    expect(isTransitionType("FADE")).toBe(false); // case-sensitive
  });
});

describe("TRANSITION_TYPES", () => {
  it("contains all expected transition types", () => {
    expect(TRANSITION_TYPES).toContain("fade");
    expect(TRANSITION_TYPES).toContain("wipe");
    expect(TRANSITION_TYPES).toContain("none");
    expect(TRANSITION_TYPES.length).toBe(22);
  });
});
