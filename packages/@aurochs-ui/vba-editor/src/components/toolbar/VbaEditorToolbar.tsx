/**
 * @file VBA Editor Toolbar
 *
 * Layout: [Location] ----spacer---- [Actions]
 */

import type { CSSProperties, ReactNode } from "react";
import {
  colorTokens,
  spacingTokens,
  fontTokens,
  iconTokens,
} from "@aurochs-ui/ui-components/design-tokens";
import { IconButton } from "@aurochs-ui/ui-components/primitives";
import { useVbaEditor, useCurrentProcedure } from "../../context/vba-editor";

export type RunStatus = {
  readonly state: "idle" | "running" | "success" | "error";
  readonly message?: string;
};

export type VbaEditorToolbarProps = {
  readonly style?: CSSProperties;
  readonly onRun?: (procedureName: string) => void;
  readonly runDisabled?: boolean;
  readonly runStatus?: RunStatus;
};

// =============================================================================
// Styles (using design tokens only)
// =============================================================================

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  backgroundColor: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
};

/** Monospace font stack matching VbaCodeEditor */
const CODE_FONT_FAMILY = '"Consolas", "Monaco", "Courier New", monospace';

const locationStyle: CSSProperties = {
  fontSize: fontTokens.size.lg,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.primary,
  fontFamily: CODE_FONT_FAMILY,
};

const spacerStyle: CSSProperties = {
  flex: 1,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
};

const runButtonStyle: CSSProperties = {
  marginLeft: spacingTokens.sm,
  backgroundColor: colorTokens.accent.success,
};

const statusBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.md}`,
  backgroundColor: colorTokens.background.tertiary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  fontSize: fontTokens.size.sm,
  fontFamily: CODE_FONT_FAMILY,
  minHeight: spacingTokens.xl,
};

const statusSuccessStyle: CSSProperties = {
  color: colorTokens.accent.success,
};

const statusErrorStyle: CSSProperties = {
  color: colorTokens.accent.danger,
};

// =============================================================================
// Icons
// =============================================================================

function UndoIcon(): ReactNode {
  const size = iconTokens.size.sm;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8h8a3 3 0 1 1 0 6H8"
        stroke="currentColor"
        strokeWidth={iconTokens.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 5L3 8l2 3"
        stroke="currentColor"
        strokeWidth={iconTokens.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon(): ReactNode {
  const size = iconTokens.size.sm;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M13 8H5a3 3 0 1 0 0 6h3"
        stroke="currentColor"
        strokeWidth={iconTokens.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 5l2 3-2 3"
        stroke="currentColor"
        strokeWidth={iconTokens.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon(): ReactNode {
  const size = iconTokens.size.sm;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 2l10 6-10 6V2z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  const size = iconTokens.size.sm;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8l4 4 6-8"
        stroke="currentColor"
        strokeWidth={iconTokens.strokeWidth + 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon(): ReactNode {
  const size = iconTokens.size.sm;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth={iconTokens.strokeWidth + 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function VbaEditorToolbar({
  style,
  onRun,
  runDisabled,
  runStatus,
}: VbaEditorToolbarProps): ReactNode {
  const { dispatch, canUndo, canRedo, activeModule } = useVbaEditor();
  const currentProcedure = useCurrentProcedure();

  const statusState = runStatus?.state ?? "idle";

  const location = activeModule
    ? currentProcedure
      ? `${activeModule.name}.${currentProcedure.name}`
      : activeModule.name
    : "";

  const canRunNow =
    onRun &&
    !runDisabled &&
    currentProcedure?.type === "sub" &&
    statusState !== "running";

  const handleRun = () => {
    if (canRunNow && activeModule && currentProcedure) {
      onRun(`${activeModule.name}.${currentProcedure.name}`);
    }
  };

  const getStatusContent = (): { icon: ReactNode; text: string; style: CSSProperties } | null => {
    switch (statusState) {
      case "success":
        return {
          icon: <CheckIcon />,
          text: runStatus?.message ?? "Done",
          style: statusSuccessStyle,
        };
      case "error":
        return {
          icon: <XIcon />,
          text: runStatus?.message ?? "Error",
          style: statusErrorStyle,
        };
      default:
        return null;
    }
  };

  const statusContent = getStatusContent();

  return (
    <div style={style}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <span style={locationStyle}>{location}</span>

        <div style={spacerStyle} />

        <div style={actionsStyle}>
          <IconButton
            icon={<UndoIcon />}
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={!canUndo}
            size="sm"
          />
          <IconButton
            icon={<RedoIcon />}
            onClick={() => dispatch({ type: "REDO" })}
            disabled={!canRedo}
            size="sm"
          />

          {onRun && (
            <IconButton
              icon={<PlayIcon />}
              label="Run"
              onClick={handleRun}
              disabled={!canRunNow}
              variant="primary"
              size="sm"
              style={runButtonStyle}
            />
          )}
        </div>
      </div>

      {/* Status bar - always rendered to prevent layout shift */}
      <div style={statusBarStyle}>
        {statusContent ? (
          <>
            <span style={statusContent.style}>{statusContent.icon}</span>
            <span style={statusContent.style}>{statusContent.text}</span>
          </>
        ) : (
          <span style={{ color: colorTokens.text.tertiary }}>Ready</span>
        )}
      </div>
    </div>
  );
}
