/**
 * @file Visual animation effects tests
 *
 * Tests that animation effects produce correct CSS values
 * for actual browser rendering.
 *
 * @see ECMA-376 Part 1, Section 19.5.3 (p:animEffect)
 * @see MS-OE376 Part 4 Section 4.6.3
 */

import {
  applyFade,
  applySlide,
  applyWipe,
  applyWheel,
  applyBox,
  applyCircle,
  applyDiamond,
  applyBarn,
  applyPlus,
  applyWedge,
  parseFilterToEffectType,
  parseFilterDirection,
} from "./effects";
import type { EffectConfig } from "./types";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create mock element with all required style properties
 */
function createMockElement(): HTMLElement {
  return {
    style: {
      transition: "",
      opacity: "",
      visibility: "",
      transform: "",
      transformOrigin: "",
      clipPath: "",
      filter: "",
      maskImage: "",
      maskSize: "",
      maskPosition: "",
      maskRepeat: "",
    },
  } as unknown as HTMLElement;
}

// =============================================================================
// Transform Origin Tests - Critical for correct animation centering
// =============================================================================

describe("Transform Origin - ECMA-376 animation positioning", () => {
  describe("effects using rotation transforms", () => {
    it("applyWheel sets transformOrigin to center center", () => {
      const el = createMockElement();
      applyWheel(el, { type: "wheel", duration: 1000, entrance: true });

      expect(el.style.transformOrigin).toBe("center center");
    });
  });

  describe("effects using translate transforms", () => {
    it("applySlide should not require transformOrigin (translate is origin-independent)", () => {
      const el = createMockElement();
      applySlide(el, { type: "slide", duration: 1000, direction: "left", entrance: true });

      // translateX/Y doesn't depend on origin, so no need to set it
      expect(el.style.transform).toContain("translateX");
    });
  });
});

// =============================================================================
// CSS Value Correctness Tests
// =============================================================================

describe("CSS Value Correctness", () => {
  describe("clip-path values for shape-based effects", () => {
    it("applyBox produces valid inset clip-path", () => {
      const el = createMockElement();
      applyBox(el, { type: "box", duration: 1000, direction: "in", entrance: true });

      // Initial state should be center point
      expect(el.style.clipPath).toBe("inset(50% 50% 50% 50%)");
    });

    it("applyCircle produces valid circle clip-path", () => {
      const el = createMockElement();
      applyCircle(el, { type: "circle", duration: 1000, direction: "in", entrance: true });

      expect(el.style.clipPath).toBe("circle(0% at 50% 50%)");
    });

    it("applyDiamond produces valid polygon clip-path", () => {
      const el = createMockElement();
      applyDiamond(el, { type: "diamond", duration: 1000, direction: "in", entrance: true });

      // Should be a collapsed point initially
      expect(el.style.clipPath).toBe("polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)");
    });

    it("applyWipe produces valid inset clip-path for each direction", () => {
      const directions = ["left", "right", "up", "down"] as const;
      const expected: Record<string, string> = {
        left: "inset(0 0 0 100%)",
        right: "inset(0 100% 0 0)",
        up: "inset(100% 0 0 0)",
        down: "inset(0 0 100% 0)",
      };

      for (const dir of directions) {
        const el = createMockElement();
        applyWipe(el, { type: "wipe", duration: 1000, direction: dir, entrance: true });
        expect(el.style.clipPath).toBe(expected[dir]);
      }
    });

    it("applyBarn produces valid inset clip-path", () => {
      const el = createMockElement();
      applyBarn(el, { type: "barn", duration: 1000, direction: "inHorizontal", entrance: true });
      expect(el.style.clipPath).toBe("inset(0 50% 0 50%)");
    });

    it("applyPlus produces valid polygon clip-path", () => {
      const el = createMockElement();
      applyPlus(el, { type: "plus", duration: 1000, direction: "in", entrance: true });

      // Should be collapsed initially
      expect(el.style.clipPath).toContain("polygon(50% 50%");
    });

    it("applyWedge produces valid polygon clip-path", () => {
      const el = createMockElement();
      applyWedge(el, { type: "wedge", duration: 1000, entrance: true });

      expect(el.style.clipPath).toBe("polygon(50% 50%, 50% 50%, 50% 50%)");
    });
  });

  describe("transform values", () => {
    it("applySlide uses percentage-based translate for proper element scaling", () => {
      // ECMA-376: slide distance should be based on element's bounding box
      // Using 100% ensures element slides completely off-screen
      const directions = {
        left: "translateX(-100%)",
        right: "translateX(100%)",
        up: "translateY(-100%)",
        down: "translateY(100%)",
      } as const;

      for (const [dir, expected] of Object.entries(directions)) {
        const el = createMockElement();
        applySlide(el, {
          type: "slide",
          duration: 1000,
          direction: dir as "left" | "right" | "up" | "down",
          entrance: true,
        });
        expect(el.style.transform).toBe(expected);
      }
    });

    it("applyWheel uses rotation transform", () => {
      const el = createMockElement();
      applyWheel(el, { type: "wheel", duration: 1000, entrance: true });

      expect(el.style.transform).toBe("rotate(-360deg)");
    });
  });

  describe("opacity values", () => {
    it("entrance effects start with opacity 0", () => {
      const effects = [
        { fn: applyFade, config: { type: "fade" as const, duration: 1000, entrance: true } },
        {
          fn: applySlide,
          config: { type: "slide" as const, duration: 1000, direction: "left" as const, entrance: true },
        },
      ];

      for (const { fn, config } of effects) {
        const el = createMockElement();
        fn(el, config);
        expect(el.style.opacity).toBe("0");
      }
    });

    it("clip-path effects keep opacity 1 (visibility controlled by clip)", () => {
      const effects = [
        {
          fn: applyWipe,
          config: { type: "wipe" as const, duration: 1000, direction: "right" as const, entrance: true },
        },
        { fn: applyBox, config: { type: "box" as const, duration: 1000, direction: "in" as const, entrance: true } },
        {
          fn: applyCircle,
          config: { type: "circle" as const, duration: 1000, direction: "in" as const, entrance: true },
        },
      ];

      for (const { fn, config } of effects) {
        const el = createMockElement();
        fn(el, config);
        expect(el.style.opacity).toBe("1");
      }
    });
  });

  describe("transition timing", () => {
    // Helper to wait for raf callback (setTimeout in non-browser env)
    const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

    it("all effects include duration in transition (after raf)", async () => {
      const effects = [
        { fn: applyFade, config: { type: "fade" as const, duration: 500, entrance: true } },
        {
          fn: applyWipe,
          config: { type: "wipe" as const, duration: 750, direction: "right" as const, entrance: true },
        },
        {
          fn: applySlide,
          config: { type: "slide" as const, duration: 1000, direction: "left" as const, entrance: true },
        },
      ];

      for (const { fn, config } of effects) {
        const el = createMockElement();
        fn(el, config);
        // Transition is set to "none" initially, then enabled in raf callback
        await nextTick();
        expect(el.style.transition).toContain(`${config.duration}ms`);
      }
    });

    it("effects use correct CSS properties in transition (after raf)", async () => {
      const el1 = createMockElement();
      applyFade(el1, { type: "fade", duration: 1000, entrance: true });
      await nextTick();
      expect(el1.style.transition).toContain("opacity");

      const el2 = createMockElement();
      applyWipe(el2, { type: "wipe", duration: 1000, direction: "right", entrance: true });
      await nextTick();
      expect(el2.style.transition).toContain("clip-path");

      const el3 = createMockElement();
      applySlide(el3, { type: "slide", duration: 1000, direction: "left", entrance: true });
      await nextTick();
      expect(el3.style.transition).toContain("transform");
      expect(el3.style.transition).toContain("opacity");
    });
  });
});

// =============================================================================
// Exit Animation Tests
// =============================================================================

describe("Exit Animations", () => {
  it("exit animations reverse the entrance states", () => {
    // Fade exit starts visible
    const elFade = createMockElement();
    applyFade(elFade, { type: "fade", duration: 1000, entrance: false });
    expect(elFade.style.opacity).toBe("1");

    // Slide exit starts at normal position
    const elSlide = createMockElement();
    applySlide(elSlide, { type: "slide", duration: 1000, direction: "left", entrance: false });
    expect(elSlide.style.opacity).toBe("1");
    expect(elSlide.style.transform).toBe("translateX(0) translateY(0)");

    // Wipe exit starts fully visible
    const elWipe = createMockElement();
    applyWipe(elWipe, { type: "wipe", duration: 1000, direction: "right", entrance: false });
    expect(elWipe.style.clipPath).toBe("inset(0 0 0 0)");
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge Cases", () => {
  // Helper to wait for raf callback (setTimeout in non-browser env)
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("handles zero duration", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 0, entrance: true });
    await nextTick();
    expect(el.style.transition).toContain("0ms");
  });

  it("handles very large duration", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 60000, entrance: true });
    await nextTick();
    expect(el.style.transition).toContain("60000ms");
  });

  it("handles custom easing", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: true, easing: "linear" });
    await nextTick();
    expect(el.style.transition).toContain("linear");
  });
});

// =============================================================================
// Filter String Parsing Tests - Real PPTX values
// =============================================================================

describe("Real PPTX Filter String Parsing", () => {
  /**
   * These tests use actual filter values found in PPTX files.
   * Verified against: fixtures/poi-test-data/test-data/slideshow/
   */

  it("parses 'fade' (most common - 151 occurrences in test files)", () => {
    expect(parseFilterToEffectType("fade")).toBe("fade");
    expect(parseFilterDirection("fade")).toBe("in"); // default
  });

  it("parses 'slide(fromTop)' (5 occurrences)", () => {
    expect(parseFilterToEffectType("slide(fromTop)")).toBe("slide");
    expect(parseFilterDirection("slide(fromTop)")).toBe("up");
  });

  it("parses 'slide(fromLeft)' (1 occurrence)", () => {
    expect(parseFilterToEffectType("slide(fromLeft)")).toBe("slide");
    expect(parseFilterDirection("slide(fromLeft)")).toBe("left");
  });

  it("parses 'blinds(horizontal)' (5 occurrences)", () => {
    expect(parseFilterToEffectType("blinds(horizontal)")).toBe("blinds");
    expect(parseFilterDirection("blinds(horizontal)")).toBe("horizontal");
  });

  it("parses 'barn(inVertical)' (4 occurrences)", () => {
    expect(parseFilterToEffectType("barn(inVertical)")).toBe("barn");
    expect(parseFilterDirection("barn(inVertical)")).toBe("inVertical");
  });

  it("parses 'wipe(left)' (2 occurrences)", () => {
    expect(parseFilterToEffectType("wipe(left)")).toBe("wipe");
    expect(parseFilterDirection("wipe(left)")).toBe("left");
  });

  it("parses 'wipe(down)' (2 occurrences)", () => {
    expect(parseFilterToEffectType("wipe(down)")).toBe("wipe");
    expect(parseFilterDirection("wipe(down)")).toBe("down");
  });
});

// =============================================================================
// SVG Element Compatibility Tests
// =============================================================================

describe("SVG Element Compatibility", () => {
  /**
   * SVG elements have different CSS property support than HTML elements.
   * These tests verify that our effects use CSS properties that work on both.
   *
   * Key differences:
   * - SVG uses 'opacity' (works on both)
   * - SVG transform uses different syntax in some browsers
   * - SVG doesn't support all CSS properties (e.g., some mask properties)
   */

  function createMockSVGElement(): SVGElement {
    return {
      style: {
        transition: "",
        opacity: "",
        visibility: "",
        transform: "",
        transformOrigin: "",
        clipPath: "",
        filter: "",
        maskImage: "",
        maskSize: "",
        maskPosition: "",
        maskRepeat: "",
      },
    } as unknown as SVGElement;
  }

  // Helper to wait for raf callback (setTimeout in non-browser env)
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("applyFade works with SVG elements", async () => {
    const el = createMockSVGElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: true });

    // opacity is universally supported - initial state is 0
    expect(el.style.opacity).toBe("0");

    // Transition is set in raf callback
    await nextTick();
    expect(el.style.transition).toContain("opacity");
  });

  it("applySlide works with SVG elements", () => {
    const el = createMockSVGElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "left", entrance: true });

    // translate works on SVG
    expect(el.style.transform).toBe("translateX(-100%)");
  });

  it("applyWipe works with SVG elements (clip-path)", () => {
    const el = createMockSVGElement();
    applyWipe(el, { type: "wipe", duration: 1000, direction: "right", entrance: true });

    // clip-path works on SVG (was designed for it originally)
    expect(el.style.clipPath).toBe("inset(0 100% 0 0)");
  });
});

// =============================================================================
// Animation Sequence Correctness Tests
// =============================================================================

describe("Animation Sequence Correctness", () => {
  /**
   * These tests verify that effects set up the correct initial state
   * for the requestAnimationFrame callback to animate to the final state.
   */

  // Helper to wait for raf callback (setTimeout in non-browser env)
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("fade entrance: initial opacity 0 -> final opacity 1", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: true });

    // Initial state
    expect(el.style.opacity).toBe("0");

    // Wait for raf callback to execute
    await nextTick();

    // Final state after animation starts
    expect(el.style.opacity).toBe("1");
  });

  it("fade exit: initial opacity 1 -> final opacity 0", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: false });

    expect(el.style.opacity).toBe("1");
    await nextTick();
    expect(el.style.opacity).toBe("0");
  });

  it("slide entrance: initial offset -> final position (0,0)", async () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "left", entrance: true });

    // Initial: off-screen to the left
    expect(el.style.transform).toBe("translateX(-100%)");
    expect(el.style.opacity).toBe("0");

    await nextTick();

    // Final: in position
    expect(el.style.transform).toBe("translateX(0) translateY(0)");
    expect(el.style.opacity).toBe("1");
  });

  it("wipe entrance: initial clipped -> final fully visible", async () => {
    const el = createMockElement();
    applyWipe(el, { type: "wipe", duration: 1000, direction: "right", entrance: true });

    // Initial: fully clipped
    expect(el.style.clipPath).toBe("inset(0 100% 0 0)");

    await nextTick();

    // Final: fully visible
    expect(el.style.clipPath).toBe("inset(0 0 0 0)");
  });

  it("slide(fromTop) starts above and slides down - per MS-OE376 4.6.3", () => {
    // MS-OE376: slide(fromTop) means element comes FROM the top
    // So initial position should be ABOVE (negative Y) and animate DOWN to final
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "up", entrance: true });

    // translateY(-100%) means 100% above final position
    expect(el.style.transform).toBe("translateY(-100%)");
    // Element will animate to translateY(0) - sliding DOWN into view
  });

  it("slide(fromLeft) starts left and slides right - per MS-OE376 4.6.3", () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "left", entrance: true });

    // translateX(-100%) means 100% to the LEFT of final position
    expect(el.style.transform).toBe("translateX(-100%)");
    // Element will animate to translateX(0) - sliding RIGHT into view
  });

  it("slide(fromRight) starts right and slides left - per MS-OE376 4.6.3", () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "right", entrance: true });

    // translateX(100%) means 100% to the RIGHT of final position
    expect(el.style.transform).toBe("translateX(100%)");
    // Element will animate to translateX(0) - sliding LEFT into view
  });

  it("slide(fromBottom) starts below and slides up - per MS-OE376 4.6.3", () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "down", entrance: true });

    // translateY(100%) means 100% BELOW final position
    expect(el.style.transform).toBe("translateY(100%)");
    // Element will animate to translateY(0) - sliding UP into view
  });

  it("entrance animations: initial state is hidden/offset, final is visible/normal", () => {
    // Fade: opacity 0 -> 1
    const elFade = createMockElement();
    applyFade(elFade, { type: "fade", duration: 1000, entrance: true });
    expect(elFade.style.opacity).toBe("0"); // Initial hidden

    // Slide: offset + opacity 0 -> position (0,0) + opacity 1
    const elSlide = createMockElement();
    applySlide(elSlide, { type: "slide", duration: 1000, direction: "left", entrance: true });
    expect(elSlide.style.transform).toBe("translateX(-100%)");
    expect(elSlide.style.opacity).toBe("0");

    // Wipe: clip hidden -> clip visible
    const elWipe = createMockElement();
    applyWipe(elWipe, { type: "wipe", duration: 1000, direction: "right", entrance: true });
    expect(elWipe.style.clipPath).toBe("inset(0 100% 0 0)"); // Initially clipped
  });

  it("exit animations: initial state is visible/normal, final is hidden/offset", () => {
    // Fade exit: opacity 1 -> 0
    const elFade = createMockElement();
    applyFade(elFade, { type: "fade", duration: 1000, entrance: false });
    expect(elFade.style.opacity).toBe("1"); // Starts visible

    // Slide exit: position (0,0) + opacity 1 -> offset + opacity 0
    const elSlide = createMockElement();
    applySlide(elSlide, { type: "slide", duration: 1000, direction: "left", entrance: false });
    expect(elSlide.style.transform).toBe("translateX(0) translateY(0)");
    expect(elSlide.style.opacity).toBe("1");

    // Wipe exit: clip visible -> clip hidden
    const elWipe = createMockElement();
    applyWipe(elWipe, { type: "wipe", duration: 1000, direction: "right", entrance: false });
    expect(elWipe.style.clipPath).toBe("inset(0 0 0 0)"); // Starts fully visible
  });
});
