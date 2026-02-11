/**
 * @file SheetTabViewer
 *
 * Read-only sheet tab bar for workbook viewer.
 */

import type { CSSProperties } from "react";
import { spacingTokens, fontTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

const sheetTabBarStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  width: "100%",
  borderTop: `1px solid ${colorTokens.border.primary}`,
  backgroundColor: colorTokens.background.secondary,
  flexShrink: 0,
};

const sheetTabScrollAreaStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  scrollbarWidth: "thin",
};

const sheetTabListStyle: CSSProperties = {
  display: "inline-flex",
  minWidth: "100%",
  verticalAlign: "top",
};

const sheetTabStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: `${spacingTokens.sm} ${spacingTokens.lg}`,
  border: `1px solid ${colorTokens.border.primary}`,
  borderTop: "none",
  borderLeft: "none",
  backgroundColor: colorTokens.background.secondary,
  cursor: "pointer",
  fontSize: fontTokens.size.lg,
  color: colorTokens.text.secondary,
  transition: "background-color 0.15s ease, color 0.15s ease",
  whiteSpace: "nowrap",
};

const sheetTabActiveStyle: CSSProperties = {
  ...sheetTabStyle,
  backgroundColor: colorTokens.background.primary,
  color: colorTokens.text.primary,
  fontWeight: fontTokens.weight.medium,
  borderBottom: `2px solid ${colorTokens.accent.primary}`,
};

export type SheetTabViewerProps = {
  /** Sheet names */
  readonly sheetNames: readonly string[];
  /** Currently active sheet index (0-based) */
  readonly activeSheetIndex: number;
  /** Callback when a sheet tab is clicked */
  readonly onSheetSelect: (index: number) => void;
  /** Additional styles */
  readonly style?: CSSProperties;
  /** Additional CSS class */
  readonly className?: string;
};

/**
 * Read-only sheet tab bar for viewing workbooks.
 *
 * @example
 * ```tsx
 * <SheetTabViewer
 *   sheetNames={["Sheet1", "Sheet2", "Sheet3"]}
 *   activeSheetIndex={0}
 *   onSheetSelect={(index) => setActiveSheet(index)}
 * />
 * ```
 */
export function SheetTabViewer({
  sheetNames,
  activeSheetIndex,
  onSheetSelect,
  style,
  className,
}: SheetTabViewerProps) {
  return (
    <div style={{ ...sheetTabBarStyle, ...style }} className={className}>
      <div style={sheetTabScrollAreaStyle}>
        <div role="tablist" style={sheetTabListStyle}>
          {sheetNames.map((name, index) => {
            const isActive = activeSheetIndex === index;
            return (
              <button
                key={index}
                role="tab"
                aria-selected={isActive}
                style={isActive ? sheetTabActiveStyle : sheetTabStyle}
                onClick={() => onSheetSelect(index)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = colorTokens.background.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = colorTokens.background.secondary;
                  }
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
