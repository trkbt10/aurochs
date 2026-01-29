/**
 * @file Animation runtime type definitions
 *
 * Types for runtime animation playback of PPTX timing data.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import type { EffectType, EffectDirection } from "@oxen-office/pptx/domain/animation";

/**
 * Runtime animation target - element reference for DOM operations.
 *
 * This is a simplified target for finding DOM elements during playback.
 * For full OOXML target types, see domain/animation.ts AnimationTarget.
 */
export type RuntimeAnimationTarget = {
  /** OOXML shape ID */
  readonly shapeId: string;
  /** Optional paragraph index for text animations */
  readonly paragraphIndex?: number;
  /** Optional text range */
  readonly textRange?: {
    readonly start: number;
    readonly end: number;
  };
};

/**
 * Animation effect configuration for runtime playback.
 */
export type EffectConfig = {
  /** Effect type (from domain) */
  readonly type: EffectType;
  /** Duration in milliseconds */
  readonly duration: number;
  /** Direction (from domain) */
  readonly direction?: EffectDirection;
  /** Whether this is an entrance (true) or exit (false) effect */
  readonly entrance?: boolean;
  /** CSS easing function */
  readonly easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  /** Delay before effect starts in milliseconds */
  readonly delay?: number;
};

/**
 * Property animation configuration for runtime playback.
 */
export type PropertyAnimation = {
  /** Property name (e.g., "style.opacity", "ppt_x") */
  readonly property: string;
  /** From value */
  readonly from?: string | number;
  /** To value */
  readonly to?: string | number;
  /** By value (relative) */
  readonly by?: string | number;
  /** Keyframe values */
  readonly keyframes?: readonly RuntimeKeyframe[];
  /** Duration in milliseconds */
  readonly duration: number;
  /** Calculation mode */
  readonly calcMode?: "discrete" | "linear" | "formula";
};

/**
 * Runtime keyframe value for property animation.
 *
 * Simplified version for runtime use. For full OOXML keyframe,
 * see domain/animation.ts Keyframe.
 */
export type RuntimeKeyframe = {
  /** Time percentage (0-100) */
  readonly time: number;
  /** Property value at this time */
  readonly value: string | number;
  /** Optional formula */
  readonly formula?: string;
};

/**
 * DOM element finder function type.
 */
export type ElementFinder = (shapeId: string) => HTMLElement | SVGElement | null;

/**
 * Animation player options.
 */
export type PlayerOptions = {
  /** Function to find DOM elements by shape ID */
  readonly findElement: ElementFinder;
  /** Callback when animation starts */
  readonly onStart?: () => void;
  /** Callback when animation completes */
  readonly onComplete?: () => void;
  /** Callback for logging/debugging */
  readonly onLog?: (message: string) => void;
  /** Speed multiplier (1.0 = normal) */
  readonly speed?: number;
};

/**
 * Animation player state.
 */
export type PlayerState = "idle" | "playing" | "paused" | "stopping" | "stopped";
