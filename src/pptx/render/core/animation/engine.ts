/**
 * @file JavaScript-based Animation Engine
 *
 * Provides reliable, testable animation without CSS transitions.
 * Uses requestAnimationFrame for smooth updates and manual interpolation.
 *
 * Benefits over CSS transitions:
 * - No reflow/RAF timing issues
 * - Fully testable in non-browser environments
 * - Precise control over animation progress
 * - Consistent behavior across browsers
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 * @see MS-OE376 Part 4 Section 4.6.3
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Easing function type
 * Takes progress (0-1) and returns eased progress (0-1)
 */
export type EasingFn = (t: number) => number;

/**
 * Animation options
 */
export type AnimationOptions = {
  /** Duration in milliseconds */
  duration: number;
  /** Easing function or name */
  easing?: EasingFn | EasingName;
  /** Called each frame with current progress (0-1) */
  onUpdate?: (progress: number) => void;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Called if animation is cancelled */
  onCancel?: () => void;
}

/**
 * Animation controller returned by animate()
 */
export type AnimationController = {
  /** Promise that resolves when animation completes */
  readonly finished: Promise<void>;
  /** Cancel the animation */
  cancel(): void;
  /** Pause the animation */
  pause(): void;
  /** Resume paused animation */
  resume(): void;
  /** Get current progress (0-1) */
  getProgress(): number;
}

/**
 * Named easing functions
 */
export type EasingName =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "ease-in-cubic"
  | "ease-out-cubic"
  | "ease-in-out-cubic";

// =============================================================================
// Easing Functions
// =============================================================================

/**
 * Common easing functions
 * @see https://easings.net/
 */
export const easings: Record<EasingName, EasingFn> = {
  linear: (t) => t,
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  "ease-in-cubic": (t) => t * t * t,
  "ease-out-cubic": (t) => 1 - Math.pow(1 - t, 3),
  "ease-in-out-cubic": (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

/**
 * Get easing function by name or return the function if already a function
 */
export function getEasing(easing: EasingFn | EasingName | undefined): EasingFn {
  if (typeof easing === "function") {return easing;}
  if (typeof easing === "string" && easing in easings) {return easings[easing];}
  return easings["ease-out"]; // Default
}

// =============================================================================
// Time Provider (for testability)
// =============================================================================

/**
 * Time provider interface for testable animations
 */
export type TimeProvider = {
  now(): number;
  raf(callback: FrameRequestCallback): number;
  cancelRaf(id: number): void;
}

/**
 * Default time provider using real browser APIs
 */
/**
 * Fallback RAF ID counter for non-browser environments.
 * setTimeout returns different types in Node.js vs browser,
 * so we use our own ID system for consistency.
 */
type FallbackRafHandle = ReturnType<typeof setTimeout> | number;

let fallbackRafId = 0;
const fallbackRafCallbacks = new Map<number, FallbackRafHandle>();

export const defaultTimeProvider: TimeProvider = {
  now: () =>
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  raf: (callback) => {
    if (typeof requestAnimationFrame !== "undefined") {
      return requestAnimationFrame(callback);
    }
    // Fallback for non-browser environments
    const id = ++fallbackRafId;
    const timeoutHandle = setTimeout(() => {
      callback(typeof performance !== "undefined" ? performance.now() : Date.now());
    }, 16);
    fallbackRafCallbacks.set(id, timeoutHandle);
    return id;
  },
  cancelRaf: (id) => {
    if (typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(id);
    } else {
      const timeout = fallbackRafCallbacks.get(id);
      if (timeout !== undefined) {
        clearTimeout(timeout);
        fallbackRafCallbacks.delete(id);
      }
    }
  },
};

/**
 * Create a mock time provider for testing
 */
export function createMockTimeProvider(): TimeProvider & {
  tick(ms: number): void;
  advance(ms: number): void;
} {
  let currentTime = 0;
  const callbacks: Map<number, FrameRequestCallback> = new Map();
  let nextId = 1;

  return {
    now: () => currentTime,
    raf: (callback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelRaf: (id) => {
      callbacks.delete(id);
    },
    /**
     * Advance time and execute all pending RAF callbacks
     */
    tick(ms: number): void {
      currentTime += ms;
      const toExecute = Array.from(callbacks.entries());
      callbacks.clear();
      for (const [, callback] of toExecute) {
        callback(currentTime);
      }
    },
    /**
     * Advance time without executing callbacks
     */
    advance(ms: number): void {
      currentTime += ms;
    },
  };
}

// =============================================================================
// Core Animation Engine
// =============================================================================

let globalTimeProvider: TimeProvider = defaultTimeProvider;

/**
 * Set the global time provider (useful for testing)
 */
export function setTimeProvider(provider: TimeProvider): void {
  globalTimeProvider = provider;
}

/**
 * Reset to default time provider
 */
export function resetTimeProvider(): void {
  globalTimeProvider = defaultTimeProvider;
}

/**
 * Run an animation with the given options
 *
 * @example
 * ```typescript
 * const anim = animate({
 *   duration: 500,
 *   easing: 'ease-out',
 *   onUpdate: (progress) => {
 *     el.style.opacity = String(progress);
 *   }
 * });
 *
 * await anim.finished;
 * ```
 */
export function animate(options: AnimationOptions): AnimationController {
  const { duration, easing, onUpdate, onComplete, onCancel } = options;
  const easingFn = getEasing(easing);

  let startTime: number | null = null;
  let rafId: number | null = null;
  let cancelled = false;
  let paused = false;
  let pausedProgress = 0;
  let currentProgress = 0;

  let resolveFinished: () => void;
  let rejectFinished: (reason?: unknown) => void;

  const finished = new Promise<void>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  function frame(time: number): void {
    if (cancelled || paused) {return;}

    if (startTime === null) {
      startTime = time;
    }

    const elapsed = time - startTime;
    const rawProgress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
    currentProgress = rawProgress;
    const easedProgress = easingFn(rawProgress);

    onUpdate?.(easedProgress);

    if (rawProgress < 1) {
      rafId = globalTimeProvider.raf(frame);
    } else {
      onComplete?.();
      resolveFinished();
    }
  }

  // Start animation on next frame
  rafId = globalTimeProvider.raf(frame);

  return {
    finished,

    cancel(): void {
      if (cancelled) {return;}
      cancelled = true;
      if (rafId !== null) {
        globalTimeProvider.cancelRaf(rafId);
      }
      onCancel?.();
      rejectFinished(new Error("Animation cancelled"));
    },

    pause(): void {
      if (paused || cancelled) {return;}
      paused = true;
      pausedProgress = currentProgress;
      if (rafId !== null) {
        globalTimeProvider.cancelRaf(rafId);
      }
    },

    resume(): void {
      if (!paused || cancelled) {return;}
      paused = false;
      // Adjust start time to account for paused duration
      startTime = null;
      const resumeProgress = pausedProgress;
      rafId = globalTimeProvider.raf((time) => {
        startTime = time - resumeProgress * duration;
        frame(time);
      });
    },

    getProgress(): number {
      return currentProgress;
    },
  };
}

// =============================================================================
// Style Animation Helpers
// =============================================================================

/**
 * Interpolate between two numeric values
 */
export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/**
 * CSS property names that can be animated with numeric values.
 */
export type AnimatableCSSProperty =
  | "opacity"
  | "width"
  | "height"
  | "top"
  | "left"
  | "right"
  | "bottom"
  | "fontSize"
  | "lineHeight"
  | "letterSpacing"
  | "margin"
  | "marginTop"
  | "marginRight"
  | "marginBottom"
  | "marginLeft"
  | "padding"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "borderWidth"
  | "borderRadius";

/**
 * Map camelCase property names to CSS kebab-case for setProperty.
 */
function toKebabCase(property: string): string {
  return property.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Animate a single CSS property
 */
export function animateStyle(
  el: HTMLElement | SVGElement,
  property: AnimatableCSSProperty,
  from: number,
  to: number,
  options: Omit<AnimationOptions, "onUpdate"> & { unit?: string }
): AnimationController {
  const unit = options.unit ?? "";
  const cssProperty = toKebabCase(property);

  return animate({
    ...options,
    onUpdate: (progress) => {
      const value = lerp(from, to, progress);
      el.style.setProperty(cssProperty, `${value}${unit}`);
    },
  });
}

/**
 * Animate opacity
 */
export function animateOpacity(
  el: HTMLElement | SVGElement,
  from: number,
  to: number,
  duration: number,
  easing?: EasingFn | EasingName
): AnimationController {
  // Set initial value immediately
  el.style.opacity = String(from);

  return animate({
    duration,
    easing,
    onUpdate: (progress) => {
      el.style.opacity = String(lerp(from, to, progress));
    },
  });
}

/**
 * Animate transform (translate)
 */
export function animateTranslate(
  el: HTMLElement | SVGElement,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  duration: number,
  easing?: EasingFn | EasingName,
  unit: string = "%"
): AnimationController {
  // Set initial value immediately
  el.style.transform = `translate(${fromX}${unit}, ${fromY}${unit})`;

  return animate({
    duration,
    easing,
    onUpdate: (progress) => {
      const x = lerp(fromX, toX, progress);
      const y = lerp(fromY, toY, progress);
      el.style.transform = `translate(${x}${unit}, ${y}${unit})`;
    },
  });
}

/**
 * Animate clip-path (inset)
 */
export function animateClipInset(
  el: HTMLElement | SVGElement,
  from: { top: number; right: number; bottom: number; left: number },
  to: { top: number; right: number; bottom: number; left: number },
  duration: number,
  easing?: EasingFn | EasingName
): AnimationController {
  // Set initial value immediately
  el.style.clipPath = `inset(${from.top}% ${from.right}% ${from.bottom}% ${from.left}%)`;

  return animate({
    duration,
    easing,
    onUpdate: (progress) => {
      const top = lerp(from.top, to.top, progress);
      const right = lerp(from.right, to.right, progress);
      const bottom = lerp(from.bottom, to.bottom, progress);
      const left = lerp(from.left, to.left, progress);
      el.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    },
  });
}

/**
 * Animate multiple properties in parallel
 */
export function animateParallel(
  animations: AnimationController[]
): AnimationController {
  const finished = Promise.all(animations.map((a) => a.finished)).then(
    () => {}
  );

  return {
    finished,
    cancel() {
      animations.forEach((a) => a.cancel());
    },
    pause() {
      animations.forEach((a) => a.pause());
    },
    resume() {
      animations.forEach((a) => a.resume());
    },
    getProgress() {
      if (animations.length === 0) {return 1;}
      return Math.min(...animations.map((a) => a.getProgress()));
    },
  };
}

/**
 * Run animations sequentially
 */
export async function animateSequence(
  animationFactories: (() => AnimationController)[]
): Promise<void> {
  for (const factory of animationFactories) {
    const anim = factory();
    await anim.finished;
  }
}

/**
 * Delay helper
 */
export function delay(ms: number): AnimationController {
  return animate({
    duration: ms,
    onUpdate: () => {},
  });
}
