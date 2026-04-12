/**
 * @file Sheet tab bar
 *
 * Read-only sheet tab bar for switching between worksheets.
 * Context-free: takes sheet names, active index, and callback via props.
 *
 * This is the single source of truth for tab bar styling.
 * The editor's interactive tab bar (XlsxSheetTabBar) uses its own
 * tab component (XlsxSheetTab) that follows the same style constants.
 */

import type { CSSProperties } from "react";
import { spacingTokens, fontTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

/**
 * Container style for the tab bar.
 *
 * Exported so the editor's tab bar container can use the same style.
 */
export const sheetTabBarContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  width: "100%",
  borderTop: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
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

/**
 * Base style for individual sheet tabs.
 *
 * Exported so the editor's XlsxSheetTab can use the same base style.
 */
export const sheetTabBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderTop: "none",
  borderLeft: "none",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  cursor: "pointer",
  fontSize: fontTokens.size.sm,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  transition: "background-color 0.15s ease, color 0.15s ease",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

/**
 * Style override for the active (selected) sheet tab.
 */
export const sheetTabActiveStyle: CSSProperties = {
  ...sheetTabBaseStyle,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  fontWeight: fontTokens.weight.medium,
};

export type SheetTabBarProps = {
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
 * Read-only sheet tab bar for switching between worksheets.
 */
export function SheetTabBar({
  sheetNames,
  activeSheetIndex,
  onSheetSelect,
  style,
  className,
}: SheetTabBarProps) {
  return (
    <div style={{ ...sheetTabBarContainerStyle, ...style }} className={className}>
      <div style={sheetTabScrollAreaStyle}>
        <div role="tablist" style={sheetTabListStyle}>
          {sheetNames.map((name, index) => {
            const isActive = activeSheetIndex === index;
            return (
              <button
                key={index}
                role="tab"
                aria-selected={isActive}
                style={isActive ? sheetTabActiveStyle : sheetTabBaseStyle}
                onClick={() => onSheetSelect(index)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = `var(--bg-tertiary, ${colorTokens.background.tertiary})`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = `var(--bg-secondary, ${colorTokens.background.secondary})`;
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
