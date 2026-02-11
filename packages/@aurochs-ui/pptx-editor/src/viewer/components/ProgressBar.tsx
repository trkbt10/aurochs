/**
 * @file ProgressBar
 *
 * Shared progress bar component for slide navigation.
 */

import type { CSSProperties, MouseEvent } from "react";
import { useCallback } from "react";

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

const trackStyles: Record<ProgressBarVariant, CSSProperties> = {
  dark: {
    height: "4px",
    backgroundColor: "var(--border-strong)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  light: {
    height: "2px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: "1px",
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
    height: "4px",
    transition: "height 0.15s ease",
  },
};

const fillStyle: CSSProperties = {
  height: "100%",
  backgroundColor: "var(--accent-blue)",
  transition: "width 0.2s ease",
};

const fillGradientStyle: CSSProperties = {
  ...fillStyle,
  background: "linear-gradient(90deg, var(--accent-blue), #22d3ee)",
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
