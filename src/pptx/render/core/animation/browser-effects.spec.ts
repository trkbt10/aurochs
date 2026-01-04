/**
 * @file Browser Animation Effects Tests
 *
 * TDD tests for JS-based animation effects.
 * These effects use requestAnimationFrame for reliable animation.
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 */

import { createMockTimeProvider, setTimeProvider, resetTimeProvider } from "./engine";
import {
  animateFade,
  animateSlide,
  animateWipe,
  animateBlinds,
  animateBox,
  animateCircle,
  animateDiamond,
  animateDissolve,
  animateStrips,
  animateWheel,
  animatePlus,
  animateBarn,
  animateRandombar,
  animateWedge,
  animateCheckerboard,
  applyBrowserEffect,
  parseFilter,
} from "./browser-effects";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockElement(): HTMLElement & { style: Record<string, string> } {
  return {
    style: {
      opacity: "",
      visibility: "",
      transform: "",
      clipPath: "",
      filter: "",
      maskImage: "",
      maskSize: "",
      maskPosition: "",
      maskRepeat: "",
      transformOrigin: "",
    },
  } as unknown as HTMLElement & { style: Record<string, string> };
}

// =============================================================================
// Filter Parsing Tests (MS-OE376 Part 4 Section 4.6.3)
// =============================================================================

describe("parseFilter - MS-OE376 Part 4 Section 4.6.3", () => {
  it("parses fade filter", () => {
    expect(parseFilter("fade")).toEqual({ type: "fade", direction: "in" });
    expect(parseFilter("fade(in)")).toEqual({ type: "fade", direction: "in" });
    expect(parseFilter("fade(out)")).toEqual({ type: "fade", direction: "out" });
  });

  it("parses slide filter with PowerPoint directions", () => {
    expect(parseFilter("slide(fromLeft)")).toEqual({ type: "slide", direction: "left" });
    expect(parseFilter("slide(fromRight)")).toEqual({ type: "slide", direction: "right" });
    expect(parseFilter("slide(fromTop)")).toEqual({ type: "slide", direction: "up" });
    expect(parseFilter("slide(fromBottom)")).toEqual({ type: "slide", direction: "down" });
  });

  it("parses wipe filter", () => {
    expect(parseFilter("wipe(right)")).toEqual({ type: "wipe", direction: "right" });
    expect(parseFilter("wipe(left)")).toEqual({ type: "wipe", direction: "left" });
    expect(parseFilter("wipe(up)")).toEqual({ type: "wipe", direction: "up" });
    expect(parseFilter("wipe(down)")).toEqual({ type: "wipe", direction: "down" });
  });

  it("parses blinds filter", () => {
    expect(parseFilter("blinds(horizontal)")).toEqual({ type: "blinds", direction: "horizontal" });
    expect(parseFilter("blinds(vertical)")).toEqual({ type: "blinds", direction: "vertical" });
  });

  it("parses box filter", () => {
    expect(parseFilter("box(in)")).toEqual({ type: "box", direction: "in" });
    expect(parseFilter("box(out)")).toEqual({ type: "box", direction: "out" });
  });

  it("parses circle filter", () => {
    expect(parseFilter("circle(in)")).toEqual({ type: "circle", direction: "in" });
    expect(parseFilter("circle(out)")).toEqual({ type: "circle", direction: "out" });
  });

  it("parses diamond filter", () => {
    expect(parseFilter("diamond(in)")).toEqual({ type: "diamond", direction: "in" });
    expect(parseFilter("diamond(out)")).toEqual({ type: "diamond", direction: "out" });
  });

  it("parses barn filter", () => {
    expect(parseFilter("barn(inVertical)")).toEqual({ type: "barn", direction: "inVertical" });
    expect(parseFilter("barn(inHorizontal)")).toEqual({ type: "barn", direction: "inHorizontal" });
    expect(parseFilter("barn(outVertical)")).toEqual({ type: "barn", direction: "outVertical" });
    expect(parseFilter("barn(outHorizontal)")).toEqual({ type: "barn", direction: "outHorizontal" });
  });

  it("parses strips filter", () => {
    expect(parseFilter("strips(downLeft)")).toEqual({ type: "strips", direction: "downLeft" });
    expect(parseFilter("strips(downRight)")).toEqual({ type: "strips", direction: "downRight" });
    expect(parseFilter("strips(upLeft)")).toEqual({ type: "strips", direction: "upLeft" });
    expect(parseFilter("strips(upRight)")).toEqual({ type: "strips", direction: "upRight" });
  });

  it("parses checkerboard filter", () => {
    expect(parseFilter("checkerboard(across)")).toEqual({ type: "checkerboard", direction: "across" });
    expect(parseFilter("checkerboard(down)")).toEqual({ type: "checkerboard", direction: "down" });
  });

  it("parses wheel filter", () => {
    expect(parseFilter("wheel(1)")).toEqual({ type: "wheel", direction: "1" });
    expect(parseFilter("wheel(4)")).toEqual({ type: "wheel", direction: "4" });
    expect(parseFilter("wheel(8)")).toEqual({ type: "wheel", direction: "8" });
  });

  it("parses plus filter", () => {
    expect(parseFilter("plus(in)")).toEqual({ type: "plus", direction: "in" });
    expect(parseFilter("plus(out)")).toEqual({ type: "plus", direction: "out" });
  });

  it("parses randombar filter", () => {
    expect(parseFilter("randombar(horizontal)")).toEqual({ type: "randombar", direction: "horizontal" });
    expect(parseFilter("randombar(vertical)")).toEqual({ type: "randombar", direction: "vertical" });
  });

  it("parses wedge filter", () => {
    expect(parseFilter("wedge")).toEqual({ type: "wedge", direction: "in" });
  });

  it("parses dissolve filter", () => {
    expect(parseFilter("dissolve")).toEqual({ type: "dissolve", direction: "in" });
  });

  it("defaults unknown filters to fade", () => {
    expect(parseFilter("unknown")).toEqual({ type: "fade", direction: "in" });
    expect(parseFilter("")).toEqual({ type: "fade", direction: "in" });
  });
});

// =============================================================================
// Effect Animation Tests
// =============================================================================

describe("Browser Animation Effects", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
  });

  afterEach(() => {
    resetTimeProvider();
  });

  describe("animateFade - MS-OE376 fade filter", () => {
    it("animates opacity from 0 to 1 for entrance", async () => {
      const el = createMockElement();
      const promise = animateFade(el, 500, "in");

      // Initial state
      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(parseFloat(el.style.opacity)).toBeCloseTo(0, 1);

      // Half way (with easing)
      mockTime.tick(250);
      const midOpacity = parseFloat(el.style.opacity);
      expect(midOpacity).toBeGreaterThan(0);
      expect(midOpacity).toBeLessThan(1);

      // Complete
      mockTime.tick(250);
      expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 1);

      await promise;
    });

    it("animates opacity from 1 to 0 for exit", async () => {
      const el = createMockElement();
      const promise = animateFade(el, 500, "out");

      mockTime.tick(0);
      expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 1);

      mockTime.tick(500);
      expect(parseFloat(el.style.opacity)).toBeCloseTo(0, 1);

      await promise;
    });
  });

  describe("animateSlide - MS-OE376 slide filter", () => {
    it("slides from left", async () => {
      const el = createMockElement();
      const promise = animateSlide(el, 500, "left");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.transform).toContain("-100");

      mockTime.tick(500);
      expect(el.style.transform).toContain("0");

      await promise;
    });

    it("slides from right", async () => {
      const el = createMockElement();
      const promise = animateSlide(el, 500, "right");

      mockTime.tick(0);
      expect(el.style.transform).toContain("100");

      mockTime.tick(500);
      expect(el.style.transform).toContain("0");

      await promise;
    });

    it("slides from up (top)", async () => {
      const el = createMockElement();
      const promise = animateSlide(el, 500, "up");

      mockTime.tick(0);
      expect(el.style.transform).toMatch(/-100.*%/);

      mockTime.tick(500);
      await promise;
    });

    it("slides from down (bottom)", async () => {
      const el = createMockElement();
      const promise = animateSlide(el, 500, "down");

      mockTime.tick(0);
      expect(el.style.transform).toMatch(/100.*%/);

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animateWipe - MS-OE376 wipe filter", () => {
    it("wipes from right (default)", async () => {
      const el = createMockElement();
      const promise = animateWipe(el, 500, "right");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("inset");
      expect(el.style.clipPath).toContain("100%"); // Right edge clipped

      mockTime.tick(500);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");

      await promise;
    });

    it("wipes from left", async () => {
      const el = createMockElement();
      const promise = animateWipe(el, 500, "left");

      mockTime.tick(0);
      expect(el.style.clipPath).toContain("100%"); // Left edge clipped

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animateBlinds - MS-OE376 blinds filter", () => {
    it("animates horizontal blinds", async () => {
      const el = createMockElement();
      const promise = animateBlinds(el, 500, "horizontal");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.maskImage).toContain("repeating-linear-gradient");
      expect(el.style.maskImage).toContain("to bottom");

      mockTime.tick(500);
      await promise;
    });

    it("animates vertical blinds", async () => {
      const el = createMockElement();
      const promise = animateBlinds(el, 500, "vertical");

      mockTime.tick(0);
      expect(el.style.maskImage).toContain("to right");

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animateBox - MS-OE376 box filter", () => {
    it("expands box from center (in)", async () => {
      const el = createMockElement();
      const promise = animateBox(el, 500, "in");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("50%"); // Center point

      mockTime.tick(500);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");

      await promise;
    });

    it("contracts box to center (out)", async () => {
      const el = createMockElement();
      const promise = animateBox(el, 500, "out");

      mockTime.tick(0);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");

      mockTime.tick(500);
      expect(el.style.clipPath).toContain("50%");

      await promise;
    });
  });

  describe("animateCircle - MS-OE376 circle filter", () => {
    it("expands circle from center (in)", async () => {
      const el = createMockElement();
      const promise = animateCircle(el, 500, "in");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("circle(0%");

      mockTime.tick(500);
      expect(el.style.clipPath).toContain("circle(");
      // 75% is the final radius (not 0%)
      expect(el.style.clipPath).toContain("75%");

      await promise;
    });
  });

  describe("animateDiamond - MS-OE376 diamond filter", () => {
    it("expands diamond from center (in)", async () => {
      const el = createMockElement();
      const promise = animateDiamond(el, 500, "in");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("polygon");

      mockTime.tick(500);
      // Full diamond shape
      expect(el.style.clipPath).toContain("polygon(50% 0%");

      await promise;
    });
  });

  describe("animateDissolve - MS-OE376 dissolve filter", () => {
    it("dissolves with opacity and filter", async () => {
      const el = createMockElement();
      const promise = animateDissolve(el, 500, "in");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(parseFloat(el.style.opacity)).toBeCloseTo(0, 1);
      expect(el.style.filter).toContain("blur");

      mockTime.tick(500);
      expect(parseFloat(el.style.opacity)).toBeCloseTo(1, 1);

      await promise;
    });
  });

  describe("animateBarn - MS-OE376 barn filter", () => {
    it("opens barn doors horizontally inward", async () => {
      const el = createMockElement();
      const promise = animateBarn(el, 500, "inHorizontal");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("50%"); // Doors closed at center

      mockTime.tick(500);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");

      await promise;
    });

    it("opens barn doors vertically inward", async () => {
      const el = createMockElement();
      const promise = animateBarn(el, 500, "inVertical");

      mockTime.tick(0);
      expect(el.style.clipPath).toContain("50%");

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animateStrips - MS-OE376 strips filter", () => {
    it("animates diagonal strips downRight", async () => {
      const el = createMockElement();
      const promise = animateStrips(el, 500, "downRight");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.maskImage).toContain("repeating-linear-gradient");
      expect(el.style.maskImage).toContain("135deg");

      mockTime.tick(500);
      await promise;
    });

    it("animates diagonal strips upLeft", async () => {
      const el = createMockElement();
      const promise = animateStrips(el, 500, "upLeft");

      mockTime.tick(0);
      expect(el.style.maskImage).toContain("315deg");

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animateWheel - MS-OE376 wheel filter", () => {
    it("animates wheel rotation", async () => {
      const el = createMockElement();
      const promise = animateWheel(el, 500, "1");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("polygon");

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animatePlus - MS-OE376 plus filter", () => {
    it("expands plus shape from center", async () => {
      const el = createMockElement();
      const promise = animatePlus(el, 500, "in");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("polygon");

      mockTime.tick(500);
      // Full plus shape visible
      expect(el.style.clipPath).toContain("polygon(");

      await promise;
    });
  });

  describe("animateRandombar - MS-OE376 randombar filter", () => {
    it("animates horizontal random bars", async () => {
      const el = createMockElement();
      const promise = animateRandombar(el, 500, "horizontal");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.maskImage).toContain("repeating-linear-gradient");

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animateWedge - MS-OE376 wedge filter", () => {
    it("expands wedge from center", async () => {
      const el = createMockElement();
      const promise = animateWedge(el, 500, "in");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.clipPath).toContain("polygon");

      mockTime.tick(500);
      await promise;
    });
  });

  describe("animateCheckerboard - MS-OE376 checkerboard filter", () => {
    it("animates checkerboard across", async () => {
      const el = createMockElement();
      const promise = animateCheckerboard(el, 500, "across");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");
      expect(el.style.maskImage).toContain("conic-gradient");

      mockTime.tick(500);
      await promise;
    });
  });
});

// =============================================================================
// Effect Dispatcher Tests
// =============================================================================

describe("applyBrowserEffect - Effect Dispatcher", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
  });

  afterEach(() => {
    resetTimeProvider();
  });

  it("dispatches fade effect", async () => {
    const el = createMockElement();
    const promise = applyBrowserEffect(el, "fade", 500, "in");

    mockTime.tick(0);
    expect(el.style.visibility).toBe("visible");

    mockTime.tick(500);
    await promise;
  });

  it("dispatches all 15 effect types", async () => {
    const effects = [
      "fade",
      "slide",
      "wipe",
      "blinds",
      "box",
      "checkerboard",
      "circle",
      "diamond",
      "dissolve",
      "strips",
      "wheel",
      "plus",
      "barn",
      "randombar",
      "wedge",
    ] as const;

    for (const effect of effects) {
      const el = createMockElement();
      const promise = applyBrowserEffect(el, effect, 100, "in");

      mockTime.tick(0);
      expect(el.style.visibility).toBe("visible");

      mockTime.tick(100);
      await promise;
    }
  });
});
