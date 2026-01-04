/**
 * @file Animation Engine Tests
 *
 * TDD tests for the JavaScript-based animation engine.
 * Uses mock time provider for deterministic, fast testing.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import {
  animate,
  animateOpacity,
  animateTranslate,
  animateClipInset,
  animateParallel,
  delay,
  lerp,
  easings,
  getEasing,
  createMockTimeProvider,
  setTimeProvider,
  resetTimeProvider,
  type AnimationController,
} from "./engine";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockElement(): HTMLElement {
  return {
    style: {
      opacity: "",
      visibility: "",
      transform: "",
      clipPath: "",
    },
  } as unknown as HTMLElement;
}

// =============================================================================
// Core Animation Engine Tests
// =============================================================================

describe("Animation Engine Core", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
  });

  afterEach(() => {
    resetTimeProvider();
  });

  describe("animate()", () => {
    it("calls onUpdate with progress 0-1 over duration", () => {
      const updates: number[] = [];

      animate({
        duration: 1000,
        easing: "linear",
        onUpdate: (progress) => updates.push(progress),
      });

      // Initial frame
      mockTime.tick(0);
      expect(updates).toEqual([0]);

      // Half way
      mockTime.tick(500);
      expect(updates[updates.length - 1]).toBeCloseTo(0.5, 2);

      // Complete
      mockTime.tick(500);
      expect(updates[updates.length - 1]).toBe(1);
    });

    it("applies easing function to progress", () => {
      const updates: number[] = [];

      animate({
        duration: 1000,
        easing: "ease-out", // quadratic ease-out
        onUpdate: (progress) => updates.push(progress),
      });

      mockTime.tick(0); // Start
      mockTime.tick(500); // Half way

      // ease-out at 0.5 should be > 0.5 (faster at start)
      const halfProgress = updates[updates.length - 1];
      expect(halfProgress).toBeGreaterThan(0.5);
      expect(halfProgress).toBeCloseTo(0.75, 2); // ease-out: 1 - (1-0.5)^2 = 0.75
    });

    it("calls onComplete when animation finishes", () => {
      let completed = false;

      animate({
        duration: 500,
        onComplete: () => {
          completed = true;
        },
      });

      mockTime.tick(0);
      expect(completed).toBe(false);

      mockTime.tick(500);
      expect(completed).toBe(true);
    });

    it("resolves finished promise when complete", async () => {
      const anim = animate({ duration: 500 });

      mockTime.tick(0);
      mockTime.tick(500);

      await anim.finished;
      expect(anim.getProgress()).toBe(1);
    });

    it("handles zero duration (instant)", () => {
      const updates: number[] = [];

      animate({
        duration: 0,
        onUpdate: (progress) => updates.push(progress),
      });

      mockTime.tick(0);
      expect(updates).toEqual([1]); // Immediately at 100%
    });
  });

  describe("cancel()", () => {
    it("stops the animation", () => {
      const updates: number[] = [];

      const anim = animate({
        duration: 1000,
        easing: "linear", // Use linear for predictable testing
        onUpdate: (progress) => updates.push(progress),
      });

      mockTime.tick(0);
      mockTime.tick(250);
      anim.cancel();

      const countAfterCancel = updates.length;
      const progressAtCancel = updates[updates.length - 1];

      // Further ticks should not add updates
      mockTime.tick(250);
      mockTime.tick(250);

      expect(updates.length).toBe(countAfterCancel); // No new updates
      expect(progressAtCancel).toBeCloseTo(0.25, 1);

      // Ignore the rejection from cancel
      anim.finished.catch(() => {});
    });

    it("calls onCancel callback", () => {
      let cancelled = false;

      const anim = animate({
        duration: 1000,
        onCancel: () => {
          cancelled = true;
        },
      });

      mockTime.tick(0);
      anim.cancel();

      expect(cancelled).toBe(true);

      // Ignore the rejection from cancel
      anim.finished.catch(() => {});
    });

    it("rejects finished promise", async () => {
      const anim = animate({ duration: 1000 });

      mockTime.tick(0);
      anim.cancel();

      await expect(anim.finished).rejects.toThrow("Animation cancelled");
    });
  });

  describe("pause() and resume()", () => {
    it("pauses animation at current progress", () => {
      const updates: number[] = [];

      const anim = animate({
        duration: 1000,
        easing: "linear",
        onUpdate: (progress) => updates.push(progress),
      });

      mockTime.tick(0);
      mockTime.tick(300);
      anim.pause();

      // Further ticks should not progress
      mockTime.tick(500);
      expect(updates[updates.length - 1]).toBeCloseTo(0.3, 2);
    });

    it("resumes from paused position", () => {
      const updates: number[] = [];

      const anim = animate({
        duration: 1000,
        easing: "linear",
        onUpdate: (progress) => updates.push(progress),
      });

      mockTime.tick(0);
      mockTime.tick(300); // At 30%
      anim.pause();
      mockTime.advance(1000); // Time passes while paused
      anim.resume();

      mockTime.tick(0); // Resume frame
      mockTime.tick(350); // +35% = 65% total

      expect(updates[updates.length - 1]).toBeCloseTo(0.65, 2);
    });
  });

  describe("getProgress()", () => {
    it("returns current raw progress", () => {
      const anim = animate({
        duration: 1000,
        easing: "linear",
      });

      mockTime.tick(0);
      expect(anim.getProgress()).toBe(0);

      mockTime.tick(500);
      expect(anim.getProgress()).toBeCloseTo(0.5, 2);

      mockTime.tick(500);
      expect(anim.getProgress()).toBe(1);
    });
  });
});

// =============================================================================
// Easing Functions Tests
// =============================================================================

describe("Easing Functions", () => {
  it("linear returns input unchanged", () => {
    expect(easings.linear(0)).toBe(0);
    expect(easings.linear(0.5)).toBe(0.5);
    expect(easings.linear(1)).toBe(1);
  });

  it("ease-out is faster at start", () => {
    // At 0.5 input, ease-out should be > 0.5
    expect(easings["ease-out"](0.5)).toBeGreaterThan(0.5);
    // Boundaries
    expect(easings["ease-out"](0)).toBe(0);
    expect(easings["ease-out"](1)).toBe(1);
  });

  it("ease-in is slower at start", () => {
    // At 0.5 input, ease-in should be < 0.5
    expect(easings["ease-in"](0.5)).toBeLessThan(0.5);
    // Boundaries
    expect(easings["ease-in"](0)).toBe(0);
    expect(easings["ease-in"](1)).toBe(1);
  });

  it("ease-in-out is symmetric", () => {
    // At 0.5 input, ease-in-out should be ~0.5
    expect(easings["ease-in-out"](0.5)).toBeCloseTo(0.5, 2);
    // Boundaries
    expect(easings["ease-in-out"](0)).toBe(0);
    expect(easings["ease-in-out"](1)).toBe(1);
  });

  it("getEasing returns function by name", () => {
    expect(getEasing("linear")).toBe(easings.linear);
    expect(getEasing("ease-out")).toBe(easings["ease-out"]);
  });

  it("getEasing returns function if passed a function", () => {
    const custom = (t: number) => t * t * t;
    expect(getEasing(custom)).toBe(custom);
  });

  it("getEasing returns ease-out as default", () => {
    expect(getEasing(undefined)).toBe(easings["ease-out"]);
  });
});

// =============================================================================
// Interpolation Tests
// =============================================================================

describe("lerp()", () => {
  it("interpolates between two values", () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it("works with negative values", () => {
    expect(lerp(-100, 100, 0.5)).toBe(0);
    expect(lerp(100, -100, 0.5)).toBe(0);
  });

  it("extrapolates beyond 0-1 range", () => {
    expect(lerp(0, 100, 1.5)).toBe(150);
    expect(lerp(0, 100, -0.5)).toBe(-50);
  });
});

// =============================================================================
// Style Animation Tests
// =============================================================================

describe("animateOpacity()", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;
  let el: HTMLElement;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
    el = createMockElement();
  });

  afterEach(() => {
    resetTimeProvider();
  });

  it("sets initial opacity immediately", () => {
    animateOpacity(el, 0, 1, 500);
    expect(el.style.opacity).toBe("0");
  });

  it("animates opacity from 0 to 1", () => {
    animateOpacity(el, 0, 1, 500, "linear");

    mockTime.tick(0);
    expect(el.style.opacity).toBe("0");

    mockTime.tick(250);
    expect(parseFloat(el.style.opacity)).toBeCloseTo(0.5, 2);

    mockTime.tick(250);
    expect(el.style.opacity).toBe("1");
  });

  it("animates opacity from 1 to 0 (exit)", () => {
    animateOpacity(el, 1, 0, 500, "linear");

    mockTime.tick(0);
    expect(el.style.opacity).toBe("1");

    mockTime.tick(500);
    expect(el.style.opacity).toBe("0");
  });
});

describe("animateTranslate()", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;
  let el: HTMLElement;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
    el = createMockElement();
  });

  afterEach(() => {
    resetTimeProvider();
  });

  it("sets initial transform immediately", () => {
    animateTranslate(el, -100, 0, 0, 0, 500);
    expect(el.style.transform).toBe("translate(-100%, 0%)");
  });

  it("animates translate from offset to origin", () => {
    animateTranslate(el, -100, 0, 0, 0, 500, "linear");

    mockTime.tick(0);
    expect(el.style.transform).toBe("translate(-100%, 0%)");

    mockTime.tick(250);
    expect(el.style.transform).toBe("translate(-50%, 0%)");

    mockTime.tick(250);
    expect(el.style.transform).toBe("translate(0%, 0%)");
  });
});

describe("animateClipInset()", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;
  let el: HTMLElement;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
    el = createMockElement();
  });

  afterEach(() => {
    resetTimeProvider();
  });

  it("sets initial clip-path immediately", () => {
    animateClipInset(el, { top: 0, right: 100, bottom: 0, left: 0 }, { top: 0, right: 0, bottom: 0, left: 0 }, 500);
    expect(el.style.clipPath).toBe("inset(0% 100% 0% 0%)");
  });

  it("animates clip-path for wipe effect", () => {
    animateClipInset(
      el,
      { top: 0, right: 100, bottom: 0, left: 0 }, // Fully clipped from right
      { top: 0, right: 0, bottom: 0, left: 0 }, // Fully visible
      500,
      "linear",
    );

    mockTime.tick(0);
    expect(el.style.clipPath).toBe("inset(0% 100% 0% 0%)");

    mockTime.tick(250);
    expect(el.style.clipPath).toBe("inset(0% 50% 0% 0%)");

    mockTime.tick(250);
    expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");
  });
});

// =============================================================================
// Animation Composition Tests
// =============================================================================

describe("animateParallel()", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
  });

  afterEach(() => {
    resetTimeProvider();
  });

  it("runs multiple animations in parallel", () => {
    const el1 = createMockElement();
    const el2 = createMockElement();

    const combined = animateParallel([
      animateOpacity(el1, 0, 1, 500, "linear"),
      animateOpacity(el2, 0, 1, 500, "linear"),
    ]);

    mockTime.tick(0);
    expect(el1.style.opacity).toBe("0");
    expect(el2.style.opacity).toBe("0");

    mockTime.tick(500);
    expect(el1.style.opacity).toBe("1");
    expect(el2.style.opacity).toBe("1");
    expect(combined.getProgress()).toBe(1);
  });

  it("waits for longest animation", () => {
    const el1 = createMockElement();
    const el2 = createMockElement();

    const combined = animateParallel([
      animateOpacity(el1, 0, 1, 300, "linear"),
      animateOpacity(el2, 0, 1, 500, "linear"),
    ]);

    mockTime.tick(0);
    mockTime.tick(300);
    expect(el1.style.opacity).toBe("1");
    expect(parseFloat(el2.style.opacity)).toBeCloseTo(0.6, 1);

    mockTime.tick(200);
    expect(el2.style.opacity).toBe("1");
    expect(combined.getProgress()).toBe(1);
  });

  it("cancel stops all animations", () => {
    const el1 = createMockElement();
    const el2 = createMockElement();

    const combined = animateParallel([
      animateOpacity(el1, 0, 1, 500, "linear"),
      animateOpacity(el2, 0, 1, 500, "linear"),
    ]);

    mockTime.tick(0);
    mockTime.tick(250);
    combined.cancel();

    const opacity1 = el1.style.opacity;
    const opacity2 = el2.style.opacity;

    mockTime.tick(250);

    // Should not have changed
    expect(el1.style.opacity).toBe(opacity1);
    expect(el2.style.opacity).toBe(opacity2);

    // Ignore the rejection from cancel
    combined.finished.catch(() => {});
  });
});

describe("delay()", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
  });

  afterEach(() => {
    resetTimeProvider();
  });

  it("waits for specified duration", async () => {
    const d = delay(500);

    mockTime.tick(0);
    expect(d.getProgress()).toBe(0);

    mockTime.tick(250);
    expect(d.getProgress()).toBeCloseTo(0.5, 2);

    mockTime.tick(250);
    await d.finished;
    expect(d.getProgress()).toBe(1);
  });
});

// =============================================================================
// Effect Animation Tests (PPTX-specific)
// =============================================================================

describe("PPTX Effect Animations", () => {
  let mockTime: ReturnType<typeof createMockTimeProvider>;
  let el: HTMLElement;

  beforeEach(() => {
    mockTime = createMockTimeProvider();
    setTimeProvider(mockTime);
    el = createMockElement();
  });

  afterEach(() => {
    resetTimeProvider();
  });

  describe("Fade Effect", () => {
    it("entrance: 0 -> 1 opacity", () => {
      animateOpacity(el, 0, 1, 500, "ease-out");

      expect(el.style.opacity).toBe("0");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.opacity).toBe("1");
    });

    it("exit: 1 -> 0 opacity", () => {
      animateOpacity(el, 1, 0, 500, "ease-out");

      expect(el.style.opacity).toBe("1");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.opacity).toBe("0");
    });
  });

  describe("Slide Effect", () => {
    it("slide from left: -100% -> 0%", () => {
      animateTranslate(el, -100, 0, 0, 0, 500, "ease-out");

      expect(el.style.transform).toBe("translate(-100%, 0%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.transform).toBe("translate(0%, 0%)");
    });

    it("slide from right: 100% -> 0%", () => {
      animateTranslate(el, 100, 0, 0, 0, 500, "ease-out");

      expect(el.style.transform).toBe("translate(100%, 0%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.transform).toBe("translate(0%, 0%)");
    });

    it("slide from top: 0, -100% -> 0, 0%", () => {
      animateTranslate(el, 0, -100, 0, 0, 500, "ease-out");

      expect(el.style.transform).toBe("translate(0%, -100%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.transform).toBe("translate(0%, 0%)");
    });

    it("slide from bottom: 0, 100% -> 0, 0%", () => {
      animateTranslate(el, 0, 100, 0, 0, 500, "ease-out");

      expect(el.style.transform).toBe("translate(0%, 100%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.transform).toBe("translate(0%, 0%)");
    });
  });

  describe("Wipe Effect", () => {
    it("wipe from left: inset(0 0 0 100%) -> inset(0 0 0 0)", () => {
      animateClipInset(
        el,
        { top: 0, right: 0, bottom: 0, left: 100 },
        { top: 0, right: 0, bottom: 0, left: 0 },
        500,
        "ease-out",
      );

      expect(el.style.clipPath).toBe("inset(0% 0% 0% 100%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");
    });

    it("wipe from right: inset(0 100% 0 0) -> inset(0 0 0 0)", () => {
      animateClipInset(
        el,
        { top: 0, right: 100, bottom: 0, left: 0 },
        { top: 0, right: 0, bottom: 0, left: 0 },
        500,
        "ease-out",
      );

      expect(el.style.clipPath).toBe("inset(0% 100% 0% 0%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");
    });

    it("wipe from top: inset(100% 0 0 0) -> inset(0 0 0 0)", () => {
      animateClipInset(
        el,
        { top: 100, right: 0, bottom: 0, left: 0 },
        { top: 0, right: 0, bottom: 0, left: 0 },
        500,
        "ease-out",
      );

      expect(el.style.clipPath).toBe("inset(100% 0% 0% 0%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");
    });

    it("wipe from bottom: inset(0 0 100% 0) -> inset(0 0 0 0)", () => {
      animateClipInset(
        el,
        { top: 0, right: 0, bottom: 100, left: 0 },
        { top: 0, right: 0, bottom: 0, left: 0 },
        500,
        "ease-out",
      );

      expect(el.style.clipPath).toBe("inset(0% 0% 100% 0%)");
      mockTime.tick(0);
      mockTime.tick(500);
      expect(el.style.clipPath).toBe("inset(0% 0% 0% 0%)");
    });
  });

  describe("Combined Slide + Opacity (MS-OE376 pattern)", () => {
    it("slide with opacity fade-in", () => {
      // Common pattern: slide from left while fading in
      const slideAnim = animateTranslate(el, -100, 0, 0, 0, 500, "ease-out");
      const fadeAnim = animateOpacity(el, 0, 1, 500, "ease-out");

      const combined = animateParallel([slideAnim, fadeAnim]);

      // Initial state
      expect(el.style.transform).toBe("translate(-100%, 0%)");
      expect(el.style.opacity).toBe("0");

      mockTime.tick(0);
      mockTime.tick(500);

      // Final state
      expect(el.style.transform).toBe("translate(0%, 0%)");
      expect(el.style.opacity).toBe("1");
      expect(combined.getProgress()).toBe(1);
    });
  });
});
