/**
 * @file VBA Execution Panel
 *
 * Right-side panel for macro execution control and output.
 * - Top: Run/Stop control buttons
 * - Bottom: Console log output
 */

import { useState, useCallback, type CSSProperties, type ReactNode } from "react";
import {
  colorTokens,
  spacingTokens,
  fontTokens,
  ToolbarButton,
  PlayIcon,
  StopIcon,
  TrashIcon,
  ConsolePanel,
  type ConsoleMessage,
} from "@aurochs-ui/ui-components";
import { useVbaEditor, useCurrentProcedure } from "../../context/vba-editor";

// =============================================================================
// Types
// =============================================================================

export type ExecutionState = "idle" | "running" | "success" | "error";

export type VbaExecutionPanelProps = {
  readonly onRun?: (procedureName: string) => void;
  readonly onStop?: () => void;
  readonly executionState?: ExecutionState;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: colorTokens.background.primary,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacingTokens.sm,
  backgroundColor: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
};

const titleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const controlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
};

const targetStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  backgroundColor: colorTokens.background.tertiary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  fontSize: fontTokens.size.sm,
  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
  color: colorTokens.text.primary,
};

const targetLabelStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  marginRight: spacingTokens.xs,
};

const consoleContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const emptyTargetStyle: CSSProperties = {
  ...targetStyle,
  color: colorTokens.text.tertiary,
  fontStyle: "italic",
};

// =============================================================================
// Component
// =============================================================================

export function VbaExecutionPanel({
  onRun,
  onStop,
  executionState = "idle",
  style,
}: VbaExecutionPanelProps): ReactNode {
  const { activeModule } = useVbaEditor();
  const currentProcedure = useCurrentProcedure();
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);

  // Build target name
  const targetName =
    activeModule && currentProcedure
      ? `${activeModule.name}.${currentProcedure.name}`
      : null;

  const canRun =
    onRun &&
    targetName &&
    currentProcedure?.type === "sub" &&
    executionState !== "running";

  const canStop = onStop && executionState === "running";

  const handleRun = useCallback(() => {
    if (canRun && targetName) {
      // Add start message
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-start`,
          type: "info",
          text: `Running ${targetName}...`,
          timestamp: new Date(),
        },
      ]);
      onRun(targetName);
    }
  }, [canRun, targetName, onRun]);

  const handleStop = useCallback(() => {
    if (canStop) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-stop`,
          type: "warning",
          text: "Execution stopped by user",
          timestamp: new Date(),
        },
      ]);
      onStop();
    }
  }, [canStop, onStop]);

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  // Add message helper (can be exposed via ref or context if needed)
  const addMessage = useCallback(
    (type: ConsoleMessage["type"], text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          type,
          text,
          timestamp: new Date(),
        },
      ]);
    },
    []
  );

  return (
    <div style={{ ...containerStyle, ...style }}>
      {/* Header with controls */}
      <div style={headerStyle}>
        <span style={titleStyle}>Execution</span>
        <div style={controlsStyle}>
          <ToolbarButton
            icon={<PlayIcon size={14} />}
            label="Run"
            onClick={handleRun}
            disabled={!canRun}
            size="sm"
            style={canRun ? { color: colorTokens.accent.success } : undefined}
          />
          <ToolbarButton
            icon={<StopIcon size={14} />}
            label="Stop"
            onClick={handleStop}
            disabled={!canStop}
            size="sm"
            style={canStop ? { color: colorTokens.accent.danger } : undefined}
          />
        </div>
      </div>

      {/* Target procedure */}
      {targetName ? (
        <div style={targetStyle}>
          <span style={targetLabelStyle}>Target:</span>
          {targetName}
        </div>
      ) : (
        <div style={emptyTargetStyle}>
          Select a Sub procedure to run
        </div>
      )}

      {/* Console output */}
      <div style={consoleContainerStyle}>
        <ConsolePanel
          messages={messages}
          title="Output"
          showTimestamp
          onClear={handleClear}
          style={{ flex: 1 }}
        />
      </div>
    </div>
  );
}
