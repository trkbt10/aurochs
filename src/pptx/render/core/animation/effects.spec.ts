/**
 * @file Animation effects tests
 *
 * @see ECMA-376 Part 1, Section 19.5.3 (p:animEffect)
 */

import { parseFilterToEffectType, parseFilterDirection, resetElementStyles, showElement, hideElement } from "./effects";

describe("parseFilterToEffectType", () => {
  it("parses 'fade' filter", () => {
    expect(parseFilterToEffectType("fade")).toBe("fade");
    expect(parseFilterToEffectType("fade(in)")).toBe("fade");
    expect(parseFilterToEffectType("fade(out)")).toBe("fade");
  });

  it("parses 'slide' filter", () => {
    expect(parseFilterToEffectType("slide")).toBe("slide");
    expect(parseFilterToEffectType("slide(fromLeft)")).toBe("slide");
    expect(parseFilterToEffectType("slide(fromRight)")).toBe("slide");
  });

  it("parses 'wipe' filter", () => {
    expect(parseFilterToEffectType("wipe")).toBe("wipe");
    expect(parseFilterToEffectType("wipe(right)")).toBe("wipe");
  });

  it("parses MS-OE376 spec filters", () => {
    expect(parseFilterToEffectType("blinds")).toBe("blinds");
    expect(parseFilterToEffectType("box")).toBe("box");
    expect(parseFilterToEffectType("dissolve")).toBe("dissolve");
    expect(parseFilterToEffectType("wheel")).toBe("wheel");
    expect(parseFilterToEffectType("barn")).toBe("barn");
    expect(parseFilterToEffectType("checkerboard")).toBe("checkerboard");
    expect(parseFilterToEffectType("circle")).toBe("circle");
    expect(parseFilterToEffectType("diamond")).toBe("diamond");
    expect(parseFilterToEffectType("plus")).toBe("plus");
    expect(parseFilterToEffectType("randombar")).toBe("randombar");
    expect(parseFilterToEffectType("strips")).toBe("strips");
    expect(parseFilterToEffectType("wedge")).toBe("wedge");
  });

  it("defaults non-spec filters to 'fade'", () => {
    // fly, zoom, split are not in MS-OE376 Part 4 Section 4.6.3
    expect(parseFilterToEffectType("fly")).toBe("fade");
    expect(parseFilterToEffectType("zoom")).toBe("fade");
    expect(parseFilterToEffectType("split")).toBe("fade");
  });

  it("defaults to 'fade' for unknown filters", () => {
    expect(parseFilterToEffectType("unknown")).toBe("fade");
    expect(parseFilterToEffectType("")).toBe("fade");
  });
});

describe("parseFilterDirection", () => {
  it("parses simple directions", () => {
    expect(parseFilterDirection("fade(in)")).toBe("in");
    expect(parseFilterDirection("fade(out)")).toBe("out");
    expect(parseFilterDirection("wipe(left)")).toBe("left");
    expect(parseFilterDirection("wipe(right)")).toBe("right");
    expect(parseFilterDirection("wipe(up)")).toBe("up");
    expect(parseFilterDirection("wipe(down)")).toBe("down");
  });

  it("parses PowerPoint 'from' directions", () => {
    expect(parseFilterDirection("slide(fromLeft)")).toBe("left");
    expect(parseFilterDirection("slide(fromRight)")).toBe("right");
    expect(parseFilterDirection("slide(fromTop)")).toBe("up");
    expect(parseFilterDirection("slide(fromBottom)")).toBe("down");
  });

  it("defaults to 'in' for missing direction", () => {
    expect(parseFilterDirection("fade")).toBe("in");
    expect(parseFilterDirection("")).toBe("in");
  });
});

describe("element style utilities", () => {
  // Mock element for testing
  function createMockElement(): HTMLElement {
    return {
      style: {
        transition: "",
        opacity: "",
        visibility: "",
        transform: "",
        clipPath: "",
        filter: "",
        maskImage: "",
        maskSize: "",
        maskPosition: "",
        maskRepeat: "",
      },
    } as unknown as HTMLElement;
  }

  describe("resetElementStyles", () => {
    it("clears all animation-related styles", () => {
      const el = createMockElement();
      el.style.transition = "all 1s";
      el.style.opacity = "0.5";
      el.style.transform = "translateX(100px)";
      el.style.clipPath = "inset(50%)";
      el.style.filter = "blur(4px)";
      el.style.visibility = "hidden";

      resetElementStyles(el);

      expect(el.style.transition).toBe("none");
      expect(el.style.opacity).toBe("");
      expect(el.style.transform).toBe("");
      expect(el.style.clipPath).toBe("");
      expect(el.style.filter).toBe("");
      expect(el.style.visibility).toBe("");
    });
  });

  describe("showElement", () => {
    it("makes element visible", () => {
      const el = createMockElement();
      el.style.opacity = "0";
      el.style.visibility = "hidden";

      showElement(el);

      expect(el.style.opacity).toBe("1");
      expect(el.style.visibility).toBe("visible");
      expect(el.style.transition).toBe("none");
    });
  });

  describe("hideElement", () => {
    it("hides element", () => {
      const el = createMockElement();
      el.style.opacity = "1";
      el.style.visibility = "visible";

      hideElement(el);

      expect(el.style.opacity).toBe("0");
      expect(el.style.visibility).toBe("hidden");
      expect(el.style.transition).toBe("none");
    });
  });
});
