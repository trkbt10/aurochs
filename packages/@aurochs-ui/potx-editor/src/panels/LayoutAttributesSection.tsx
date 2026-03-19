/**
 * @file Layout attributes section component
 *
 * Editable fields for slide layout metadata: name, type, matchingName,
 * showMasterShapes, preserve, userDrawn.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */

import { useCallback, type CSSProperties } from "react";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { Toggle } from "@aurochs-ui/ui-components/primitives/Toggle";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import type { SlideLayoutType } from "@aurochs-office/pptx/domain";
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
  readonly matchingName?: string;
  readonly showMasterShapes?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
  readonly onLayoutNameChange?: (name: string) => void;
  readonly onLayoutTypeChange?: (type: string) => void;
  readonly onMatchingNameChange?: (name: string) => void;
  readonly onShowMasterShapesChange?: (value: boolean) => void;
  readonly onPreserveChange?: (value: boolean) => void;
  readonly onUserDrawnChange?: (value: boolean) => void;
};

// =============================================================================
// Layout Type Options
// =============================================================================

const LAYOUT_TYPE_OPTIONS: SelectOption<SlideLayoutType>[] = [
  { value: "blank", label: "Blank" },
  { value: "title", label: "Title Slide" },
  { value: "titleOnly", label: "Title Only" },
  { value: "tx", label: "Text" },
  { value: "twoColTx", label: "Two Column Text" },
  { value: "tbl", label: "Table" },
  { value: "txAndChart", label: "Text and Chart" },
  { value: "chartAndTx", label: "Chart and Text" },
  { value: "dgm", label: "Diagram" },
  { value: "chart", label: "Chart" },
  { value: "txAndClipArt", label: "Text and Clip Art" },
  { value: "clipArtAndTx", label: "Clip Art and Text" },
  { value: "txAndObj", label: "Text and Object" },
  { value: "objAndTx", label: "Object and Text" },
  { value: "objOnly", label: "Object Only" },
  { value: "obj", label: "Object" },
  { value: "txAndMedia", label: "Text and Media" },
  { value: "mediaAndTx", label: "Media and Text" },
  { value: "objOverTx", label: "Object Over Text" },
  { value: "txOverObj", label: "Text Over Object" },
  { value: "txAndTwoObj", label: "Text and Two Objects" },
  { value: "twoObjAndTx", label: "Two Objects and Text" },
  { value: "twoObjOverTx", label: "Two Objects Over Text" },
  { value: "fourObj", label: "Four Objects" },
  { value: "vertTx", label: "Vertical Text" },
  { value: "clipArtAndVertTx", label: "Clip Art and Vertical Text" },
  { value: "vertTitleAndTx", label: "Vertical Title and Text" },
  { value: "vertTitleAndTxOverChart", label: "Vertical Title and Text Over Chart" },
  { value: "twoObj", label: "Two Objects" },
  { value: "objAndTwoObj", label: "Object and Two Objects" },
  { value: "twoObjAndObj", label: "Two Objects and Object" },
  { value: "cust", label: "Custom" },
  { value: "secHead", label: "Section Header" },
  { value: "twoTxTwoObj", label: "Two Text Two Objects" },
  { value: "objTx", label: "Object Text" },
  { value: "picTx", label: "Picture Text" },
];

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
  matchingName,
  showMasterShapes,
  preserve,
  userDrawn,
  onLayoutNameChange,
  onLayoutTypeChange,
  onMatchingNameChange,
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

  const handleMatchingNameChange = useCallback(
    (value: string | number) => {
      onMatchingNameChange?.(String(value));
    },
    [onMatchingNameChange],
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
          <Select
            value={layoutType ?? "blank"}
            onChange={(v) => onLayoutTypeChange?.(v)}
            options={LAYOUT_TYPE_OPTIONS}
            style={{ flex: 1 }}
          />
        </div>
        <div style={layoutAttrRowStyle}>
          <span style={layoutAttrLabelStyle}>Matching Name</span>
          <Input
            value={matchingName ?? ""}
            onChange={handleMatchingNameChange}
            placeholder="Optional"
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
