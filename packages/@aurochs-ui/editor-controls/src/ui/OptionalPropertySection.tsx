/**
 * @file OptionalPropertySection - Unified property section for inspector panels
 *
 * The single collapsible section component for all inspector panels.
 * Embeds collapsible header + content layout directly (no external Accordion dependency).
 *
 * Two modes:
 * - Required mode: renders children directly (use `children` prop)
 * - Optional mode: renders editor when value exists, "Add" button when undefined
 *   (use `value`, `createDefault`, `onChange`, `renderEditor` props)
 */

import { useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { ChevronRightIcon } from "@aurochs-ui/ui-components/icons";
import {
  colorTokens,
  fontTokens,
  iconTokens,
  spacingTokens,
  inspectorTokens,
} from "@aurochs-ui/ui-components/design-tokens";
import { Button } from "@aurochs-ui/ui-components/primitives";

// =============================================================================
// Types
// =============================================================================

type BaseSectionProps = {
  readonly title: string;
  readonly defaultExpanded?: boolean;
  /** Controlled expanded state */
  readonly expanded?: boolean;
  /** Callback when expansion state changes */
  readonly onExpandedChange?: (expanded: boolean) => void;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Badge/count displayed next to the title */
  readonly badge?: string | number;
};

type RequiredSectionProps = BaseSectionProps & {
  readonly children: ReactNode;
  readonly value?: undefined;
  readonly createDefault?: undefined;
  readonly onChange?: undefined;
  readonly renderEditor?: undefined;
};

type OptionalSectionProps<T> = BaseSectionProps & {
  readonly children?: undefined;
  /** Current property value (undefined = not set) */
  readonly value: T | undefined;
  /** Factory function to create default value when "Add" is clicked */
  readonly createDefault: () => T;
  /** Called when property is added or updated */
  readonly onChange: (value: T) => void;
  /** Render the editor for the property value */
  readonly renderEditor: (value: T, onChange: (value: T) => void) => ReactNode;
};

export type OptionalPropertySectionProps<T = unknown> = RequiredSectionProps | OptionalSectionProps<T>;

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
  padding: `${inspectorTokens.sectionPaddingBlock} ${inspectorTokens.sectionPaddingInline}`,
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
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
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
  padding: `0 ${inspectorTokens.sectionPaddingInline} ${inspectorTokens.sectionPaddingBlock} ${inspectorTokens.sectionPaddingInline}`,
};

const badgeStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  padding: "2px 6px",
  borderRadius: "4px",
};

const addButtonContainerStyle: CSSProperties = {
  textAlign: "center",
};

// =============================================================================
// Helpers
// =============================================================================

function resolveContent<T>(props: OptionalPropertySectionProps<T>, title: string): ReactNode {
  if (props.children !== undefined) {
    return props.children;
  }
  const { value, createDefault, onChange, renderEditor } = props as OptionalSectionProps<T>;
  if (value !== undefined) {
    return renderEditor(value, onChange);
  }
  return (
    <div style={addButtonContainerStyle}>
      <Button variant="secondary" size="sm" onClick={() => onChange(createDefault())}>
        Add {title}
      </Button>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Unified property section for inspector panels.
 *
 * Required mode (children):
 * ```tsx
 * <OptionalPropertySection title="Transform" defaultExpanded>
 *   <div>content</div>
 * </OptionalPropertySection>
 * ```
 *
 * Optional mode (value + renderEditor):
 * ```tsx
 * <OptionalPropertySection
 *   title="Fill"
 *   value={fill}
 *   createDefault={() => ({ type: "solid", color: "#000" })}
 *   onChange={setFill}
 *   renderEditor={(v, onChange) => <FillEditor value={v} onChange={onChange} />}
 * />
 * ```
 */
export function OptionalPropertySection<T>(props: OptionalPropertySectionProps<T>) {
  const {
    title,
    defaultExpanded = false,
    expanded: controlledExpanded,
    onExpandedChange,
    disabled,
  } = props;

  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = useCallback(() => {
    if (disabled) { return; }
    if (isControlled) {
      onExpandedChange?.(!expanded);
    } else {
      setInternalExpanded(!expanded);
      onExpandedChange?.(!expanded);
    }
  }, [disabled, isControlled, expanded, onExpandedChange]);

  // Determine content
  const content = resolveContent(props, title);

  return (
    <div style={containerStyle}>
      <div style={headerStyle(disabled ?? false)} onClick={handleToggle} role="button" aria-expanded={expanded}>
        <span style={titleStyle}>
          {title}
          {props.badge !== undefined && <span style={badgeStyle}>{props.badge}</span>}
        </span>
        <div style={chevronContainerStyle(expanded)}>
          <ChevronRightIcon size={iconTokens.size.sm} strokeWidth={iconTokens.strokeWidth} />
        </div>
      </div>
      <div style={contentWrapperStyle(expanded)}>
        <div style={contentStyle}>{content}</div>
      </div>
    </div>
  );
}
