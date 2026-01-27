/**
 * @file Accordion layout component
 *
 * A collapsible section for grouping related fields.
 * Supports both controlled and uncontrolled modes.
 * Uses lucide-react icons for consistent visual design.
 */

import { useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { ChevronRightIcon } from "../icons";
import { colorTokens, fontTokens, iconTokens, spacingTokens } from "../design-tokens";

export type AccordionProps = {
  /** Section title displayed in the header */
  readonly title: string;
  /** Content to render when expanded */
  readonly children: ReactNode;
  /** Whether the accordion is expanded (controlled mode) */
  readonly expanded?: boolean;
  /** Callback when expansion state changes */
  readonly onExpandedChange?: (expanded: boolean) => void;
  /** Default expanded state for uncontrolled usage */
  readonly defaultExpanded?: boolean;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Additional CSS class */
  readonly className?: string;
  /** Inline style overrides */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const headerStyle = (disabled: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  cursor: disabled ? "not-allowed" : "pointer",
  userSelect: "none",
  opacity: disabled ? 0.5 : 1,
});

const titleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

const chevronContainerStyle = (expanded: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  transition: "transform 150ms ease",
  transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
});

const contentWrapperStyle = (expanded: boolean): CSSProperties => ({
  overflow: "hidden",
  maxHeight: expanded ? "2000px" : "0",
  opacity: expanded ? 1 : 0,
  transition: "max-height 200ms ease, opacity 150ms ease",
});

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.xs} ${spacingTokens.xs} ${spacingTokens.md}`,
};

/**
 * A collapsible accordion component for grouping related fields.
 */
export function Accordion({
  title,
  children,
  expanded: controlledExpanded,
  onExpandedChange,
  defaultExpanded = false,
  disabled,
  className,
  style,
}: AccordionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = useCallback(() => {
    if (disabled) {
      return;
    }

    if (isControlled) {
      onExpandedChange?.(!expanded);
    } else {
      setInternalExpanded(!expanded);
      onExpandedChange?.(!expanded);
    }
  }, [disabled, isControlled, expanded, onExpandedChange]);

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <div style={headerStyle(disabled ?? false)} onClick={handleToggle} role="button" aria-expanded={expanded}>
        <span style={titleStyle}>{title}</span>
        <div style={chevronContainerStyle(expanded)}>
          <ChevronRightIcon size={iconTokens.size.sm} strokeWidth={iconTokens.strokeWidth} />
        </div>
      </div>

      <div style={contentWrapperStyle(expanded)}>
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
}
