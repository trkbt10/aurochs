/**
 * @file ViewerControls
 *
 * Media player-style control bar for slide viewers.
 * Uses grouped props and action injection for clean API.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, fontTokens, radiusTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import { ChevronLeftIcon, ChevronRightIcon } from "@aurochs-ui/ui-components/icons";

// =============================================================================
// Types
// =============================================================================

/** Navigation state and callbacks */
export type NavigationState = {
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly canGoPrev: boolean;
  readonly canGoNext: boolean;
};

/** Slide position and progress */
export type PositionState = {
  readonly current: number;
  readonly total: number;
  readonly progress: number;
  readonly onSeek?: (targetSlide: number) => void;
};

/** Single control action */
export type ControlAction = {
  /** Unique key for React */
  readonly key: string;
  /** Icon element */
  readonly icon: ReactNode;
  /** Click handler */
  readonly onClick: () => void;
  /** Accessibility label */
  readonly label: string;
  /** Whether action is in active/toggled state */
  readonly active?: boolean;
  /** Whether to show as primary (accent) button */
  readonly primary?: boolean;
};

export type ViewerControlsProps = {
  /** Navigation controls */
  readonly navigation: NavigationState;
  /** Position/progress state */
  readonly position: PositionState;
  /** Actions for left side of controls */
  readonly leftActions?: readonly ControlAction[];
  /** Actions for right side of controls */
  readonly rightActions?: readonly ControlAction[];
  /** Additional CSS class */
  readonly className?: string;
};

// =============================================================================
// Styles
// =============================================================================

const controlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  backgroundColor: colorTokens.background.tertiary,
  borderTop: `1px solid ${colorTokens.border.subtle}`,
  flexShrink: 0,
};

const sectionStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
};

const centerSectionStyle: CSSProperties = {
  ...sectionStyle,
  flex: 1,
  justifyContent: "center",
  gap: spacingTokens.sm,
};

const controlButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  padding: 0,
  background: "transparent",
  border: "none",
  borderRadius: radiusTokens.md,
  color: colorTokens.text.secondary,
  cursor: "pointer",
  transition: "color 0.15s ease, background 0.15s ease",
};

const controlButtonDisabledStyle: CSSProperties = {
  ...controlButtonStyle,
  opacity: 0.3,
  cursor: "default",
  pointerEvents: "none",
};

const controlButtonActiveStyle: CSSProperties = {
  ...controlButtonStyle,
  color: colorTokens.accent.primary,
};

const primaryButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  padding: 0,
  background: colorTokens.accent.primary,
  border: "none",
  borderRadius: radiusTokens.full,
  color: colorTokens.text.inverse,
  cursor: "pointer",
  transition: "transform 0.15s ease, background 0.15s ease",
};

const progressWrapperStyle: CSSProperties = {
  flex: 1,
  maxWidth: 400,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const progressTrackStyle: CSSProperties = {
  flex: 1,
  height: 4,
  backgroundColor: colorTokens.border.subtle,
  borderRadius: radiusTokens.full,
  overflow: "hidden",
  cursor: "pointer",
  position: "relative",
};

const progressBarStyle: CSSProperties = {
  height: "100%",
  backgroundColor: colorTokens.accent.primary,
  borderRadius: radiusTokens.full,
  transition: "width 0.1s ease",
};

const indicatorStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.tertiary,
  fontFamily: "monospace",
  whiteSpace: "nowrap",
};

const separatorStyle: CSSProperties = {
  width: 1,
  height: 20,
  backgroundColor: colorTokens.border.subtle,
  margin: `0 ${spacingTokens.xs}`,
};

// =============================================================================
// Helper components
// =============================================================================

function ActionButton({ action }: { readonly action: ControlAction }) {
  if (action.primary) {
    return (
      <button type="button" style={primaryButtonStyle} onClick={action.onClick} aria-label={action.label}>
        {action.icon}
      </button>
    );
  }

  const buttonStyle = action.active ? controlButtonActiveStyle : controlButtonStyle;

  return (
    <button type="button" style={buttonStyle} onClick={action.onClick} aria-label={action.label}>
      {action.icon}
    </button>
  );
}

function ActionSection({ actions }: { readonly actions: readonly ControlAction[] }) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      {actions.map((action) => (
        <ActionButton key={action.key} action={action} />
      ))}
      <div style={separatorStyle} />
    </>
  );
}

// =============================================================================
// Main component
// =============================================================================

/**
 * Media player-style control bar for slide viewers.
 *
 * @example
 * ```tsx
 * <ViewerControls
 *   navigation={{
 *     onPrev: nav.goToPrev,
 *     onNext: nav.goToNext,
 *     canGoPrev: !nav.isFirst,
 *     canGoNext: !nav.isLast,
 *   }}
 *   position={{
 *     current: nav.currentSlide,
 *     total: slideCount,
 *     progress: nav.progress,
 *     onSeek: (slide) => nav.goToSlide(slide),
 *   }}
 *   leftActions={[
 *     { key: "present", icon: <PlayIcon size={16} />, onClick: onPresent, label: "Present", primary: true },
 *   ]}
 *   rightActions={[
 *     { key: "fullscreen", icon: <FullscreenIcon size={18} />, onClick: onFullscreen, label: "Fullscreen" },
 *   ]}
 * />
 * ```
 */
export function ViewerControls({
  navigation,
  position,
  leftActions = [],
  rightActions = [],
  className,
}: ViewerControlsProps) {
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!position.onSeek) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickProgress = (x / rect.width) * 100;
    const targetSlide = Math.max(1, Math.ceil((clickProgress / 100) * position.total));
    position.onSeek(targetSlide);
  };

  return (
    <div style={controlsStyle} className={className}>
      {/* Left actions */}
      {leftActions.length > 0 && (
        <div style={sectionStyle}>
          <ActionSection actions={leftActions} />
        </div>
      )}

      {/* Center: Navigation + Progress */}
      <div style={centerSectionStyle}>
        <button
          type="button"
          style={navigation.canGoPrev ? controlButtonStyle : controlButtonDisabledStyle}
          onClick={navigation.onPrev}
          disabled={!navigation.canGoPrev}
          aria-label="Previous slide"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div style={progressWrapperStyle}>
          <div style={progressTrackStyle} onClick={handleProgressClick}>
            <div style={{ ...progressBarStyle, width: `${position.progress}%` }} />
          </div>
        </div>

        <button
          type="button"
          style={navigation.canGoNext ? controlButtonStyle : controlButtonDisabledStyle}
          onClick={navigation.onNext}
          disabled={!navigation.canGoNext}
          aria-label="Next slide"
        >
          <ChevronRightIcon size={18} />
        </button>

        <div style={indicatorStyle}>
          <span>{position.current}</span>
          <span>/</span>
          <span>{position.total}</span>
        </div>
      </div>

      {/* Right actions */}
      {rightActions.length > 0 && (
        <div style={sectionStyle}>
          <div style={separatorStyle} />
          {rightActions.map((action) => (
            <ActionButton key={action.key} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
