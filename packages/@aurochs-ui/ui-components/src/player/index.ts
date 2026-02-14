/**
 * @file Player module exports
 *
 * Music-player style UI components for execution control.
 */

export { Player } from "./Player";
export type { PlayerProps } from "./Player";

export { PlayerControls } from "./PlayerControls";
export type { PlayerControlsProps } from "./PlayerControls";

export { PlayerDisplay } from "./PlayerDisplay";
export type { PlayerDisplayProps } from "./PlayerDisplay";

export type {
  PlayerState,
  PlayerMedia,
  PlayerAction,
  PlayerError,
  PlayerVariant,
  MainButtonMode,
} from "./types";

export {
  PLAY_BUTTON_SIZE,
  ACTION_BUTTON_SIZE,
  PLAY_ICON_SIZE,
  ACTION_ICON_SIZE,
} from "./player-styles";
