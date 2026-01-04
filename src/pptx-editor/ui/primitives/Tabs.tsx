/**
 * @file Tabs primitive component
 *
 * A minimal tab component for switching between content panels.
 */

import { useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { colorTokens, radiusTokens, fontTokens, spacingTokens } from "../design-tokens";

export type TabItem<T extends string = string> = {
  readonly id: T;
  readonly label: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
};

export type TabsProps<T extends string = string> = {
  /** Tab items to display */
  readonly items: readonly TabItem<T>[];
  /** Currently active tab ID (controlled mode) */
  readonly value?: T;
  /** Callback when active tab changes */
  readonly onChange?: (value: T) => void;
  /** Default active tab ID for uncontrolled mode */
  readonly defaultValue?: T;
  /** Tab list size */
  readonly size?: "sm" | "md";
  /** Additional CSS class */
  readonly className?: string;
  /** Inline style overrides */
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.md,
};

const tabListStyle: CSSProperties = {
  display: "flex",
  gap: "2px",
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRadius: `var(--radius-sm, ${radiusTokens.sm})`,
  padding: "2px",
};

function getTabTextColor(isActive: boolean, disabled: boolean): string {
  if (isActive) {
    return `var(--text-primary, ${colorTokens.text.primary})`;
  }
  if (disabled) {
    return `var(--text-tertiary, ${colorTokens.text.tertiary})`;
  }
  return `var(--text-secondary, ${colorTokens.text.secondary})`;
}

function getTabBackgroundColor(isActive: boolean): string {
  if (isActive) {
    return `var(--bg-secondary, ${colorTokens.background.secondary})`;
  }
  return "transparent";
}

function getTabButtonStyle(isActive: boolean, disabled: boolean, size: "sm" | "md"): CSSProperties {
  const paddingMap = {
    sm: "4px 8px",
    md: "6px 12px",
  };
  const fontSizeMap = {
    sm: fontTokens.size.sm,
    md: fontTokens.size.md,
  };
  const backgroundColor = getTabBackgroundColor(isActive);

  return {
    flex: 1,
    padding: paddingMap[size],
    fontSize: fontSizeMap[size],
    fontWeight: fontTokens.weight.medium,
    border: "none",
    borderRadius: radiusTokens.sm,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 150ms ease",
    backgroundColor,
    color: getTabTextColor(isActive, disabled),
    opacity: disabled ? 0.5 : 1,
  };
}

const contentStyle: CSSProperties = {
  minHeight: 0,
};

/**
 * A tabs component for switching between content panels.
 */
export function Tabs<T extends string = string>({
  items,
  value: controlledValue,
  onChange,
  defaultValue,
  size = "md",
  className,
  style,
}: TabsProps<T>) {
  const [internalValue, setInternalValue] = useState<T>(() => {
    if (defaultValue) {
      return defaultValue;
    }
    const firstEnabled = items.find((item) => !item.disabled);
    return firstEnabled?.id ?? items[0]?.id ?? ("" as T);
  });

  const isControlled = controlledValue !== undefined;
  const activeId = isControlled ? controlledValue : internalValue;

  const handleTabClick = useCallback(
    (id: T, disabled?: boolean) => {
      if (disabled) {
        return;
      }
      if (isControlled) {
        onChange?.(id);
      } else {
        setInternalValue(id);
        onChange?.(id);
      }
    },
    [isControlled, onChange]
  );

  const activeItem = items.find((item) => item.id === activeId);

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <div style={tabListStyle} role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeId}
            style={getTabButtonStyle(item.id === activeId, item.disabled ?? false, size)}
            onClick={() => handleTabClick(item.id, item.disabled)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={contentStyle} role="tabpanel">
        {activeItem?.content}
      </div>
    </div>
  );
}
