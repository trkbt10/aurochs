/**
 * @file Editor Status Bar
 *
 * Xcode-style status bar showing cursor position (Line:Col) and other info.
 */

import type { CSSProperties, ReactNode } from "react";
import { colorTokens, fontTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type CursorPosition = {
  readonly line: number;
  readonly column: number;
};

export type EditorStatusBarProps = {
  readonly cursor?: CursorPosition;
  readonly selection?: {
    readonly lines: number;
    readonly characters: number;
  };
  readonly encoding?: string;
  readonly lineEnding?: "LF" | "CRLF";
  readonly language?: string;
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: spacingTokens.md,
  padding: `${spacingTokens.xs} ${spacingTokens.md}`,
  backgroundColor: colorTokens.background.secondary,
  borderTop: `1px solid ${colorTokens.border.subtle}`,
  fontSize: fontTokens.size.xs,
  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
  color: colorTokens.text.secondary,
  minHeight: "22px",
};

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  whiteSpace: "nowrap",
};

const labelStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
};

const valueStyle: CSSProperties = {
  color: colorTokens.text.primary,
  fontWeight: fontTokens.weight.medium,
};

const separatorStyle: CSSProperties = {
  width: "1px",
  height: "12px",
  backgroundColor: colorTokens.border.subtle,
};

const leftSectionStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

// =============================================================================
// Component
// =============================================================================

export function EditorStatusBar({
  cursor,
  selection,
  encoding = "UTF-8",
  lineEnding = "LF",
  language,
  children,
  style,
}: EditorStatusBarProps): ReactNode {
  const hasSelection = selection && (selection.lines > 0 || selection.characters > 0);

  return (
    <div style={{ ...containerStyle, ...style }}>
      {/* Left section for custom content */}
      <div style={leftSectionStyle}>{children}</div>

      {/* Language */}
      {language && (
        <>
          <span style={itemStyle}>
            <span style={valueStyle}>{language}</span>
          </span>
          <span style={separatorStyle} />
        </>
      )}

      {/* Line ending */}
      <span style={itemStyle}>
        <span style={valueStyle}>{lineEnding}</span>
      </span>

      <span style={separatorStyle} />

      {/* Encoding */}
      <span style={itemStyle}>
        <span style={valueStyle}>{encoding}</span>
      </span>

      <span style={separatorStyle} />

      {/* Cursor position / Selection */}
      {cursor && (
        <span style={itemStyle}>
          <span style={labelStyle}>Ln</span>
          <span style={valueStyle}>{cursor.line}</span>
          <span style={labelStyle}>Col</span>
          <span style={valueStyle}>{cursor.column}</span>
          {hasSelection && (
            <>
              <span style={labelStyle}>(</span>
              <span style={valueStyle}>
                {selection.lines > 0 && `${selection.lines} lines, `}
                {selection.characters} selected
              </span>
              <span style={labelStyle}>)</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
