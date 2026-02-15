/**
 * @file Navigator Tabs Component
 *
 * Xcode-style icon-based tab switching for navigator sidebar.
 * Displays a row of icon buttons that switch between different views.
 */

import { useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";
import { colorTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type NavigatorTab = {
  readonly id: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly disabled?: boolean;
};

export type NavigatorTabsProps = {
  readonly tabs: readonly NavigatorTab[];
  readonly activeTabId: string;
  readonly onTabChange: (tabId: string) => void;
  readonly size?: "sm" | "md";
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1px",
  padding: spacingTokens.xs,
  backgroundColor: colorTokens.background.secondary,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
};

const getTabButtonStyle = (
  isActive: boolean,
  isDisabled: boolean,
  size: "sm" | "md"
): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: size === "sm" ? "28px" : "32px",
  height: size === "sm" ? "24px" : "28px",
  border: "none",
  borderRadius: "4px",
  background: isActive ? colorTokens.background.tertiary : "transparent",
  color: isActive
    ? colorTokens.text.primary
    : isDisabled
      ? colorTokens.text.tertiary
      : colorTokens.text.secondary,
  cursor: isDisabled ? "not-allowed" : "pointer",
  transition: "background-color 0.15s, color 0.15s",
  opacity: isDisabled ? 0.5 : 1,
});

const iconWrapperStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// =============================================================================
// Component
// =============================================================================

export function NavigatorTabs({
  tabs,
  activeTabId,
  onTabChange,
  size = "md",
  style,
}: NavigatorTabsProps): ReactNode {
  const handleTabClick = useCallback(
    (tabId: string, disabled?: boolean) => {
      if (!disabled) {
        onTabChange(tabId);
      }
    },
    [onTabChange]
  );

  return (
    <div style={{ ...containerStyle, ...style }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const buttonStyle = getTabButtonStyle(isActive, !!tab.disabled, size);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id, tab.disabled)}
            style={buttonStyle}
            disabled={tab.disabled}
            title={tab.label}
            aria-label={tab.label}
            aria-pressed={isActive}
            onMouseEnter={(e) => {
              if (!isActive && !tab.disabled) {
                e.currentTarget.style.backgroundColor = colorTokens.background.tertiary;
                e.currentTarget.style.color = colorTokens.text.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive && !tab.disabled) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = colorTokens.text.secondary;
              }
            }}
          >
            <span style={iconWrapperStyle}>{tab.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
