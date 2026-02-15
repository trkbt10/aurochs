/**
 * @file Console Panel Component
 *
 * Xcode-style console/debug output panel.
 * Shows execution results, logs, and debug messages.
 */

import { useRef, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { colorTokens, fontTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ConsoleMessageType = "info" | "warning" | "error" | "success" | "debug";

export type ConsoleMessage = {
  readonly id: string;
  readonly type: ConsoleMessageType;
  readonly text: string;
  readonly timestamp?: Date;
  readonly source?: string;
};

export type ConsolePanelProps = {
  readonly messages: readonly ConsoleMessage[];
  readonly title?: string;
  readonly showTimestamp?: boolean;
  readonly showSource?: boolean;
  readonly onClear?: () => void;
  readonly autoScroll?: boolean;
  readonly maxHeight?: string | number;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  backgroundColor: colorTokens.background.primary,
  borderTop: `1px solid ${colorTokens.border.primary}`,
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  backgroundColor: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const clearButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `2px ${spacingTokens.xs}`,
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  borderRadius: "4px",
  transition: "background-color 0.15s, color 0.15s",
};

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: spacingTokens.xs,
  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
  fontSize: fontTokens.size.sm,
  lineHeight: 1.5,
};

const messageStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: spacingTokens.sm,
  padding: `2px ${spacingTokens.xs}`,
  borderRadius: "2px",
};

const timestampStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.xs,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const sourceStyle: CSSProperties = {
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.xs,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const textStyle: CSSProperties = {
  flex: 1,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const emptyStyle: CSSProperties = {
  padding: spacingTokens.md,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontStyle: "italic",
};

// =============================================================================
// Type Colors
// =============================================================================

/** Warning color (amber) - not in design tokens */
const WARNING_COLOR = "#f59e0b";

const TYPE_COLORS: Record<ConsoleMessageType, string> = {
  info: colorTokens.text.primary,
  warning: WARNING_COLOR,
  error: colorTokens.accent.danger,
  success: colorTokens.accent.success,
  debug: colorTokens.text.tertiary,
};

const TYPE_ICONS: Record<ConsoleMessageType, string> = {
  info: "ℹ",
  warning: "⚠",
  error: "✕",
  success: "✓",
  debug: "•",
};

// =============================================================================
// Icons
// =============================================================================

function TrashIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// =============================================================================
// Component
// =============================================================================

export function ConsolePanel({
  messages,
  title = "Console",
  showTimestamp = true,
  showSource = false,
  onClear,
  autoScroll = true,
  maxHeight,
  style,
}: ConsolePanelProps): ReactNode {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  return (
    <div
      style={{
        ...containerStyle,
        ...(maxHeight ? { maxHeight } : {}),
        ...style,
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <span style={titleStyle}>{title}</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            style={clearButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colorTokens.background.tertiary;
              e.currentTarget.style.color = colorTokens.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.color = colorTokens.text.tertiary;
            }}
          >
            <TrashIcon />
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      <div ref={contentRef} style={contentStyle}>
        {messages.length === 0 ? (
          <div style={emptyStyle}>No output</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...messageStyle,
                backgroundColor:
                  msg.type === "error"
                    ? `${colorTokens.accent.danger}10`
                    : msg.type === "warning"
                      ? `${WARNING_COLOR}10`
                      : "transparent",
              }}
            >
              {/* Icon */}
              <span style={{ color: TYPE_COLORS[msg.type], flexShrink: 0 }}>
                {TYPE_ICONS[msg.type]}
              </span>

              {/* Timestamp */}
              {showTimestamp && msg.timestamp && (
                <span style={timestampStyle}>{formatTimestamp(msg.timestamp)}</span>
              )}

              {/* Source */}
              {showSource && msg.source && <span style={sourceStyle}>[{msg.source}]</span>}

              {/* Text */}
              <span style={{ ...textStyle, color: TYPE_COLORS[msg.type] }}>{msg.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
