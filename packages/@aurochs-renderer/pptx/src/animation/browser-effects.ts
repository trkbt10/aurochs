/**
 * @file Browser Animation Effects
 *
 * JS-based animation effects using requestAnimationFrame.
 * All 15 effects from MS-OE376 Part 4 Section 4.6.3.
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 * @see ECMA-376 Part 1, Section 19.5.3 (p:animEffect)
 */

import { animate, lerp } from "./engine";

// =============================================================================
// Types
// =============================================================================

export type BrowserEffectType =
  | "fade"
  | "slide"
  | "wipe"
  | "blinds"
  | "box"
  | "checkerboard"
  | "circle"
  | "diamond"
  | "dissolve"
  | "strips"
  | "wheel"
  | "plus"
  | "barn"
  | "randombar"
  | "wedge";

export type BrowserEffectDirection = string;

export type ParsedFilter = {
  type: BrowserEffectType;
  direction: string;
}

// =============================================================================
// Filter Parsing (MS-OE376 Part 4 Section 4.6.3)
// =============================================================================

const EFFECT_TYPE_MAP: Record<string, BrowserEffectType> = {
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

const DIRECTION_MAP: Record<string, string> = {
  // Basic
  in: "in",
  out: "out",
  left: "left",
  right: "right",
  up: "up",
  down: "down",
  // PowerPoint slide directions
  fromleft: "left",
  fromright: "right",
  fromtop: "up",
  frombottom: "down",
  // Blinds/randombar
  horizontal: "horizontal",
  vertical: "vertical",
  // Checkerboard
  across: "across",
  // Strips
  downleft: "downLeft",
  downright: "downRight",
  upleft: "upLeft",
  upright: "upRight",
  // Barn
  invertical: "inVertical",
  inhorizontal: "inHorizontal",
  outvertical: "outVertical",
  outhorizontal: "outHorizontal",
  // Wheel spokes
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "8": "8",
};

/**
 * Parse filter string to effect type and direction.
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export function parseFilter(filter: string): ParsedFilter {
  const match = filter.match(/^(\w+)(?:\((\w+)\))?/);
  const typeStr = match?.[1]?.toLowerCase() ?? "fade";
  const dirStr = match?.[2]?.toLowerCase() ?? "in";

  return {
    type: EFFECT_TYPE_MAP[typeStr] ?? "fade",
    direction: DIRECTION_MAP[dirStr] ?? dirStr,
  };
}

// =============================================================================
// Effect Implementations
// =============================================================================

/**
 * Fade effect - simple opacity transition.
 * @see MS-OE376 Part 4 Section 4.6.3 - fade filter (no subtypes)
 */
export function animateFade(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isIn = direction !== "out";

  el.style.visibility = "visible";
  el.style.opacity = isIn ? "0" : "1";

  return animate({
    duration,
    onUpdate: (progress) => {
      const opacity = isIn ? progress : 1 - progress;
      el.style.opacity = String(opacity);
    },
  }).finished;
}

/**
 * Slide effect - fly in/out from direction.
 * @see MS-OE376 Part 4 Section 4.6.3 - slide filter
 */
export function animateSlide(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const offsets: Record<string, { x: number; y: number }> = {
    left: { x: -100, y: 0 },
    right: { x: 100, y: 0 },
    up: { x: 0, y: -100 },
    down: { x: 0, y: 100 },
  };
  const offset = offsets[direction] ?? offsets.left;

  el.style.visibility = "visible";
  el.style.opacity = "0";
  el.style.transform = `translate(${offset.x}%, ${offset.y}%)`;

  return animate({
    duration,
    onUpdate: (progress) => {
      const x = lerp(offset.x, 0, progress);
      const y = lerp(offset.y, 0, progress);
      el.style.transform = `translate(${x}%, ${y}%)`;
      el.style.opacity = String(progress);
    },
  }).finished;
}

/**
 * Wipe effect - reveal with clip-path.
 * @see MS-OE376 Part 4 Section 4.6.3 - wipe filter
 */
export function animateWipe(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  // clip-path: inset(top right bottom left)
  const clips: Record<string, { top: number; right: number; bottom: number; left: number }> = {
    right: { top: 0, right: 100, bottom: 0, left: 0 },
    left: { top: 0, right: 0, bottom: 0, left: 100 },
    down: { top: 0, right: 0, bottom: 100, left: 0 },
    up: { top: 100, right: 0, bottom: 0, left: 0 },
  };
  const clip = clips[direction] ?? clips.right;

  el.style.visibility = "visible";
  el.style.opacity = "1";
  el.style.clipPath = `inset(${clip.top}% ${clip.right}% ${clip.bottom}% ${clip.left}%)`;

  return animate({
    duration,
    onUpdate: (progress) => {
      const top = lerp(clip.top, 0, progress);
      const right = lerp(clip.right, 0, progress);
      const bottom = lerp(clip.bottom, 0, progress);
      const left = lerp(clip.left, 0, progress);
      el.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    },
  }).finished;
}

/**
 * Blinds effect - horizontal or vertical blinds.
 * @see MS-OE376 Part 4 Section 4.6.3 - blinds filter
 */
export function animateBlinds(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isHorizontal = direction === "horizontal";
  const gradientDir = isHorizontal ? "to bottom" : "to right";

  el.style.visibility = "visible";
  el.style.opacity = "1";
  el.style.maskImage = `repeating-linear-gradient(${gradientDir}, black, black 50%, transparent 50%, transparent)`;
  el.style.maskRepeat = "repeat";
  el.style.maskSize = isHorizontal ? "100% 0px" : "0px 100%";

  return animate({
    duration,
    onUpdate: (progress) => {
      const size = lerp(0, 20, progress);
      el.style.maskSize = isHorizontal ? `100% ${size}px` : `${size}px 100%`;
    },
  }).finished;
}

/**
 * Box effect - expand/contract from center.
 * @see MS-OE376 Part 4 Section 4.6.3 - box filter
 */
export function animateBox(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isIn = direction === "in";

  el.style.visibility = "visible";
  el.style.opacity = "1";

  const startInset = isIn ? 50 : 0;
  const endInset = isIn ? 0 : 50;

  el.style.clipPath = `inset(${startInset}% ${startInset}% ${startInset}% ${startInset}%)`;

  return animate({
    duration,
    onUpdate: (progress) => {
      const inset = lerp(startInset, endInset, progress);
      el.style.clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}%)`;
    },
  }).finished;
}

/**
 * Circle effect - circular reveal from center.
 * @see MS-OE376 Part 4 Section 4.6.3 - circle filter
 */
export function animateCircle(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isIn = direction === "in";

  el.style.visibility = "visible";
  el.style.opacity = "1";

  const startRadius = isIn ? 0 : 75;
  const endRadius = isIn ? 75 : 0;

  el.style.clipPath = `circle(${startRadius}% at 50% 50%)`;

  return animate({
    duration,
    onUpdate: (progress) => {
      const radius = lerp(startRadius, endRadius, progress);
      el.style.clipPath = `circle(${radius}% at 50% 50%)`;
    },
  }).finished;
}

/**
 * Diamond effect - diamond-shaped reveal from center.
 * @see MS-OE376 Part 4 Section 4.6.3 - diamond filter
 */
export function animateDiamond(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isIn = direction === "in";

  el.style.visibility = "visible";
  el.style.opacity = "1";

  // Diamond shape: polygon with 4 points
  const startSize = isIn ? 0 : 50;
  const endSize = isIn ? 50 : 0;

  const setDiamond = (size: number) => {
    el.style.clipPath = `polygon(50% ${50 - size}%, ${50 + size}% 50%, 50% ${50 + size}%, ${50 - size}% 50%)`;
  };

  setDiamond(startSize);

  return animate({
    duration,
    onUpdate: (progress) => {
      const size = lerp(startSize, endSize, progress);
      setDiamond(size);
    },
  }).finished;
}

/**
 * Dissolve effect - pixelated dissolve (approximated with blur).
 * @see MS-OE376 Part 4 Section 4.6.3 - dissolve filter
 */
export function animateDissolve(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isIn = direction !== "out";

  el.style.visibility = "visible";
  el.style.opacity = isIn ? "0" : "1";
  el.style.filter = isIn ? "blur(8px)" : "blur(0px)";

  return animate({
    duration,
    onUpdate: (progress) => {
      const opacity = isIn ? progress : 1 - progress;
      const blur = isIn ? lerp(8, 0, progress) : lerp(0, 8, progress);
      el.style.opacity = String(opacity);
      el.style.filter = `blur(${blur}px)`;
    },
  }).finished;
}

/**
 * Strips effect - diagonal strips.
 * @see MS-OE376 Part 4 Section 4.6.3 - strips filter
 */
export function animateStrips(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const angles: Record<string, string> = {
    downRight: "135deg",
    downLeft: "225deg",
    upRight: "45deg",
    upLeft: "315deg",
  };
  const angle = angles[direction] ?? "135deg";

  el.style.visibility = "visible";
  el.style.opacity = "1";
  el.style.maskImage = `repeating-linear-gradient(${angle}, black 0px, black 10px, transparent 10px, transparent 20px)`;
  el.style.maskSize = "200% 200%";
  el.style.maskPosition = "-100% -100%";

  return animate({
    duration,
    onUpdate: (progress) => {
      const pos = lerp(-100, 0, progress);
      el.style.maskPosition = `${pos}% ${pos}%`;
    },
  }).finished;
}

/**
 * Wheel effect - rotating wheel reveal.
 * @see MS-OE376 Part 4 Section 4.6.3 - wheel filter
 */
export function animateWheel(
  el: HTMLElement | SVGElement,
  duration: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- direction reserved for future spoke count variants
  direction: string
): Promise<void> {
  el.style.visibility = "visible";
  el.style.opacity = "1";
  el.style.transformOrigin = "center center";

  // Start with a thin wedge
  el.style.clipPath = "polygon(50% 50%, 50% 0%, 50% 0%)";
  el.style.transform = "rotate(-360deg)";

  return animate({
    duration,
    onUpdate: (progress) => {
      // Expand the wedge and rotate
      const angle = lerp(-360, 0, progress);
      el.style.transform = `rotate(${angle}deg)`;

      // Expand clip from wedge to full
      if (progress < 0.5) {
        // First half: expand right side
        const rightX = lerp(50, 100, progress * 2);
        el.style.clipPath = `polygon(50% 50%, 50% 0%, ${rightX}% 0%)`;
      } else {
        // Second half: complete the shape
        const bottomProgress = (progress - 0.5) * 2;
        if (bottomProgress < 0.5) {
          el.style.clipPath = `polygon(50% 50%, 50% 0%, 100% 0%, 100% ${lerp(0, 100, bottomProgress * 2)}%)`;
        } else {
          const leftProgress = (bottomProgress - 0.5) * 2;
          el.style.clipPath = `polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, ${lerp(100, 0, leftProgress)}% 100%)`;
        }
      }
    },
    onComplete: () => {
      el.style.clipPath = "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)";
      el.style.transform = "rotate(0deg)";
    },
  }).finished;
}

/**
 * Plus effect - plus/cross shape from center.
 * @see MS-OE376 Part 4 Section 4.6.3 - plus filter
 */
export function animatePlus(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isIn = direction === "in";

  el.style.visibility = "visible";
  el.style.opacity = "1";

  // Plus shape polygon
  const setPlus = (size: number) => {
    const inner = 50 - size;
    const outer = 50 + size;
    el.style.clipPath = `polygon(${inner}% 0%, ${outer}% 0%, ${outer}% ${inner}%, 100% ${inner}%, 100% ${outer}%, ${outer}% ${outer}%, ${outer}% 100%, ${inner}% 100%, ${inner}% ${outer}%, 0% ${outer}%, 0% ${inner}%, ${inner}% ${inner}%)`;
  };

  const startSize = isIn ? 0 : 50;
  const endSize = isIn ? 50 : 0;

  setPlus(startSize);

  return animate({
    duration,
    onUpdate: (progress) => {
      const size = lerp(startSize, endSize, progress);
      setPlus(size);
    },
  }).finished;
}

/**
 * Barn effect - barn door opening/closing.
 * @see MS-OE376 Part 4 Section 4.6.3 - barn filter
 */
export function animateBarn(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isHorizontal = direction === "inHorizontal" || direction === "outHorizontal";
  const isInward = direction === "inHorizontal" || direction === "inVertical";

  el.style.visibility = "visible";
  el.style.opacity = "1";

  // Barn doors from center
  const setClosed = () => {
    if (isHorizontal) {
      el.style.clipPath = "inset(0% 50% 0% 50%)";
    } else {
      el.style.clipPath = "inset(50% 0% 50% 0%)";
    }
  };

  const setOpen = () => {
    el.style.clipPath = "inset(0% 0% 0% 0%)";
  };

  if (isInward) {
    setClosed();
  } else {
    setOpen();
  }

  return animate({
    duration,
    onUpdate: (progress) => {
      const p = isInward ? progress : 1 - progress;
      const inset = lerp(50, 0, p);
      if (isHorizontal) {
        el.style.clipPath = `inset(0% ${inset}% 0% ${inset}%)`;
      } else {
        el.style.clipPath = `inset(${inset}% 0% ${inset}% 0%)`;
      }
    },
  }).finished;
}

/**
 * Randombar effect - random horizontal or vertical bars.
 * @see MS-OE376 Part 4 Section 4.6.3 - randombar filter
 */
export function animateRandombar(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isHorizontal = direction === "horizontal";
  const gradientDir = isHorizontal ? "to bottom" : "to right";

  el.style.visibility = "visible";
  el.style.opacity = "1";

  // Pseudo-random pattern using multiple stops
  el.style.maskImage = `repeating-linear-gradient(${gradientDir}, black 0px, black 8px, transparent 8px, transparent 16px, black 16px, black 20px, transparent 20px, transparent 32px)`;
  el.style.maskSize = isHorizontal ? "100% 0%" : "0% 100%";

  return animate({
    duration,
    onUpdate: (progress) => {
      const size = lerp(0, 100, progress);
      el.style.maskSize = isHorizontal ? `100% ${size}%` : `${size}% 100%`;
    },
  }).finished;
}

/**
 * Wedge effect - wedge shape from center.
 * @see MS-OE376 Part 4 Section 4.6.3 - wedge filter
 */
export function animateWedge(
  el: HTMLElement | SVGElement,
  duration: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- direction reserved for future wedge angle variants
  direction: string
): Promise<void> {
  el.style.visibility = "visible";
  el.style.opacity = "1";

  // Wedge expanding from center top
  el.style.clipPath = "polygon(50% 50%, 50% 50%, 50% 50%)";

  return animate({
    duration,
    onUpdate: (progress) => {
      // Expand wedge from a point to full triangle/shape
      const spread = lerp(0, 100, progress);
      el.style.clipPath = `polygon(50% 50%, ${50 - spread}% 0%, ${50 + spread}% 0%)`;
    },
    onComplete: () => {
      el.style.clipPath = "polygon(50% 50%, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)";
    },
  }).finished;
}

/**
 * Checkerboard effect - checkerboard pattern reveal.
 * @see MS-OE376 Part 4 Section 4.6.3 - checkerboard filter
 */
export function animateCheckerboard(
  el: HTMLElement | SVGElement,
  duration: number,
  direction: string
): Promise<void> {
  const isAcross = direction === "across";

  el.style.visibility = "visible";
  el.style.opacity = "1";

  // Checkerboard using conic gradient
  el.style.maskImage = `repeating-conic-gradient(from 0deg, black 0deg 90deg, transparent 90deg 180deg)`;
  el.style.maskSize = "40px 40px";
  el.style.maskPosition = isAcross ? "-100% 0%" : "0% -100%";

  return animate({
    duration,
    onUpdate: (progress) => {
      const pos = lerp(-100, 0, progress);
      el.style.maskPosition = isAcross ? `${pos}% 0%` : `0% ${pos}%`;
    },
  }).finished;
}

// =============================================================================
// Effect Dispatcher
// =============================================================================

/**
 * Apply effect by type.
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export function applyBrowserEffect({
  el,
  type,
  duration,
  direction,
}: {
  el: HTMLElement | SVGElement;
  type: BrowserEffectType;
  duration: number;
  direction: string;
}): Promise<void> {
  const effectMap: Record<BrowserEffectType, (el: HTMLElement | SVGElement, d: number, dir: string) => Promise<void>> = {
    fade: animateFade,
    slide: animateSlide,
    wipe: animateWipe,
    blinds: animateBlinds,
    box: animateBox,
    checkerboard: animateCheckerboard,
    circle: animateCircle,
    diamond: animateDiamond,
    dissolve: animateDissolve,
    strips: animateStrips,
    wheel: animateWheel,
    plus: animatePlus,
    barn: animateBarn,
    randombar: animateRandombar,
    wedge: animateWedge,
  };

  return effectMap[type](el, duration, direction);
}
