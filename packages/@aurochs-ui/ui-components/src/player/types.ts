/**
 * @file Player component types
 *
 * Type definitions for the music-player style UI component.
 * Player is a fully controlled component - it reflects external state
 * and delegates all actions to callbacks.
 */

import type { ReactNode } from "react";

/**
 * Player state machine states.
 *
 * The player renders different UI based on this state:
 * - idle: Ready to play. Shows play button.
 * - playing: Currently running. Shows pause (if pausable) or running indicator.
 * - paused: Execution paused. Shows play button to resume.
 * - completed: Finished successfully. Shows play button to replay.
 * - error: Execution failed. Shows play button to retry.
 */
export type PlayerState = "idle" | "playing" | "paused" | "completed" | "error";

/**
 * Media information to display in the player.
 */
export type PlayerMedia = {
  /** Primary title (e.g., procedure name, track name) */
  readonly title: string;
  /** Secondary text (e.g., module name, artist, status) */
  readonly subtitle?: string;
  /** Optional thumbnail or icon */
  readonly thumbnail?: ReactNode;
};

/**
 * Custom action button definition.
 *
 * Actions are rendered in the control bar alongside play/pause/stop.
 */
export type PlayerAction = {
  /** Unique action identifier */
  readonly id: string;
  /** Icon to display */
  readonly icon: ReactNode;
  /** Accessible label / tooltip text */
  readonly label: string;
  /** Click handler */
  readonly onClick: () => void;
  /** Whether the action is disabled */
  readonly disabled?: boolean;
};

/**
 * Error information for error state.
 */
export type PlayerError = {
  /** Short error message */
  readonly message: string;
  /** Optional detailed description */
  readonly detail?: string;
};

/**
 * Player display variants.
 * - floating: Dark overlay style (for slideshow, dialogs)
 * - toolbar: Light inline style (for toolbars)
 * - panel: Light panel style (for side panels)
 */
export type PlayerVariant = "floating" | "toolbar" | "panel";

/**
 * Main button appearance based on state.
 */
export type MainButtonMode = "play" | "pause" | "resume" | "replay" | "retry" | "running";
