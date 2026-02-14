/**
 * @file PlayerDisplay
 *
 * Media information display for the Player component.
 * Shows thumbnail, title, and subtitle.
 */

import type { ReactNode } from "react";
import type { PlayerMedia, PlayerVariant } from "./types";
import {
  getDisplayStyle,
  getTextContainerStyle,
  getTitleStyle,
  getSubtitleStyle,
  thumbnailContainerStyle,
  getThumbnailBackgroundStyle,
} from "./player-styles";

// =============================================================================
// Types
// =============================================================================

export type PlayerDisplayProps = {
  /** Media information to display */
  readonly media: PlayerMedia;
  /** Display variant */
  readonly variant: PlayerVariant;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Player media information display.
 */
export function PlayerDisplay({ media, variant }: PlayerDisplayProps): ReactNode {
  const displayStyle = getDisplayStyle(variant);
  const textContainerStyle = getTextContainerStyle(variant);
  const titleStyle = getTitleStyle(variant);
  const subtitleStyle = getSubtitleStyle(variant);

  return (
    <div style={displayStyle}>
      {/* Thumbnail */}
      {media.thumbnail && (
        <div style={{ ...thumbnailContainerStyle, ...getThumbnailBackgroundStyle(variant) }}>
          {media.thumbnail}
        </div>
      )}

      {/* Text */}
      <div style={textContainerStyle}>
        <p style={titleStyle}>{media.title}</p>
        {media.subtitle && <p style={subtitleStyle}>{media.subtitle}</p>}
      </div>
    </div>
  );
}
