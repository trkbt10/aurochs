/**
 * @file Player
 *
 * Music-player style UI component for execution control.
 * Fully controlled - reflects external state, delegates all actions.
 *
 * @example
 * ```tsx
 * // Basic usage - not pausable (VBA execution)
 * <Player
 *   state={executionState}
 *   media={{ title: "MyMacro", subtitle: "Module1" }}
 *   onPlay={handleRun}
 *   onStop={handleStop}
 * />
 *
 * // Pausable (music/animation)
 * <Player
 *   state={playbackState}
 *   media={{ title: "Track Name", subtitle: "Artist" }}
 *   onPlay={handlePlay}
 *   onPause={handlePause}  // Presence enables pause
 *   onStop={handleStop}
 * />
 * ```
 */

import type { CSSProperties, ReactNode } from "react";
import type {
  PlayerState,
  PlayerMedia,
  PlayerError,
  PlayerVariant,
  PlayerAction,
} from "./types";
import { PlayerControls } from "./PlayerControls";
import { PlayerDisplay } from "./PlayerDisplay";
import { getContainerStyle } from "./player-styles";
import { colorTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type PlayerProps = {
  /** Current playback state (controlled externally) */
  readonly state: PlayerState;
  /** Media information to display */
  readonly media: PlayerMedia;
  /** Error information (when state="error") */
  readonly error?: PlayerError;
  /** Display variant */
  readonly variant?: PlayerVariant;
  /** Progress percentage (0-100) */
  readonly progress?: number;

  // Callbacks - presence determines available actions
  /** Called when play/resume/replay/retry is requested */
  readonly onPlay?: () => void;
  /** Called when pause is requested. If provided, pause is supported. */
  readonly onPause?: () => void;
  /** Called when stop is requested */
  readonly onStop?: () => void;

  // Custom actions
  /** Actions on the left of main button */
  readonly leftActions?: readonly PlayerAction[];
  /** Actions on the right of main button */
  readonly rightActions?: readonly PlayerAction[];

  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const progressBarContainerStyle: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 3,
  background: colorTokens.overlay.lightBgSubtle,
  borderRadius: "0 0 8px 8px",
  overflow: "hidden",
};

const progressBarStyle: CSSProperties = {
  height: "100%",
  background: colorTokens.accent.success,
  transition: "width 0.2s ease",
};

const errorContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens["2xs"],
  flex: 1,
  minWidth: 0,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Music-player style UI for execution control.
 *
 * This is a fully controlled component:
 * - `state` determines what's displayed
 * - Callbacks determine available actions
 * - No internal state management
 *
 * Button behavior:
 * - `onPause` provided → playing state shows pause button
 * - `onPause` not provided → playing state shows running indicator
 */
export function Player({
  state,
  media,
  error,
  variant = "panel",
  progress,
  onPlay,
  onPause,
  onStop,
  leftActions,
  rightActions,
  className,
  style,
}: PlayerProps): ReactNode {
  const containerStyle: CSSProperties = {
    ...getContainerStyle(variant),
    position: "relative",
    ...style,
  };

  const showProgress = progress !== undefined && progress > 0 && progress < 100;

  // Error display
  if (state === "error" && error) {
    const errorTextStyle: CSSProperties = {
      fontSize: "12px",
      fontWeight: 500,
      color: colorTokens.accent.danger,
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    };

    const errorDetailStyle: CSSProperties = {
      fontSize: "11px",
      color:
        variant === "floating"
          ? colorTokens.overlay.lightTextSecondary
          : colorTokens.text.secondary,
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    };

    return (
      <div style={containerStyle} className={className}>
        <PlayerControls
          state={state}
          variant={variant}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          leftActions={leftActions}
          rightActions={rightActions}
        />

        <div style={errorContainerStyle}>
          <p style={errorTextStyle}>{error.message}</p>
          {error.detail && <p style={errorDetailStyle}>{error.detail}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      <PlayerControls
        state={state}
        variant={variant}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
        leftActions={leftActions}
        rightActions={rightActions}
      />

      <PlayerDisplay media={media} variant={variant} />

      {/* Progress bar */}
      {showProgress && (
        <div style={progressBarContainerStyle}>
          <div style={{ ...progressBarStyle, width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
