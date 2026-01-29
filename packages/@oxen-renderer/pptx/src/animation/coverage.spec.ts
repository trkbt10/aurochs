/**
 * @file Animation coverage verification tests
 *
 * Comprehensive tests to verify animation module coverage
 * against ECMA-376 Section 19.5 requirements.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import { createPlayer, extractShapeIds } from "./player";
import {
  parseFilterToEffectType,
  parseFilterDirection,
  applyEffect,
  applyFade,
  applySlide,
  applyWipe,
  applyBlinds,
  applyBox,
  applyDissolve,
  applyWheel,
  showElement,
  hideElement,
  resetElementStyles,
} from "./effects";
import type { Timing } from "@oxen-office/pptx/domain/animation";
import type { EffectConfig } from "./types";

// =============================================================================
// Test Helpers
// =============================================================================

function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof value === "object" && value !== null && "style" in value;
}

function createMockElement(): HTMLElement {
  const el: unknown = {
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
    offsetHeight: 0,
  };
  if (!isHTMLElement(el)) {
    throw new Error("createMockElement: invalid mock element shape");
  }
  return el;
}

// =============================================================================
// Effect Filter Coverage Tests
// =============================================================================

describe("Effect Filter Coverage - MS-OE376 Part 4 Section 4.6.3", () => {
  describe("parseFilterToEffectType", () => {
    it("handles all MS-OE376 spec defined filters", () => {
      // MS-OE376 Part 4 Section 4.6.3 specifies 15 filter types
      expect(parseFilterToEffectType("fade")).toBe("fade");
      expect(parseFilterToEffectType("slide")).toBe("slide");
      expect(parseFilterToEffectType("wipe")).toBe("wipe");
      expect(parseFilterToEffectType("blinds")).toBe("blinds");
      expect(parseFilterToEffectType("box")).toBe("box");
      expect(parseFilterToEffectType("dissolve")).toBe("dissolve");
      expect(parseFilterToEffectType("wheel")).toBe("wheel");
      expect(parseFilterToEffectType("checkerboard")).toBe("checkerboard");
      expect(parseFilterToEffectType("circle")).toBe("circle");
      expect(parseFilterToEffectType("diamond")).toBe("diamond");
      expect(parseFilterToEffectType("strips")).toBe("strips");
      expect(parseFilterToEffectType("plus")).toBe("plus");
      expect(parseFilterToEffectType("barn")).toBe("barn");
      expect(parseFilterToEffectType("randombar")).toBe("randombar");
      expect(parseFilterToEffectType("wedge")).toBe("wedge");
    });

    it("handles filters with parameters", () => {
      expect(parseFilterToEffectType("fade(in)")).toBe("fade");
      expect(parseFilterToEffectType("fade(out)")).toBe("fade");
      expect(parseFilterToEffectType("wipe(right)")).toBe("wipe");
      expect(parseFilterToEffectType("slide(fromLeft)")).toBe("slide");
    });

    it("falls back to fade for non-spec filters", () => {
      // fly, zoom, split are not in MS-OE376 Part 4 Section 4.6.3
      expect(parseFilterToEffectType("fly")).toBe("fade");
      expect(parseFilterToEffectType("zoom")).toBe("fade");
      expect(parseFilterToEffectType("split")).toBe("fade");
      expect(parseFilterToEffectType("unknown")).toBe("fade");
      expect(parseFilterToEffectType("")).toBe("fade");
    });
  });

  describe("parseFilterDirection", () => {
    it("handles standard directions", () => {
      expect(parseFilterDirection("wipe(left)")).toBe("left");
      expect(parseFilterDirection("wipe(right)")).toBe("right");
      expect(parseFilterDirection("wipe(up)")).toBe("up");
      expect(parseFilterDirection("wipe(down)")).toBe("down");
      expect(parseFilterDirection("box(in)")).toBe("in");
      expect(parseFilterDirection("box(out)")).toBe("out");
    });

    it("handles PowerPoint 'from' directions for slide", () => {
      expect(parseFilterDirection("slide(fromLeft)")).toBe("left");
      expect(parseFilterDirection("slide(fromRight)")).toBe("right");
      expect(parseFilterDirection("slide(fromTop)")).toBe("up");
      expect(parseFilterDirection("slide(fromBottom)")).toBe("down");
    });

    it("defaults to 'in' when direction is missing", () => {
      expect(parseFilterDirection("fade")).toBe("in");
      expect(parseFilterDirection("wipe")).toBe("in");
      expect(parseFilterDirection("")).toBe("in");
    });
  });
});

// =============================================================================
// Effect Implementation Tests
// =============================================================================

describe("Effect Implementations - ECMA-376 19.5.3", () => {
  // Helper to wait for raf callback
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  describe("applyFade", () => {
    it("sets opacity to 0 initially for entrance", () => {
      const el = createMockElement();
      applyFade(el, { type: "fade", duration: 500, entrance: true });
      expect(el.style.opacity).toBe("0");
    });

    it("sets opacity transition after raf", async () => {
      const el = createMockElement();
      const config: EffectConfig = {
        type: "fade",
        duration: 1000,
        entrance: true,
      };
      applyFade(el, config);

      await nextTick();

      expect(el.style.transition).toContain("opacity");
      expect(el.style.transition).toContain("1000ms");
    });
  });

  describe("applySlide", () => {
    it("applies transform for left direction", () => {
      const el = createMockElement();
      applySlide(el, { type: "slide", duration: 1000, direction: "left", entrance: true });

      expect(el.style.transform).toContain("translateX");
    });

    it("sets transition after raf", async () => {
      const el = createMockElement();
      applySlide(el, { type: "slide", duration: 1000, direction: "left", entrance: true });

      await nextTick();

      expect(el.style.transition).toContain("transform");
    });

    it("applies transform for up direction", () => {
      const el = createMockElement();
      applySlide(el, { type: "slide", duration: 1000, direction: "up", entrance: true });

      expect(el.style.transform).toContain("translateY");
    });
  });

  describe("applyWipe", () => {
    it("uses clip-path for wipe effect", () => {
      const el = createMockElement();
      applyWipe(el, { type: "wipe", duration: 1000, direction: "right", entrance: true });

      expect(el.style.clipPath).toContain("inset");
    });

    it("sets transition after raf", async () => {
      const el = createMockElement();
      applyWipe(el, { type: "wipe", duration: 1000, direction: "right", entrance: true });

      await nextTick();

      expect(el.style.transition).toContain("clip-path");
    });
  });

  describe("applyDissolve", () => {
    it("uses blur filter for dissolve", () => {
      const el = createMockElement();
      applyDissolve(el, { type: "dissolve", duration: 1000, entrance: true });

      expect(el.style.filter).toContain("blur");
    });
  });

  describe("applyWheel", () => {
    it("applies rotation transform", () => {
      const el = createMockElement();
      applyWheel(el, { type: "wheel", duration: 1000, entrance: true });

      expect(el.style.transform).toContain("rotate");
    });
  });

  describe("applyBlinds", () => {
    it("uses mask for blinds effect", () => {
      const el = createMockElement();
      applyBlinds(el, { type: "blinds", duration: 1000, direction: "horizontal", entrance: true });

      expect(el.style.maskImage).toContain("repeating-linear-gradient");
    });

    it("updates mask size after raf", async () => {
      const el = createMockElement();
      applyBlinds(el, { type: "blinds", duration: 1000, direction: "horizontal", entrance: true });

      await nextTick();
      expect(el.style.maskSize).toBe("100% 20px");
    });
  });

  describe("applyBox", () => {
    it("uses clip-path for box effect", () => {
      const el = createMockElement();
      applyBox(el, { type: "box", duration: 1000, direction: "in", entrance: true });

      expect(el.style.clipPath).toContain("inset(");
    });

    it("updates clip-path after raf", async () => {
      const el = createMockElement();
      applyBox(el, { type: "box", duration: 1000, direction: "in", entrance: true });

      await nextTick();
      expect(el.style.clipPath).toBe("inset(0 0 0 0)");
    });
  });

  describe("applyEffect dispatcher", () => {
    it("dispatches to correct effect function", () => {
      const el = createMockElement();
      applyEffect(el, { type: "fade", duration: 1000, entrance: true });
      expect(el.style.opacity).toBe("0"); // Initial state

      const el2 = createMockElement();
      applyEffect(el2, { type: "wipe", duration: 1000, direction: "right", entrance: true });
      expect(el2.style.clipPath).toContain("inset");
    });

    it("applies checkerboard effect (now implemented)", () => {
      const el = createMockElement();
      applyEffect(el, { type: "checkerboard", duration: 1000, entrance: true });
      // Checkerboard uses mask for pattern effect
      expect(el.style.maskImage).toContain("conic-gradient");
      expect(el.style.opacity).toBe("1");
    });
  });
});

// =============================================================================
// Player Time Node Coverage Tests
// =============================================================================

describe("Player Time Node Coverage - ECMA-376 19.5", () => {
  describe("parallel time node (p:par - 19.5.53)", () => {
    it("executes children concurrently", async () => {
      const elements: Record<string, HTMLElement> = {
        "1": createMockElement(),
        "2": createMockElement(),
      };
      const timing: Timing = {
        rootTimeNode: {
          type: "parallel",
          id: 1,
          autoReverse: false,
          children: [
            {
              type: "set",
              id: 2,
              autoReverse: false,
              duration: 1,
              target: { type: "shape", shapeId: "1", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
            {
              type: "set",
              id: 3,
              autoReverse: false,
              duration: 1,
              target: { type: "shape", shapeId: "2", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
          ],
        },
      };

      const player = createPlayer({
        findElement: (id) => elements[id] || null,
        speed: 1000,
      });

      await player.play(timing);

      expect(elements["1"].style.visibility).toBe("visible");
      expect(elements["2"].style.visibility).toBe("visible");
    });
  });

  describe("sequence time node (p:seq - 19.5.65)", () => {
    it("executes children sequentially", async () => {
      const order: string[] = [];
      const elements: Record<string, HTMLElement> = {
        "1": createMockElement(),
        "2": createMockElement(),
      };

      const timing: Timing = {
        rootTimeNode: {
          type: "sequence",
          id: 1,
          autoReverse: false,
          children: [
            {
              type: "set",
              id: 2,
              autoReverse: false,
              duration: 1,
              target: { type: "shape", shapeId: "1", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
            {
              type: "set",
              id: 3,
              autoReverse: false,
              duration: 1,
              target: { type: "shape", shapeId: "2", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
          ],
        },
      };

      const player = createPlayer({
        findElement: (id) => {
          order.push(id);
          return elements[id] || null;
        },
        speed: 1000,
      });

      await player.play(timing);

      expect(order[0]).toBe("1");
      expect(order[1]).toBe("2");
    });
  });

  describe("exclusive time node (p:excl - 19.5.29)", () => {
    it("executes only first child", async () => {
      const elements: Record<string, HTMLElement> = {
        "1": createMockElement(),
        "2": createMockElement(),
      };

      const timing: Timing = {
        rootTimeNode: {
          type: "exclusive",
          id: 1,
          autoReverse: false,
          children: [
            {
              type: "set",
              id: 2,
              autoReverse: false,
              duration: 1,
              target: { type: "shape", shapeId: "1", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
            {
              type: "set",
              id: 3,
              autoReverse: false,
              duration: 1,
              target: { type: "shape", shapeId: "2", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
          ],
        },
      };

      const player = createPlayer({
        findElement: (id) => elements[id] || null,
        speed: 1000,
      });

      await player.play(timing);

      expect(elements["1"].style.visibility).toBe("visible");
      // Second child should not be executed
      expect(elements["2"].style.visibility).toBe("");
    });
  });

  describe("set behavior (p:set - 19.5.66)", () => {
    it("sets visibility instantly", async () => {
      const el = createMockElement();
      const timing: Timing = {
        rootTimeNode: {
          type: "set",
          id: 1,
          autoReverse: false,
          duration: 1,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          attribute: "style.visibility",
          value: "visible",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        speed: 1000,
      });

      await player.play(timing);

      expect(el.style.visibility).toBe("visible");
      expect(el.style.opacity).toBe("1");
    });
  });

  describe("animateEffect behavior (p:animEffect - 19.5.3)", () => {
    it("applies visual effect with filter", async () => {
      const el = createMockElement();
      const logs: string[] = [];

      const timing: Timing = {
        rootTimeNode: {
          type: "animateEffect",
          id: 1,
          autoReverse: false,
          duration: 100,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          transition: "in",
          filter: "slide(fromLeft)",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        onLog: (msg) => logs.push(msg),
        speed: 1000,
      });

      await player.play(timing);

      expect(logs.some((l) => l.includes("AnimateEffect"))).toBe(true);
      expect(el.style.transition).toContain("ms");
    });
  });

  describe("animateMotion behavior (p:animMotion - 19.5.4)", () => {
    it("applies motion path", async () => {
      const el = createMockElement();
      const logs: string[] = [];

      const timing: Timing = {
        rootTimeNode: {
          type: "animateMotion",
          id: 1,
          autoReverse: false,
          duration: 100,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          path: "M 0 0 L 100 100",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        onLog: (msg) => logs.push(msg),
        speed: 1000,
      });

      await player.play(timing);

      expect(logs.some((l) => l.includes("AnimateMotion"))).toBe(true);
    });
  });

  describe("animateRotation behavior (p:animRot - 19.5.5)", () => {
    it("applies rotation", async () => {
      const el = createMockElement();
      const logs: string[] = [];

      const timing: Timing = {
        rootTimeNode: {
          type: "animateRotation",
          id: 1,
          autoReverse: false,
          duration: 100,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          by: 360,
        },
      };

      const player = createPlayer({
        findElement: () => el,
        onLog: (msg) => logs.push(msg),
        speed: 1000,
      });

      await player.play(timing);

      expect(el.style.transform).toContain("rotate");
      expect(logs.some((l) => l.includes("AnimateRotation"))).toBe(true);
    });
  });

  describe("animateScale behavior (p:animScale - 19.5.6)", () => {
    it("applies scale transform", async () => {
      const el = createMockElement();
      const logs: string[] = [];

      const timing: Timing = {
        rootTimeNode: {
          type: "animateScale",
          id: 1,
          autoReverse: false,
          duration: 100,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          toX: 2,
          toY: 2,
        },
      };

      const player = createPlayer({
        findElement: () => el,
        onLog: (msg) => logs.push(msg),
        speed: 1000,
      });

      await player.play(timing);

      expect(el.style.transform).toContain("scale");
      expect(logs.some((l) => l.includes("AnimateScale"))).toBe(true);
    });
  });

  describe("animateColor behavior (p:animClr - 19.5.2)", () => {
    it("applies color animation", async () => {
      const el = createMockElement();
      const logs: string[] = [];

      const timing: Timing = {
        rootTimeNode: {
          type: "animateColor",
          id: 1,
          autoReverse: false,
          duration: 100,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          attribute: "style.color",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        onLog: (msg) => logs.push(msg),
        speed: 1000,
      });

      await player.play(timing);

      expect(logs.some((l) => l.includes("AnimateColor"))).toBe(true);
    });
  });
});

// =============================================================================
// Shape ID Extraction Tests
// =============================================================================

describe("extractShapeIds coverage", () => {
  it("extracts from all behavior types", () => {
    const timing: Timing = {
      rootTimeNode: {
        type: "parallel",
        id: 1,
        autoReverse: false,
        children: [
          {
            type: "set",
            id: 2,
            autoReverse: false,
            target: { type: "shape", shapeId: "1", targetBackground: false },
            attribute: "style.visibility",
            value: "visible",
          },
          {
            type: "animateEffect",
            id: 3,
            autoReverse: false,
            target: { type: "shape", shapeId: "2", targetBackground: false },
            transition: "in",
            filter: "fade",
          },
          {
            type: "animateMotion",
            id: 4,
            autoReverse: false,
            target: { type: "shape", shapeId: "3", targetBackground: false },
            path: "M 0 0",
          },
          {
            type: "animateRotation",
            id: 5,
            autoReverse: false,
            target: { type: "shape", shapeId: "4", targetBackground: false },
            by: 90,
          },
          {
            type: "animateScale",
            id: 6,
            autoReverse: false,
            target: { type: "shape", shapeId: "5", targetBackground: false },
            toX: 1.5,
            toY: 1.5,
          },
        ],
      },
    };

    const ids = extractShapeIds(timing);

    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).toContain("3");
    expect(ids).toContain("4");
    expect(ids).toContain("5");
    expect(ids.length).toBe(5);
  });
});

// =============================================================================
// Element Utility Coverage Tests
// =============================================================================

describe("Element utilities coverage", () => {
  describe("showElement", () => {
    it("sets all visibility properties", () => {
      const el = createMockElement();
      el.style.opacity = "0";
      el.style.visibility = "hidden";
      el.style.transform = "translateX(100px)";

      showElement(el);

      expect(el.style.opacity).toBe("1");
      expect(el.style.visibility).toBe("visible");
      expect(el.style.transition).toBe("none");
      expect(el.style.transform).toBe("");
    });
  });

  describe("hideElement", () => {
    it("hides element completely", () => {
      const el = createMockElement();
      el.style.opacity = "1";
      el.style.visibility = "visible";

      hideElement(el);

      expect(el.style.opacity).toBe("0");
      expect(el.style.visibility).toBe("hidden");
      expect(el.style.transition).toBe("none");
    });
  });

  describe("resetElementStyles", () => {
    it("clears all animation styles", () => {
      const el = createMockElement();
      el.style.transition = "all 1s";
      el.style.opacity = "0.5";
      el.style.transform = "scale(2)";
      el.style.clipPath = "inset(10%)";
      el.style.filter = "blur(5px)";

      resetElementStyles(el);

      expect(el.style.transition).toBe("none");
      expect(el.style.opacity).toBe("");
      expect(el.style.transform).toBe("");
      expect(el.style.clipPath).toBe("");
      expect(el.style.filter).toBe("");
    });
  });
});
