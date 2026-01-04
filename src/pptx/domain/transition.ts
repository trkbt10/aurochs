/**
 * @file Slide transition types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.5 - Transitions
 */

// =============================================================================
// Transition Types
// =============================================================================

/**
 * Transition type
 * @see ECMA-376 Part 1, Section 19.7.27 (ST_TransitionType)
 */
export type TransitionType =
  | "blinds"
  | "checker"
  | "circle"
  | "comb"
  | "cover"
  | "cut"
  | "diamond"
  | "dissolve"
  | "fade"
  | "newsflash"
  | "plus"
  | "pull"
  | "push"
  | "random"
  | "randomBar"
  | "split"
  | "strips"
  | "wedge"
  | "wheel"
  | "wipe"
  | "zoom"
  | "none";

/**
 * Transition sound
 */
export type TransitionSound = {
  readonly resourceId: string;
  readonly name?: string;
  readonly loop?: boolean;
};

/**
 * Transition corner direction.
 * @see ECMA-376 Part 1, Section 19.7.50 (ST_TransitionCornerDirectionType)
 */
export type TransitionCornerDirectionType =
  | "ld"
  | "lu"
  | "rd"
  | "ru";

/**
 * Transition side direction.
 * @see ECMA-376 Part 1, Section 19.7.53 (ST_TransitionSideDirectionType)
 */
export type TransitionSideDirectionType =
  | "d"
  | "l"
  | "r"
  | "u";

/**
 * Transition eight direction.
 * @see ECMA-376 Part 1, Section 19.7.51 (ST_TransitionEightDirectionType)
 */
export type TransitionEightDirectionType =
  | TransitionCornerDirectionType
  | TransitionSideDirectionType;

/**
 * Transition in/out direction.
 * @see ECMA-376 Part 1, Section 19.7.52 (ST_TransitionInOutDirectionType)
 */
export type TransitionInOutDirectionType =
  | "in"
  | "out";

/**
 * Transition speed.
 * @see ECMA-376 Part 1, Section 19.7.54 (ST_TransitionSpeed)
 */
export type TransitionSpeed =
  | "fast"
  | "med"
  | "slow";

/**
 * Slide transition
 * @see ECMA-376 Part 1, Section 19.5 (transition)
 */
export type SlideTransition = {
  readonly type: TransitionType;
  readonly duration?: number; // milliseconds
  readonly advanceOnClick?: boolean;
  readonly advanceAfter?: number; // milliseconds
  readonly sound?: TransitionSound;
};
