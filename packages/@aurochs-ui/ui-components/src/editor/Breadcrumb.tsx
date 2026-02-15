/**
 * @file Breadcrumb Component
 *
 * Xcode-style breadcrumb navigation for hierarchical path display.
 * Example: Module > Procedure
 */

import type { CSSProperties, ReactNode } from "react";
import { colorTokens, fontTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type BreadcrumbItem = {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
};

export type BreadcrumbProps = {
  readonly items: readonly BreadcrumbItem[];
  readonly onItemClick?: (id: string, index: number) => void;
  readonly separator?: ReactNode;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.sm,
  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
  overflow: "hidden",
};

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
  color: colorTokens.text.secondary,
  cursor: "pointer",
  whiteSpace: "nowrap",
  padding: `${spacingTokens.xs} ${spacingTokens.xs}`,
  borderRadius: "4px",
  transition: "background-color 0.15s, color 0.15s",
};

const itemHoverStyle: CSSProperties = {
  backgroundColor: colorTokens.background.tertiary,
  color: colorTokens.text.primary,
};

const activeItemStyle: CSSProperties = {
  ...itemStyle,
  color: colorTokens.text.primary,
  fontWeight: fontTokens.weight.medium,
};

const separatorStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.xs,
  userSelect: "none",
};

const iconStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "14px",
  height: "14px",
};

// =============================================================================
// Default Separator
// =============================================================================

function DefaultSeparator(): ReactNode {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
      <path
        d="M2 1l4 5-4 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function Breadcrumb({
  items,
  onItemClick,
  separator = <DefaultSeparator />,
  style,
}: BreadcrumbProps): ReactNode {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav style={{ ...containerStyle, ...style }} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const currentStyle = isLast ? activeItemStyle : itemStyle;

        return (
          <span key={item.id} style={{ display: "flex", alignItems: "center" }}>
            <span
              style={currentStyle}
              onClick={() => onItemClick?.(item.id, index)}
              onMouseEnter={(e) => {
                if (!isLast) {
                  Object.assign(e.currentTarget.style, itemHoverStyle);
                }
              }}
              onMouseLeave={(e) => {
                if (!isLast) {
                  e.currentTarget.style.backgroundColor = "";
                  e.currentTarget.style.color = colorTokens.text.secondary;
                }
              }}
              role="button"
              tabIndex={0}
            >
              {item.icon && <span style={iconStyle}>{item.icon}</span>}
              <span>{item.label}</span>
            </span>
            {!isLast && <span style={separatorStyle}>{separator}</span>}
          </span>
        );
      })}
    </nav>
  );
}
