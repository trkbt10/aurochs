/**
 * @file Layout attributes section component
 *
 * Editable fields for slide layout metadata: name, type, showMasterShapes, preserve, userDrawn.
 * Extracted from ThemeInspectorPanel for reuse in the unified inspector pivot tabs.
 */

import { useCallback, type CSSProperties } from "react";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Toggle } from "@aurochs-ui/ui-components/primitives/Toggle";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Styles
// =============================================================================

const layoutAttrRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  marginBottom: spacingTokens.sm,
};

const layoutAttrLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.secondary,
  width: "100px",
  flexShrink: 0,
};

// =============================================================================
// Types
// =============================================================================

export type LayoutAttributesSectionProps = {
  readonly layoutName?: string;
  readonly layoutType?: string;
  readonly showMasterShapes?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
  readonly onLayoutNameChange?: (name: string) => void;
  readonly onLayoutTypeChange?: (type: string) => void;
  readonly onShowMasterShapesChange?: (value: boolean) => void;
  readonly onPreserveChange?: (value: boolean) => void;
  readonly onUserDrawnChange?: (value: boolean) => void;
};

/** No-op function for optional callbacks */
function noop(): void {
  // intentionally empty
}

// =============================================================================
// Component
// =============================================================================

/**
 * Layout attributes section.
 *
 * Displays editable fields for slide layout metadata within a collapsible section.
 */
export function LayoutAttributesSection({
  layoutName,
  layoutType,
  showMasterShapes,
  preserve,
  userDrawn,
  onLayoutNameChange,
  onLayoutTypeChange,
  onShowMasterShapesChange,
  onPreserveChange,
  onUserDrawnChange,
}: LayoutAttributesSectionProps) {
  const handleNameChange = useCallback(
    (value: string | number) => {
      onLayoutNameChange?.(String(value));
    },
    [onLayoutNameChange],
  );

  const handleTypeChange = useCallback(
    (value: string | number) => {
      onLayoutTypeChange?.(String(value));
    },
    [onLayoutTypeChange],
  );

  return (
    <OptionalPropertySection title="Layout Attributes" defaultExpanded>
      <div style={{ padding: spacingTokens.sm }}>
        <div style={layoutAttrRowStyle}>
          <span style={layoutAttrLabelStyle}>Name</span>
          <Input
            value={layoutName ?? ""}
            onChange={handleNameChange}
            placeholder="Layout name"
            style={{ flex: 1 }}
          />
        </div>
        <div style={layoutAttrRowStyle}>
          <span style={layoutAttrLabelStyle}>Type</span>
          <Input
            value={layoutType ?? ""}
            onChange={handleTypeChange}
            placeholder="Layout type"
            style={{ flex: 1 }}
          />
        </div>
        <div style={layoutAttrRowStyle}>
          <Toggle
            checked={showMasterShapes ?? true}
            onChange={onShowMasterShapesChange ?? noop}
            label="Show master shapes"
          />
        </div>
        <div style={layoutAttrRowStyle}>
          <Toggle
            checked={preserve ?? false}
            onChange={onPreserveChange ?? noop}
            label="Preserve"
          />
        </div>
        <div style={layoutAttrRowStyle}>
          <Toggle
            checked={userDrawn ?? false}
            onChange={onUserDrawnChange ?? noop}
            label="User drawn"
          />
        </div>
      </div>
    </OptionalPropertySection>
  );
}
