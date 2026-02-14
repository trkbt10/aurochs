/**
 * @file PlayerDisplay
 *
 * Media information display for the Player component.
 * Shows thumbnail, title, subtitle, and status.
 */

import type { CSSProperties, ReactNode } from "react";
import type { PlayerMedia, PlayerVariant } from "./types";
import {
  getDisplayStyle,
  getTextContainerStyle,
  getTitleStyle,
  getSubtitleStyle,
  getStatusStyle,
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
// Styles
// =============================================================================

const titleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
};

const titleWrapperStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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
  const statusStyle = getStatusStyle(variant);

  // Check if title is a string or ReactNode
  const isStringTitle = typeof media.title === "string";

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
        {/* Title row with optional status */}
        <div style={titleRowStyle}>
          {isStringTitle ? (
            <p style={{ ...titleStyle, ...titleWrapperStyle }}>{media.title}</p>
          ) : (
            <div style={titleWrapperStyle}>{media.title}</div>
          )}
          {media.status && <span style={statusStyle}>{media.status}</span>}
        </div>
        {media.subtitle && <p style={subtitleStyle}>{media.subtitle}</p>}
      </div>
    </div>
  );
}
