/**
 * @file Animation effects library
 *
 * Reusable animation effect implementations for PPTX animations.
 * Works with both HTML and SVG elements.
 *
 * @see ECMA-376 Part 1, Section 19.5.3 (p:animEffect)
 * @see MS-OE376 Part 4 Section 4.6.3
 */

import type { EffectType, EffectDirection } from "@oxen-office/pptx/domain/animation";
import type { EffectConfig } from "./types";

/**
 * Get requestAnimationFrame or setTimeout fallback for non-browser environments.
 */
function getRaf(): (fn: () => void) => void {
  if (typeof globalThis.requestAnimationFrame !== "undefined") {
    return globalThis.requestAnimationFrame.bind(globalThis);
  }
  return (fn: () => void) => setTimeout(fn, 0);
}

const raf = getRaf();

/**
 * CSS transition string builder
 */
function buildTransition(
  properties: string[],
  duration: number,
  easing: string = "ease-out"
): string {
  return properties.map((p) => `${p} ${duration}ms ${easing}`).join(", ");
}

// =============================================================================
// Effect Implementations - ECMA-376/MS-OE376 Compliant
// =============================================================================

/**
 * Apply fade effect
 *
 * Simple opacity transition.
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - fade filter (no subtypes)
 */
export function applyFade(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, entrance = true, easing = "ease-out" } = config;

  // Step 1: Disable transitions and set initial value
  el.style.transition = "none";

  if (entrance) {
    el.style.opacity = "0";
  } else {
    el.style.opacity = "1";
  }

  // Step 2: Force reflow to apply initial state before enabling transition
  // This ensures the browser registers the initial value
  void (el as HTMLElement).offsetHeight;

  // Step 3: Enable transition and set final value
  raf(() => {
    el.style.transition = buildTransition(["opacity"], duration, easing);
    if (entrance) {
      el.style.opacity = "1";
    } else {
      el.style.opacity = "0";
    }
  });
}

/**
 * Apply slide effect (fly in/out from direction)
 *
 * Subtypes: fromTop, fromBottom, fromLeft, fromRight
 *
 * Per ECMA-376, the slide distance should be based on the element's bounding box.
 * We use 100% of the element's dimension in the slide direction.
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - slide filter
 */
export function applySlide(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const {
    duration,
    direction = "left",
    entrance = true,
    easing = "ease-out",
  } = config;

  // Use percentage-based transform for proper scaling with element size
  // This ensures the element slides completely off-screen regardless of its size
  const transforms: Partial<Record<EffectDirection, string>> = {
    left: "translateX(-100%)",
    right: "translateX(100%)",
    up: "translateY(-100%)",
    down: "translateY(100%)",
  };

  const startTransform = transforms[direction] ?? "translateX(-100%)";
  const endTransform = "translateX(0) translateY(0)";

  // Step 1: Disable transitions and set initial value
  el.style.transition = "none";

  if (entrance) {
    el.style.opacity = "0";
    el.style.transform = startTransform;
  } else {
    el.style.opacity = "1";
    el.style.transform = endTransform;
  }

  // Step 2: Force reflow to apply initial state
  void (el as HTMLElement).offsetHeight;

  // Step 3: Enable transition and set final value
  raf(() => {
    el.style.transition = buildTransition(
      ["transform", "opacity"],
      duration,
      easing
    );
    if (entrance) {
      el.style.opacity = "1";
      el.style.transform = endTransform;
    } else {
      el.style.opacity = "0";
      el.style.transform = startTransform;
    }
  });
}

/**
 * Apply wipe effect (reveal with clip-path)
 *
 * Subtypes: right, left, up, down
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - wipe filter
 */
export function applyWipe(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const {
    duration,
    direction = "right",
    entrance = true,
    easing = "ease-out",
  } = config;

  // clip-path: inset(top right bottom left)
  const clipPaths: Partial<Record<EffectDirection, { start: string; end: string }>> = {
    right: { start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)" },
    left: { start: "inset(0 0 0 100%)", end: "inset(0 0 0 0)" },
    down: { start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)" },
    up: { start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)" },
  };

  const clip = clipPaths[direction] ?? clipPaths.right!;

  // Step 1: Disable transitions and set initial value
  el.style.transition = "none";
  el.style.opacity = "1";

  if (entrance) {
    el.style.clipPath = clip.start;
  } else {
    el.style.clipPath = clip.end;
  }

  // Step 2: Force reflow to apply initial state
  void (el as HTMLElement).offsetHeight;

  // Step 3: Enable transition and set final value
  raf(() => {
    el.style.transition = buildTransition(["clip-path"], duration, easing);
    if (entrance) {
      el.style.clipPath = clip.end;
    } else {
      el.style.clipPath = clip.start;
    }
  });
}

/**
 * Apply blinds effect
 *
 * Horizontal or vertical blinds revealing content.
 * Subtypes: horizontal, vertical
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - blinds filter
 */
export function applyBlinds(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const {
    duration,
    direction = "horizontal",
    entrance = true,
    easing = "ease-out",
  } = config;

  el.style.transition = buildTransition(["mask-size", "opacity"], duration, easing);
  el.style.opacity = "1";

  // Create repeating gradient mask for blinds effect
  const isHorizontal = direction === "horizontal";
  const gradientDir = isHorizontal ? "to bottom" : "to right";
  const repeatSize = isHorizontal ? "100% 20px" : "20px 100%";

  // Use CSS mask with repeating gradient
  el.style.maskImage = `repeating-linear-gradient(${gradientDir}, black, black 50%, transparent 50%, transparent)`;
  el.style.maskRepeat = "repeat";

  if (entrance) {
    el.style.maskSize = isHorizontal ? "100% 0px" : "0px 100%";
    raf(() => {
      el.style.maskSize = repeatSize;
    });
  } else {
    el.style.maskSize = repeatSize;
    raf(() => {
      el.style.maskSize = isHorizontal ? "100% 0px" : "0px 100%";
    });
  }
}

/**
 * Apply box effect (expand/contract from center or edges)
 *
 * Subtypes: in (expand from center), out (contract to center)
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - box filter
 */
export function applyBox(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, direction = "in", entrance = true, easing = "ease-out" } = config;

  el.style.transition = buildTransition(["clip-path"], duration, easing);
  el.style.opacity = "1";

  // in = expand from center, out = start from edges
  const center = "inset(50% 50% 50% 50%)";
  const full = "inset(0 0 0 0)";

  if (entrance) {
    el.style.clipPath = direction === "in" ? center : full;
    raf(() => {
      el.style.clipPath = full;
    });
  } else {
    el.style.clipPath = full;
    raf(() => {
      el.style.clipPath = direction === "in" ? center : full;
    });
  }
}

/**
 * Apply checkerboard effect
 *
 * Checkerboard pattern revealing content.
 * Subtypes: across (horizontal), down (vertical)
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - checkerboard filter
 */
export function applyCheckerboard(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const {
    duration,
    direction = "across",
    entrance = true,
    easing = "ease-out",
  } = config;

  el.style.transition = buildTransition(["mask-size", "opacity"], duration, easing);
  el.style.opacity = "1";

  // Create checkerboard pattern using CSS gradients
  const size = 20; // checkerboard square size
  el.style.maskImage = `
    repeating-conic-gradient(
      from 0deg,
      black 0deg 90deg,
      transparent 90deg 180deg
    )
  `;
  el.style.maskSize = `${size * 2}px ${size * 2}px`;

  if (entrance) {
    el.style.maskPosition = direction === "across" ? "-100% 0" : "0 -100%";
    raf(() => {
      el.style.maskPosition = "0 0";
    });
  } else {
    el.style.maskPosition = "0 0";
    raf(() => {
      el.style.maskPosition = direction === "across" ? "100% 0" : "0 100%";
    });
  }
}

/**
 * Apply circle effect
 *
 * Circular reveal from center.
 * Subtypes: in (expand), out (contract)
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - circle filter
 */
export function applyCircle(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, direction = "in", entrance = true, easing = "ease-out" } = config;

  el.style.transition = buildTransition(["clip-path"], duration, easing);
  el.style.opacity = "1";

  // circle() clip-path for circular reveal
  const center = "circle(0% at 50% 50%)";
  const full = "circle(100% at 50% 50%)";

  if (entrance) {
    el.style.clipPath = direction === "in" ? center : full;
    raf(() => {
      el.style.clipPath = full;
    });
  } else {
    el.style.clipPath = full;
    raf(() => {
      el.style.clipPath = center;
    });
  }
}

/**
 * Apply diamond effect
 *
 * Diamond-shaped reveal from center.
 * Subtypes: in (expand), out (contract)
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - diamond filter
 */
export function applyDiamond(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, direction = "in", entrance = true, easing = "ease-out" } = config;

  el.style.transition = buildTransition(["clip-path"], duration, easing);
  el.style.opacity = "1";

  // polygon() for diamond shape
  const center = "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)";
  const full = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

  if (entrance) {
    el.style.clipPath = direction === "in" ? center : full;
    raf(() => {
      el.style.clipPath = full;
    });
  } else {
    el.style.clipPath = full;
    raf(() => {
      el.style.clipPath = center;
    });
  }
}

/**
 * Apply dissolve effect
 *
 * Pixelated dissolve transition.
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - dissolve filter (no subtypes)
 *
 * Limitation: PowerPoint's dissolve uses a pixelated random pattern.
 * CSS cannot replicate true pixelation, so we use blur + contrast
 * as an approximation that provides a similar visual effect.
 */
export function applyDissolve(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, entrance = true, easing = "ease-out" } = config;

  // Step 1: Disable transitions and set initial value
  el.style.transition = "none";

  if (entrance) {
    el.style.opacity = "0";
    el.style.filter = "blur(8px) contrast(0.5)";
  } else {
    el.style.opacity = "1";
    el.style.filter = "blur(0px) contrast(1)";
  }

  // Step 2: Force reflow to apply initial state
  void (el as HTMLElement).offsetHeight;

  // Step 3: Enable transition and set final value
  raf(() => {
    el.style.transition = buildTransition(["opacity", "filter"], duration, easing);
    if (entrance) {
      el.style.opacity = "1";
      el.style.filter = "blur(0px) contrast(1)";
    } else {
      el.style.opacity = "0";
      el.style.filter = "blur(8px) contrast(0.5)";
    }
  });
}


/**
 * Apply strips effect
 *
 * Diagonal strips revealing content.
 * Subtypes: downLeft, upLeft, downRight, upRight
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - strips filter
 */
export function applyStrips(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const {
    duration,
    direction = "downRight",
    entrance = true,
    easing = "ease-out",
  } = config;

  el.style.transition = buildTransition(["mask-position", "opacity"], duration, easing);
  el.style.opacity = "1";

  // Determine gradient angle based on direction
  const angles: Partial<Record<EffectDirection, string>> = {
    downRight: "135deg",
    downLeft: "225deg",
    upRight: "45deg",
    upLeft: "315deg",
  };
  const angle = angles[direction] ?? "135deg";

  // Create diagonal stripes mask
  el.style.maskImage = `repeating-linear-gradient(${angle}, black 0px, black 10px, transparent 10px, transparent 20px)`;
  el.style.maskSize = "200% 200%";

  if (entrance) {
    el.style.maskPosition = "-100% -100%";
    raf(() => {
      el.style.maskPosition = "0% 0%";
    });
  } else {
    el.style.maskPosition = "0% 0%";
    raf(() => {
      el.style.maskPosition = "100% 100%";
    });
  }
}

/**
 * Apply wheel effect
 *
 * Rotating wheel reveal with configurable spokes.
 * Subtypes: 1, 2, 3, 4, 8 (spoke count)
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - wheel filter
 *
 * Limitation: Spoke count subtypes (1, 2, 3, 4, 8) are not yet implemented.
 * Currently uses a single-spoke rotation effect. To implement spoke count,
 * would need dynamic conic-gradient generation for each spoke configuration.
 */
export function applyWheel(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, entrance = true, easing = "ease-out" } = config;

  el.style.transition = buildTransition(
    ["transform", "opacity", "clip-path"],
    duration,
    easing
  );
  el.style.transformOrigin = "center center";
  el.style.opacity = "1";

  // Use conic-gradient for wheel effect
  if (entrance) {
    el.style.clipPath = "polygon(50% 50%, 50% 0%, 50% 0%)";
    el.style.transform = "rotate(-360deg)";
    raf(() => {
      el.style.clipPath = "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)";
      el.style.transform = "rotate(0deg)";
    });
  } else {
    el.style.clipPath = "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)";
    el.style.transform = "rotate(0deg)";
    raf(() => {
      el.style.clipPath = "polygon(50% 50%, 50% 0%, 50% 0%)";
      el.style.transform = "rotate(360deg)";
    });
  }
}


/**
 * Apply plus effect
 *
 * Plus/cross shape expanding from center.
 * Subtypes: in (expand), out (contract)
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - plus filter
 */
export function applyPlus(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, direction = "in", entrance = true, easing = "ease-out" } = config;

  el.style.transition = buildTransition(["clip-path"], duration, easing);
  el.style.opacity = "1";

  // Plus shape using polygon
  const center = "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)";
  const full = "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)";

  if (entrance) {
    el.style.clipPath = direction === "in" ? center : full;
    raf(() => {
      el.style.clipPath = full;
    });
  } else {
    el.style.clipPath = full;
    raf(() => {
      el.style.clipPath = center;
    });
  }
}

/**
 * Apply barn effect
 *
 * Barn door opening/closing effect.
 * Subtypes: inVertical, inHorizontal, outVertical, outHorizontal
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - barn filter
 */
export function applyBarn(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, direction = "inHorizontal", entrance = true, easing = "ease-out" } = config;

  el.style.transition = buildTransition(["clip-path"], duration, easing);
  el.style.opacity = "1";

  const isHorizontal = direction === "inHorizontal" || direction === "outHorizontal";
  const isInward = direction === "inHorizontal" || direction === "inVertical";

  // Barn door from edges to center or center to edges
  const closed = isHorizontal ? "inset(0 50% 0 50%)" : "inset(50% 0 50% 0)";
  const open = "inset(0 0 0 0)";

  if (entrance) {
    el.style.clipPath = isInward ? closed : open;
    raf(() => {
      el.style.clipPath = open;
    });
  } else {
    el.style.clipPath = open;
    raf(() => {
      el.style.clipPath = closed;
    });
  }
}

/**
 * Apply randombar effect
 *
 * Random horizontal or vertical bars.
 * Subtypes: horizontal, vertical
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - randombar filter
 *
 * Limitation: PowerPoint uses truly random bar patterns generated per instance.
 * CSS cannot produce random patterns deterministically, so we use a fixed
 * pseudo-random repeating pattern that approximates the visual effect.
 */
export function applyRandombar(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const {
    duration,
    direction = "horizontal",
    entrance = true,
    easing = "ease-out",
  } = config;

  el.style.transition = buildTransition(["mask-size", "opacity"], duration, easing);
  el.style.opacity = "1";

  const isHorizontal = direction === "horizontal";
  const gradientDir = isHorizontal ? "to bottom" : "to right";

  // Create random-looking bars using multiple gradients
  el.style.maskImage = `
    repeating-linear-gradient(${gradientDir},
      black 0px, black 8px,
      transparent 8px, transparent 16px,
      black 16px, black 20px,
      transparent 20px, transparent 32px
    )
  `;

  if (entrance) {
    el.style.maskSize = isHorizontal ? "100% 0%" : "0% 100%";
    raf(() => {
      el.style.maskSize = "100% 100%";
    });
  } else {
    el.style.maskSize = "100% 100%";
    raf(() => {
      el.style.maskSize = isHorizontal ? "100% 0%" : "0% 100%";
    });
  }
}

/**
 * Apply wedge effect
 *
 * Wedge shape expanding from center.
 *
 * @see MS-OE376 Part 4 Section 4.6.3 - wedge filter (no subtypes)
 */
export function applyWedge(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const { duration, entrance = true, easing = "ease-out" } = config;

  el.style.transition = buildTransition(["clip-path"], duration, easing);
  el.style.opacity = "1";

  // Wedge using conic-gradient clip
  const center = "polygon(50% 50%, 50% 50%, 50% 50%)";
  const full = "polygon(50% 50%, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)";

  if (entrance) {
    el.style.clipPath = center;
    raf(() => {
      el.style.clipPath = full;
    });
  } else {
    el.style.clipPath = full;
    raf(() => {
      el.style.clipPath = center;
    });
  }
}

// =============================================================================
// Effect Dispatcher
// =============================================================================

/**
 * Apply effect by type
 *
 * Dispatches to the appropriate effect function based on config.type.
 * All effects are implemented per MS-OE376 Part 4 Section 4.6.3.
 *
 * @see ECMA-376 Part 1, Section 19.5.3 (p:animEffect)
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export function applyEffect(
  el: HTMLElement | SVGElement,
  config: EffectConfig
): void {
  const effectMap: Record<
    EffectType,
    (el: HTMLElement | SVGElement, config: EffectConfig) => void
  > = {
    fade: applyFade,
    slide: applySlide,
    wipe: applyWipe,
    blinds: applyBlinds,
    box: applyBox,
    checkerboard: applyCheckerboard,
    circle: applyCircle,
    diamond: applyDiamond,
    dissolve: applyDissolve,
    strips: applyStrips,
    wheel: applyWheel,
    plus: applyPlus,
    barn: applyBarn,
    randombar: applyRandombar,
    wedge: applyWedge,
  };

  const effectFn = effectMap[config.type];
  effectFn(el, config);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Reset element styles to initial state
 */
export function resetElementStyles(el: HTMLElement | SVGElement): void {
  el.style.transition = "none";
  el.style.opacity = "";
  el.style.transform = "";
  el.style.clipPath = "";
  el.style.filter = "";
  el.style.visibility = "";
  el.style.maskImage = "";
  el.style.maskSize = "";
  el.style.maskPosition = "";
  el.style.maskRepeat = "";
}

/**
 * Show element immediately (no animation)
 */
export function showElement(el: HTMLElement | SVGElement): void {
  el.style.transition = "none";
  el.style.opacity = "1";
  el.style.visibility = "visible";
  el.style.transform = "";
  el.style.clipPath = "";
  el.style.filter = "";
  el.style.maskImage = "";
}

/**
 * Prepare element for animation
 *
 * Sets visibility to visible but does NOT set opacity.
 * Use this when an animateEffect will follow to control opacity.
 *
 * This avoids race conditions when set visibility and animateEffect
 * run in parallel (common PPTX timing pattern).
 */
export function prepareForAnimation(el: HTMLElement | SVGElement): void {
  el.style.visibility = "visible";
}

/**
 * Hide element immediately (no animation)
 */
export function hideElement(el: HTMLElement | SVGElement): void {
  el.style.transition = "none";
  el.style.opacity = "0";
  el.style.visibility = "hidden";
}

/**
 * Parse PPTX filter string to effect type
 *
 * @see ECMA-376 Part 1, Section 19.5.3 (filter attribute)
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export function parseFilterToEffectType(filter: string): EffectType {
  const match = filter.match(/^(\w+)/);
  const type = match?.[1]?.toLowerCase() ?? "fade";

  const typeMap: Record<string, EffectType> = {
    fade: "fade",
    slide: "slide",
    wipe: "wipe",
    blinds: "blinds",
    box: "box",
    checkerboard: "checkerboard",
    circle: "circle",
    diamond: "diamond",
    dissolve: "dissolve",
    strips: "strips",
    wheel: "wheel",
    plus: "plus",
    barn: "barn",
    randombar: "randombar",
    wedge: "wedge",
  };

  return typeMap[type] ?? "fade";
}

/**
 * Parse direction from PPTX filter string
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export function parseFilterDirection(filter: string): EffectDirection {
  const match = filter.match(/\((\w+)\)/);
  const dir = match?.[1]?.toLowerCase() ?? "in";

  const dirMap: Record<string, EffectDirection> = {
    // Basic directions
    in: "in",
    out: "out",
    left: "left",
    right: "right",
    up: "up",
    down: "down",
    // Blinds/randombar
    horizontal: "horizontal",
    vertical: "vertical",
    // Checkerboard
    across: "across",
    downward: "downward",
    // Strips
    downleft: "downLeft",
    upleft: "upLeft",
    downright: "downRight",
    upright: "upRight",
    // Barn
    invertical: "inVertical",
    inhorizontal: "inHorizontal",
    outvertical: "outVertical",
    outhorizontal: "outHorizontal",
    // PowerPoint 'from' directions for slide
    fromleft: "left",
    fromright: "right",
    fromtop: "up",
    frombottom: "down",
  };

  return dirMap[dir] ?? "in";
}

