/**
 * @file ProgressBar
 *
 * Shared progress bar component for slide navigation.
 */

import type { CSSProperties, MouseEvent } from "react";
import { useCallback } from "react";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

export type ProgressBarVariant = "dark" | "light";

export type ProgressBarProps = {
  /** Progress value (0-100) */
  readonly progress: number;
  /** Visual variant */
  readonly variant?: ProgressBarVariant;
  /** Enable click-to-seek interaction */
  readonly interactive?: boolean;
  /** Callback when user seeks to a position (progress 0-100) */
  readonly onSeek?: (progress: number) => void;
  /** Additional CSS class */
  readonly className?: string;
};

/** Track height for dark variant (4px) */
const TRACK_HEIGHT_DARK = 4;
/** Track height for light variant (2px) */
const TRACK_HEIGHT_LIGHT = 2;
/** Interactive track height for light variant (4px) */
const TRACK_HEIGHT_LIGHT_INTERACTIVE = 4;
/** Border radius for dark variant (2px) */
const TRACK_RADIUS_DARK = 2;
/** Border radius for light variant (1px) */
const TRACK_RADIUS_LIGHT = 1;

const trackStyles: Record<ProgressBarVariant, CSSProperties> = {
  dark: {
    height: TRACK_HEIGHT_DARK,
    backgroundColor: colorTokens.border.strong,
    borderRadius: TRACK_RADIUS_DARK,
    overflow: "hidden",
  },
  light: {
    height: TRACK_HEIGHT_LIGHT,
    backgroundColor: colorTokens.overlay.lightBgActive,
    borderRadius: TRACK_RADIUS_LIGHT,
    overflow: "hidden",
  },
};

const interactiveTrackStyles: Record<ProgressBarVariant, CSSProperties> = {
  dark: {
    ...trackStyles.dark,
    cursor: "pointer",
    transition: "height 0.15s ease",
  },
  light: {
    ...trackStyles.light,
    cursor: "pointer",
    height: TRACK_HEIGHT_LIGHT_INTERACTIVE,
    transition: "height 0.15s ease",
  },
};

const fillStyle: CSSProperties = {
  height: "100%",
  backgroundColor: colorTokens.accent.secondary,
  transition: "width 0.2s ease",
};

const fillGradientStyle: CSSProperties = {
  ...fillStyle,
  background: `linear-gradient(90deg, ${colorTokens.accent.secondary}, ${colorTokens.accent.cyan})`,
};

/**
 * Progress bar showing slide navigation progress.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ProgressBar progress={50} />
 *
 * // Interactive with seek
 * <ProgressBar
 *   progress={nav.progress}
 *   interactive
 *   onSeek={(p) => nav.goToSlide(Math.ceil(p / 100 * totalSlides))}
 * />
 * ```
 */
export function ProgressBar({
  progress,
  variant = "dark",
  interactive = false,
  onSeek,
  className,
}: ProgressBarProps) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!interactive || !onSeek) {
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const clickProgress = ((e.clientX - rect.left) / rect.width) * 100;
      onSeek(Math.max(0, Math.min(100, clickProgress)));
    },
    [interactive, onSeek],
  );

  const trackStyle = interactive ? interactiveTrackStyles[variant] : trackStyles[variant];
  const barStyle = variant === "light" ? fillGradientStyle : fillStyle;

  return (
    <div
      style={trackStyle}
      className={className}
      onClick={handleClick}
      role={interactive ? "slider" : undefined}
      aria-valuenow={interactive ? Math.round(progress) : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
    >
      <div style={{ ...barStyle, width: `${Math.min(100, Math.max(0, progress))}%` }} />
    </div>
  );
}
