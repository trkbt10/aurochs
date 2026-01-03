/**
 * @file Accordion layout component
 *
 * A collapsible section for grouping related fields.
 * Supports both controlled and uncontrolled modes.
 */

import { useState, useCallback, type ReactNode, type CSSProperties } from "react";

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
  borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))",
};

const headerStyle = (disabled: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 4px",
  cursor: disabled ? "not-allowed" : "pointer",
  userSelect: "none",
  opacity: disabled ? 0.5 : 1,
});

const titleStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--text-secondary, #a1a1a1)",
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

const chevronStyle = (expanded: boolean): CSSProperties => ({
  width: "14px",
  height: "14px",
  color: "var(--text-tertiary, #737373)",
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
  gap: "8px",
  padding: "4px 4px 12px",
};

function ChevronIcon({ style }: { readonly style?: CSSProperties }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={style}>
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      <div
        style={headerStyle(disabled ?? false)}
        onClick={handleToggle}
        role="button"
        aria-expanded={expanded}
      >
        <span style={titleStyle}>{title}</span>
        <ChevronIcon style={chevronStyle(expanded)} />
      </div>

      <div style={contentWrapperStyle(expanded)}>
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
}
