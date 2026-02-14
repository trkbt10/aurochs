/**
 * @file PlayerControls
 *
 * Control buttons for the Player component.
 * Fully controlled - reflects external state, no internal state.
 *
 * Button behavior based on state:
 * - idle: Play button (start)
 * - playing + onPause: Pause button
 * - playing + no onPause: Running indicator (disabled)
 * - paused: Play button (resume)
 * - completed: Play button (replay)
 * - error: Play button (retry)
 */

import { type CSSProperties, type ReactNode } from "react";
import { PlayIcon, PauseIcon, StopIcon, RotateCcwIcon, LoaderIcon } from "../icons";
import type { PlayerState, PlayerAction, PlayerVariant, MainButtonMode } from "./types";
import {
  getPlayButtonStyle,
  getActionButtonStyle,
  disabledButtonStyle,
  controlsContainerStyle,
  PLAY_ICON_SIZE,
  ACTION_ICON_SIZE,
  getMainButtonColorStyle,
} from "./player-styles";

// =============================================================================
// Types
// =============================================================================

export type PlayerControlsProps = {
  /** Current playback state (controlled externally) */
  readonly state: PlayerState;
  /** Display variant */
  readonly variant: PlayerVariant;

  // Callbacks - presence determines available actions
  /** Called when play/resume/replay/retry is requested */
  readonly onPlay?: () => void;
  /** Called when pause is requested. If undefined, pause is not supported. */
  readonly onPause?: () => void;
  /** Called when stop is requested */
  readonly onStop?: () => void;

  /** Actions to display on the left of main button */
  readonly leftActions?: readonly PlayerAction[];
  /** Actions to display on the right of main button */
  readonly rightActions?: readonly PlayerAction[];
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine main button mode from state and available callbacks.
 */
function getMainButtonMode(state: PlayerState, hasPause: boolean): MainButtonMode {
  switch (state) {
    case "idle":
      return "play";
    case "playing":
      return hasPause ? "pause" : "running";
    case "paused":
      return "resume";
    case "completed":
      return "replay";
    case "error":
      return "retry";
  }
}

/**
 * Get icon component for main button mode.
 */
function getMainButtonIcon(mode: MainButtonMode): typeof PlayIcon {
  switch (mode) {
    case "play":
    case "resume":
      return PlayIcon;
    case "pause":
      return PauseIcon;
    case "replay":
    case "retry":
      return RotateCcwIcon;
    case "running":
      return LoaderIcon;
  }
}

/**
 * Get accessible label for main button mode.
 */
function getMainButtonLabel(mode: MainButtonMode): string {
  switch (mode) {
    case "play":
      return "Play";
    case "pause":
      return "Pause";
    case "resume":
      return "Resume";
    case "replay":
      return "Replay";
    case "retry":
      return "Retry";
    case "running":
      return "Running...";
  }
}

// =============================================================================
// Action Button Component
// =============================================================================

type ActionButtonProps = {
  readonly action: PlayerAction;
  readonly variant: PlayerVariant;
};

function ActionButton({ action, variant }: ActionButtonProps): ReactNode {
  const style: CSSProperties = {
    ...getActionButtonStyle(variant),
    ...(action.disabled ? disabledButtonStyle : {}),
  };

  return (
    <button
      type="button"
      style={style}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.label}
      title={action.label}
    >
      {action.icon}
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Player control buttons.
 *
 * Fully controlled component that reflects external state.
 * The main button appearance changes based on state:
 * - Idle: Green play button
 * - Playing (pausable): Pause button
 * - Playing (not pausable): Spinning loader
 * - Paused: Play button (resume)
 * - Completed: Replay button
 * - Error: Retry button (red tint)
 */
export function PlayerControls({
  state,
  variant,
  onPlay,
  onPause,
  onStop,
  leftActions,
  rightActions,
}: PlayerControlsProps): ReactNode {
  const hasPause = onPause !== undefined;
  const mode = getMainButtonMode(state, hasPause);
  const MainIcon = getMainButtonIcon(mode);
  const mainLabel = getMainButtonLabel(mode);

  // Main button is enabled when:
  // - mode is play/resume/replay/retry and onPlay exists
  // - mode is pause and onPause exists
  const mainButtonEnabled =
    (mode === "pause" && hasPause) ||
    (mode !== "pause" && mode !== "running" && onPlay !== undefined);

  // Stop is enabled when playing or paused
  const stopEnabled = (state === "playing" || state === "paused") && onStop !== undefined;

  // Handle main button click
  const handleMainClick = () => {
    if (mode === "pause") {
      onPause?.();
    } else if (mode !== "running") {
      onPlay?.();
    }
  };

  // Main button style with state-based color
  const mainButtonStyle: CSSProperties = {
    ...getPlayButtonStyle(variant),
    ...getMainButtonColorStyle(mode, state),
    ...(mode === "running" ? { animation: "spin 1s linear infinite" } : {}),
    ...(!mainButtonEnabled ? disabledButtonStyle : {}),
  };

  // Stop button style
  const stopButtonStyle: CSSProperties = {
    ...getActionButtonStyle(variant),
    ...(!stopEnabled ? disabledButtonStyle : {}),
  };

  return (
    <div style={controlsContainerStyle}>
      {/* Left actions */}
      {leftActions?.map((action) => (
        <ActionButton key={action.id} action={action} variant={variant} />
      ))}

      {/* Stop button */}
      <button
        type="button"
        style={stopButtonStyle}
        onClick={onStop}
        disabled={!stopEnabled}
        aria-label="Stop"
        title="Stop"
      >
        <StopIcon size={ACTION_ICON_SIZE} />
      </button>

      {/* Main button (Play/Pause/Resume/Replay/Retry) */}
      <button
        type="button"
        style={mainButtonStyle}
        onClick={handleMainClick}
        disabled={!mainButtonEnabled}
        aria-label={mainLabel}
        title={mainLabel}
      >
        <MainIcon size={PLAY_ICON_SIZE} />
      </button>

      {/* Right actions */}
      {rightActions?.map((action) => (
        <ActionButton key={action.id} action={action} variant={variant} />
      ))}

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
