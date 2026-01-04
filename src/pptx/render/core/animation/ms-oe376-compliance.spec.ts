/**
 * @file MS-OE376 Part 4 Section 4.6.3 Compliance Tests
 *
 * Comprehensive tests verifying animation effects implementation
 * against MS-OE376 (Office Extensions to ECMA-376) specification.
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - animEffect (Animate Effect)
 * @see MS-OI29500 Part 1 Section 19.7.24 - ST_TLAnimateEffectTransition
 * @see https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/a96dab70-2e72-4319-928d-0eb4b275ce58
 */

import {
  applyEffect,
  applyFade,
  applySlide,
  applyWipe,
  applyBlinds,
  applyBox,
  applyCheckerboard,
  applyCircle,
  applyDiamond,
  applyDissolve,
  applyStrips,
  applyWheel,
  applyPlus,
  applyBarn,
  applyRandombar,
  applyWedge,
  parseFilterToEffectType,
  parseFilterDirection,
} from "./effects";
import type { EffectConfig, EffectType, EffectDirection } from "./types";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockElement(): HTMLElement & { style: Record<string, string> } {
  return {
    style: {
      transition: "",
      opacity: "",
      visibility: "",
      transform: "",
      clipPath: "",
      filter: "",
      transformOrigin: "",
      maskImage: "",
      maskSize: "",
      maskPosition: "",
      maskRepeat: "",
    },
  } as unknown as HTMLElement & { style: Record<string, string> };
}

// =============================================================================
// MS-OE376 Filter Types - Complete List
// =============================================================================

describe("MS-OE376 Part 4 Section 4.6.3 - Filter Types", () => {
  /**
   * The filter attribute specifies named transitions.
   * Valid filter types per MS-OE376:
   */
  const specifiedFilterTypes: EffectType[] = [
    "blinds", // blinds(horizontal), blinds(vertical)
    "box", // box(in), box(out)
    "checkerboard", // checkerboard(across), checkerboard(down)
    "circle", // circle(in), circle(out)
    "diamond", // diamond(in), diamond(out)
    "dissolve", // dissolve (no subtype)
    "fade", // fade (no subtype)
    "slide", // slide(fromTop), slide(fromBottom), slide(fromLeft), slide(fromRight)
    "plus", // plus(in), plus(out)
    "barn", // barn(inVertical), barn(inHorizontal), barn(outVertical), barn(outHorizontal)
    "randombar", // randombar(horizontal), randombar(vertical)
    "strips", // strips(downLeft), strips(upLeft), strips(downRight), strips(upRight)
    "wedge", // wedge (no subtype)
    "wheel", // wheel(1), wheel(2), wheel(3), wheel(4), wheel(8)
    "wipe", // wipe(right), wipe(left), wipe(up), wipe(down)
  ];

  it("parseFilterToEffectType handles all MS-OE376 filter types", () => {
    for (const filterType of specifiedFilterTypes) {
      const result = parseFilterToEffectType(filterType);
      expect(result).toBe(filterType);
    }
  });

  it("non-spec filters fall back to fade", () => {
    // fly, zoom, split are not in MS-OE376 Part 4 Section 4.6.3
    expect(parseFilterToEffectType("fly")).toBe("fade");
    expect(parseFilterToEffectType("zoom")).toBe("fade");
    expect(parseFilterToEffectType("split")).toBe("fade");
  });
});

// =============================================================================
// ST_TLAnimateEffectTransition - Transition Attribute
// =============================================================================

describe("MS-OI29500 Part 1 Section 19.7.24 - ST_TLAnimateEffectTransition", () => {
  /**
   * The transition attribute specifies the direction of the effect:
   * - "in" = entrance effect (object appears)
   * - "out" = exit effect (object disappears)
   * - "none" = PowerPoint interprets as "in"
   */

  it("entrance=true corresponds to transition='in'", () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: true });
    // For entrance, opacity starts at 0 and transitions to 1
    expect(el.style.opacity).toBe("0");
  });

  it("entrance=false corresponds to transition='out'", () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: false });
    // For exit, opacity starts at 1 and transitions to 0
    expect(el.style.opacity).toBe("1");
  });

  it("default entrance is true (none interpreted as in)", () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000 });
    // Default should behave as entrance
    expect(el.style.opacity).toBe("0");
  });
});

// =============================================================================
// blinds Effect - MS-OE376
// =============================================================================

describe("blinds effect (MS-OE376)", () => {
  /**
   * blinds - Text/object comes into view from behind vertical or horizontal window blinds
   * Subtypes: horizontal, vertical
   * Visual: Alternating bars progressively reveal content
   */

  it("blinds(horizontal) creates horizontal bars pattern", () => {
    const el = createMockElement();
    applyBlinds(el, { type: "blinds", duration: 1000, direction: "horizontal", entrance: true });

    expect(el.style.maskImage).toContain("linear-gradient");
    expect(el.style.maskImage).toContain("to bottom"); // horizontal bars = vertical gradient
  });

  it("blinds(vertical) creates vertical bars pattern", () => {
    const el = createMockElement();
    applyBlinds(el, { type: "blinds", duration: 1000, direction: "vertical", entrance: true });

    expect(el.style.maskImage).toContain("linear-gradient");
    expect(el.style.maskImage).toContain("to right"); // vertical bars = horizontal gradient
  });

  it("default direction is horizontal", () => {
    const el = createMockElement();
    applyBlinds(el, { type: "blinds", duration: 1000, entrance: true });

    expect(el.style.maskImage).toContain("to bottom");
  });
});

// =============================================================================
// box Effect - MS-OE376
// =============================================================================

describe("box effect (MS-OE376)", () => {
  /**
   * box - Text/object takes shape as a box, growing either from edges or center
   * Subtypes: in (from center), out (from edges)
   * Visual: Rectangular clip-path expanding/contracting
   */

  it("box(in) expands from center", () => {
    const el = createMockElement();
    applyBox(el, { type: "box", duration: 1000, direction: "in", entrance: true });

    // Starts from center (50% inset all sides)
    expect(el.style.clipPath).toContain("50%");
  });

  it("box(out) starts from full visibility", () => {
    const el = createMockElement();
    applyBox(el, { type: "box", duration: 1000, direction: "out", entrance: true });

    // Starts fully visible
    expect(el.style.clipPath).toBe("inset(0 0 0 0)");
  });
});

// =============================================================================
// checkerboard Effect - MS-OE376
// =============================================================================

describe("checkerboard effect (MS-OE376)", () => {
  /**
   * checkerboard - Text/object appears in checkerboard fashion
   * Subtypes: across (horizontal movement), down (vertical movement)
   * Visual: Alternating squares pattern revealing content
   */

  it("checkerboard creates conic-gradient pattern", () => {
    const el = createMockElement();
    applyCheckerboard(el, { type: "checkerboard", duration: 1000, entrance: true });

    expect(el.style.maskImage).toContain("conic-gradient");
  });

  it("checkerboard(across) animates horizontally", () => {
    const el = createMockElement();
    applyCheckerboard(el, { type: "checkerboard", duration: 1000, direction: "across", entrance: true });

    // Initial position offset for horizontal animation
    expect(el.style.maskPosition).toContain("-100%");
  });

  it("checkerboard(downward) animates vertically", () => {
    const el = createMockElement();
    applyCheckerboard(el, { type: "checkerboard", duration: 1000, direction: "downward", entrance: true });

    // Initial position offset for vertical animation
    expect(el.style.maskPosition).toContain("-100%");
  });
});

// =============================================================================
// circle Effect - MS-OE376
// =============================================================================

describe("circle effect (MS-OE376)", () => {
  /**
   * circle - Circular reveal from center
   * Subtypes: in (expand from center), out (contract to center)
   * Visual: circle() clip-path expanding/contracting
   */

  it("circle(in) uses circle clip-path expanding from center", () => {
    const el = createMockElement();
    applyCircle(el, { type: "circle", duration: 1000, direction: "in", entrance: true });

    expect(el.style.clipPath).toContain("circle");
    expect(el.style.clipPath).toContain("0%"); // starts at 0 radius
  });

  it("circle clip-path is centered at 50% 50%", () => {
    const el = createMockElement();
    applyCircle(el, { type: "circle", duration: 1000, entrance: true });

    expect(el.style.clipPath).toContain("50% 50%");
  });
});

// =============================================================================
// diamond Effect - MS-OE376
// =============================================================================

describe("diamond effect (MS-OE376)", () => {
  /**
   * diamond - Diamond-shaped reveal from center
   * Subtypes: in (expand), out (contract)
   * Visual: polygon() with 4 points forming diamond
   */

  it("diamond uses polygon clip-path", () => {
    const el = createMockElement();
    applyDiamond(el, { type: "diamond", duration: 1000, entrance: true });

    expect(el.style.clipPath).toContain("polygon");
  });

  it("diamond full state has 4 points forming rhombus", () => {
    const el = createMockElement();
    applyDiamond(el, { type: "diamond", duration: 1000, direction: "out", entrance: true });

    // Full diamond: top, right, bottom, left points
    expect(el.style.clipPath).toContain("50% 0%"); // top
    expect(el.style.clipPath).toContain("100% 50%"); // right
    expect(el.style.clipPath).toContain("50% 100%"); // bottom
    expect(el.style.clipPath).toContain("0% 50%"); // left
  });
});

// =============================================================================
// dissolve Effect - MS-OE376
// =============================================================================

describe("dissolve effect (MS-OE376)", () => {
  /**
   * dissolve - Dissolve transition (no subtypes)
   * Visual: Pixelated/grainy fade effect
   * Implementation: blur + opacity for CSS approximation
   */

  it("dissolve uses filter for grainy effect", () => {
    const el = createMockElement();
    applyDissolve(el, { type: "dissolve", duration: 1000, entrance: true });

    expect(el.style.filter).toContain("blur");
  });

  it("dissolve entrance starts with blur and low opacity", () => {
    const el = createMockElement();
    applyDissolve(el, { type: "dissolve", duration: 1000, entrance: true });

    expect(el.style.opacity).toBe("0");
    expect(el.style.filter).toContain("blur");
  });
});

// =============================================================================
// fade Effect - MS-OE376
// =============================================================================

describe("fade effect (MS-OE376)", () => {
  /**
   * fade - Text/object gradually comes into view (no subtypes)
   * Visual: Simple opacity transition
   */

  // Helper to wait for raf callback
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("fade entrance sets initial opacity 0", () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: true });

    expect(el.style.opacity).toBe("0");
  });

  it("fade entrance transitions to opacity 1 after raf", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: true });

    await nextTick();

    expect(el.style.opacity).toBe("1");
    expect(el.style.transition).toContain("opacity");
  });

  it("fade exit sets initial opacity 1", () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: false });

    expect(el.style.opacity).toBe("1");
  });
});

// =============================================================================
// slide Effect - MS-OE376
// =============================================================================

describe("slide effect (MS-OE376)", () => {
  /**
   * slide - Text/object flies in from bottom, top, left, or right sides
   * Subtypes: fromTop, fromBottom, fromLeft, fromRight
   * Visual: translate transform + opacity
   */

  it("slide(fromLeft) translates from negative X", () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "left", entrance: true });

    expect(el.style.transform).toContain("translateX(-");
  });

  it("slide(fromRight) translates from positive X", () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "right", entrance: true });

    expect(el.style.transform).toContain("translateX(");
    expect(el.style.transform).not.toContain("translateX(-");
  });

  it("slide(fromTop/up) translates from negative Y", () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "up", entrance: true });

    expect(el.style.transform).toContain("translateY(-");
  });

  it("slide(fromBottom/down) translates from positive Y", () => {
    const el = createMockElement();
    applySlide(el, { type: "slide", duration: 1000, direction: "down", entrance: true });

    expect(el.style.transform).toContain("translateY(");
    expect(el.style.transform).not.toContain("translateY(-");
  });
});

// =============================================================================
// plus Effect - MS-OE376
// =============================================================================

describe("plus effect (MS-OE376)", () => {
  /**
   * plus - Plus/cross shape expanding from center
   * Subtypes: in (expand), out (contract)
   * Visual: 12-point polygon forming + shape
   */

  it("plus uses polygon clip-path", () => {
    const el = createMockElement();
    applyPlus(el, { type: "plus", duration: 1000, entrance: true });

    expect(el.style.clipPath).toContain("polygon");
  });

  it("plus full state has cross shape", () => {
    const el = createMockElement();
    applyPlus(el, { type: "plus", duration: 1000, direction: "out", entrance: true });

    // Plus shape needs 12 points
    const clipPath = el.style.clipPath;
    const points = clipPath.match(/\d+%/g);
    expect(points?.length).toBeGreaterThanOrEqual(20); // 12 points * ~2 coords each
  });
});

// =============================================================================
// barn Effect - MS-OE376
// =============================================================================

describe("barn effect (MS-OE376)", () => {
  /**
   * barn - Barn door opening/closing effect
   * Subtypes: inVertical, inHorizontal, outVertical, outHorizontal
   * Visual: Split from center or edges
   */

  it("barn(inHorizontal) splits horizontally from center", () => {
    const el = createMockElement();
    applyBarn(el, { type: "barn", duration: 1000, direction: "inHorizontal", entrance: true });

    // Horizontal split = left/right insets
    expect(el.style.clipPath).toContain("50%");
  });

  it("barn(inVertical) splits vertically from center", () => {
    const el = createMockElement();
    applyBarn(el, { type: "barn", duration: 1000, direction: "inVertical", entrance: true });

    // Vertical split = top/bottom insets
    expect(el.style.clipPath).toContain("50%");
  });
});

// =============================================================================
// randombar Effect - MS-OE376
// =============================================================================

describe("randombar effect (MS-OE376)", () => {
  /**
   * randombar - Text/object comes into view from behind bars that turn and disappear
   * Subtypes: horizontal, vertical
   * Visual: Random-appearing bars revealing content
   */

  it("randombar uses mask for bar pattern", () => {
    const el = createMockElement();
    applyRandombar(el, { type: "randombar", duration: 1000, entrance: true });

    expect(el.style.maskImage).toContain("linear-gradient");
  });

  it("randombar(horizontal) creates horizontal bars", () => {
    const el = createMockElement();
    applyRandombar(el, { type: "randombar", duration: 1000, direction: "horizontal", entrance: true });

    expect(el.style.maskImage).toContain("to bottom");
  });

  it("randombar(vertical) creates vertical bars", () => {
    const el = createMockElement();
    applyRandombar(el, { type: "randombar", duration: 1000, direction: "vertical", entrance: true });

    expect(el.style.maskImage).toContain("to right");
  });
});

// =============================================================================
// strips Effect - MS-OE376
// =============================================================================

describe("strips effect (MS-OE376)", () => {
  /**
   * strips - Text/object peels into place from a specified direction
   * Subtypes: downLeft, upLeft, downRight, upRight
   * Visual: Diagonal strips revealing content
   */

  it("strips uses diagonal gradient mask", () => {
    const el = createMockElement();
    applyStrips(el, { type: "strips", duration: 1000, entrance: true });

    expect(el.style.maskImage).toContain("linear-gradient");
  });

  it("strips(downRight) uses 135deg angle", () => {
    const el = createMockElement();
    applyStrips(el, { type: "strips", duration: 1000, direction: "downRight", entrance: true });

    expect(el.style.maskImage).toContain("135deg");
  });

  it("strips(downLeft) uses 225deg angle", () => {
    const el = createMockElement();
    applyStrips(el, { type: "strips", duration: 1000, direction: "downLeft", entrance: true });

    expect(el.style.maskImage).toContain("225deg");
  });

  it("strips(upRight) uses 45deg angle", () => {
    const el = createMockElement();
    applyStrips(el, { type: "strips", duration: 1000, direction: "upRight", entrance: true });

    expect(el.style.maskImage).toContain("45deg");
  });

  it("strips(upLeft) uses 315deg angle", () => {
    const el = createMockElement();
    applyStrips(el, { type: "strips", duration: 1000, direction: "upLeft", entrance: true });

    expect(el.style.maskImage).toContain("315deg");
  });
});

// =============================================================================
// wedge Effect - MS-OE376
// =============================================================================

describe("wedge effect (MS-OE376)", () => {
  /**
   * wedge - Wedge shape expanding from center (no subtypes)
   * Visual: Triangular/pie-slice clip expanding
   */

  it("wedge uses polygon clip-path", () => {
    const el = createMockElement();
    applyWedge(el, { type: "wedge", duration: 1000, entrance: true });

    expect(el.style.clipPath).toContain("polygon");
  });

  it("wedge entrance starts from center point", () => {
    const el = createMockElement();
    applyWedge(el, { type: "wedge", duration: 1000, entrance: true });

    // Should start as a point at center
    expect(el.style.clipPath).toContain("50% 50%");
  });
});

// =============================================================================
// wheel Effect - MS-OE376
// =============================================================================

describe("wheel effect (MS-OE376)", () => {
  /**
   * wheel - Rotating wheel reveal with configurable spokes
   * Subtypes: 1, 2, 3, 4, 8 (spoke count)
   * Visual: Clockwise rotation revealing content
   * Note: Always clockwise per PowerPoint behavior
   */

  it("wheel uses rotation transform", () => {
    const el = createMockElement();
    applyWheel(el, { type: "wheel", duration: 1000, entrance: true });

    expect(el.style.transform).toContain("rotate");
  });

  it("wheel entrance rotates from -360deg to 0deg (clockwise)", () => {
    const el = createMockElement();
    applyWheel(el, { type: "wheel", duration: 1000, entrance: true });

    // Starts rotated, animates to 0
    expect(el.style.transform).toContain("-360deg");
  });

  it("wheel uses clip-path for reveal effect", () => {
    const el = createMockElement();
    applyWheel(el, { type: "wheel", duration: 1000, entrance: true });

    expect(el.style.clipPath).toContain("polygon");
  });

  it("wheel has centered transform origin", () => {
    const el = createMockElement();
    applyWheel(el, { type: "wheel", duration: 1000, entrance: true });

    expect(el.style.transformOrigin).toBe("center center");
  });
});

// =============================================================================
// wipe Effect - MS-OE376
// =============================================================================

describe("wipe effect (MS-OE376)", () => {
  /**
   * wipe - Text/object is wiped into place from a specified direction
   * Subtypes: right, left, up, down
   * Visual: Progressive reveal using clip-path inset
   */

  it("wipe uses clip-path inset", () => {
    const el = createMockElement();
    applyWipe(el, { type: "wipe", duration: 1000, entrance: true });

    expect(el.style.clipPath).toContain("inset");
  });

  it("wipe(right) reveals from left to right", () => {
    const el = createMockElement();
    applyWipe(el, { type: "wipe", duration: 1000, direction: "right", entrance: true });

    // Right wipe: start with right side clipped
    expect(el.style.clipPath).toContain("100%");
  });

  it("wipe(left) reveals from right to left", () => {
    const el = createMockElement();
    applyWipe(el, { type: "wipe", duration: 1000, direction: "left", entrance: true });

    // Left wipe: start with left side clipped
    expect(el.style.clipPath).toBe("inset(0 0 0 100%)");
  });

  it("wipe(down) reveals from top to bottom", () => {
    const el = createMockElement();
    applyWipe(el, { type: "wipe", duration: 1000, direction: "down", entrance: true });

    // Down wipe: start with bottom clipped
    expect(el.style.clipPath).toBe("inset(0 0 100% 0)");
  });

  it("wipe(up) reveals from bottom to top", () => {
    const el = createMockElement();
    applyWipe(el, { type: "wipe", duration: 1000, direction: "up", entrance: true });

    // Up wipe: start with top clipped
    expect(el.style.clipPath).toBe("inset(100% 0 0 0)");
  });
});

// =============================================================================
// Filter String Parsing - MS-OE376 Format
// =============================================================================

describe("Filter string parsing (MS-OE376 format)", () => {
  /**
   * Filter format: "type(subtype)" e.g., "blinds(horizontal)", "wipe(right)"
   */

  describe("parseFilterToEffectType", () => {
    it("parses type without subtype", () => {
      expect(parseFilterToEffectType("fade")).toBe("fade");
      expect(parseFilterToEffectType("dissolve")).toBe("dissolve");
      expect(parseFilterToEffectType("wedge")).toBe("wedge");
    });

    it("parses type with subtype", () => {
      expect(parseFilterToEffectType("blinds(horizontal)")).toBe("blinds");
      expect(parseFilterToEffectType("wipe(right)")).toBe("wipe");
      expect(parseFilterToEffectType("box(in)")).toBe("box");
    });

    it("is case-insensitive", () => {
      expect(parseFilterToEffectType("FADE")).toBe("fade");
      expect(parseFilterToEffectType("Blinds")).toBe("blinds");
      expect(parseFilterToEffectType("WIPE(RIGHT)")).toBe("wipe");
    });

    it("returns fade for unknown types", () => {
      expect(parseFilterToEffectType("unknown")).toBe("fade");
      expect(parseFilterToEffectType("")).toBe("fade");
    });
  });

  describe("parseFilterDirection", () => {
    it("parses subtype in parentheses", () => {
      expect(parseFilterDirection("blinds(horizontal)")).toBe("horizontal");
      expect(parseFilterDirection("blinds(vertical)")).toBe("vertical");
      expect(parseFilterDirection("wipe(right)")).toBe("right");
      expect(parseFilterDirection("wipe(left)")).toBe("left");
    });

    it("handles PowerPoint fromX format", () => {
      expect(parseFilterDirection("slide(fromLeft)")).toBe("left");
      expect(parseFilterDirection("slide(fromRight)")).toBe("right");
      expect(parseFilterDirection("slide(fromTop)")).toBe("up");
      expect(parseFilterDirection("slide(fromBottom)")).toBe("down");
    });

    it("handles barn subtypes", () => {
      expect(parseFilterDirection("barn(inHorizontal)")).toBe("inHorizontal");
      expect(parseFilterDirection("barn(inVertical)")).toBe("inVertical");
      expect(parseFilterDirection("barn(outHorizontal)")).toBe("outHorizontal");
      expect(parseFilterDirection("barn(outVertical)")).toBe("outVertical");
    });

    it("handles strips subtypes", () => {
      expect(parseFilterDirection("strips(downLeft)")).toBe("downLeft");
      expect(parseFilterDirection("strips(downRight)")).toBe("downRight");
      expect(parseFilterDirection("strips(upLeft)")).toBe("upLeft");
      expect(parseFilterDirection("strips(upRight)")).toBe("upRight");
    });

    it("returns in for missing subtype", () => {
      expect(parseFilterDirection("fade")).toBe("in");
      expect(parseFilterDirection("dissolve")).toBe("in");
    });
  });
});

// =============================================================================
// Duration and Easing - Common Behavior
// =============================================================================

describe("Duration and easing behavior", () => {
  // Helper to wait for raf callback
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("duration is applied to CSS transition after raf", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 2500, entrance: true });

    await nextTick();

    expect(el.style.transition).toContain("2500ms");
  });

  it("default easing is ease-out after raf", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, entrance: true });

    await nextTick();

    expect(el.style.transition).toContain("ease-out");
  });

  it("custom easing is applied after raf", async () => {
    const el = createMockElement();
    applyFade(el, { type: "fade", duration: 1000, easing: "linear", entrance: true });

    await nextTick();

    expect(el.style.transition).toContain("linear");
  });
});

// =============================================================================
// applyEffect Dispatcher
// =============================================================================

describe("applyEffect dispatcher (MS-OE376 compliance)", () => {
  // Only the 15 filter types defined in MS-OE376 Part 4 Section 4.6.3
  const allEffectTypes: EffectType[] = [
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
  ];

  it("handles all 15 MS-OE376 filter types", () => {
    for (const effectType of allEffectTypes) {
      const el = createMockElement();
      // Should not throw
      expect(() => {
        applyEffect(el, { type: effectType, duration: 1000, entrance: true });
      }).not.toThrow();
    }
  });

  it("each effect modifies at least one style property", () => {
    for (const effectType of allEffectTypes) {
      const el = createMockElement();
      applyEffect(el, { type: effectType, duration: 1000, entrance: true });

      // At least one style should be modified
      const hasModifiedStyle =
        el.style.transition !== "" ||
        el.style.opacity !== "" ||
        el.style.transform !== "" ||
        el.style.clipPath !== "" ||
        el.style.filter !== "" ||
        el.style.maskImage !== "";

      expect(hasModifiedStyle).toBe(true);
    }
  });
});
