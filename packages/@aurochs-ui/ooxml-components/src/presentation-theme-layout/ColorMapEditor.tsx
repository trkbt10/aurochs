/**
 * @file ColorMapEditor - Editor for color mapping (12 slots)
 *
 * Maps logical color roles (bg1, tx1, etc.) to scheme color names (dk1, lt1, etc.).
 *
 * @see ECMA-376 Part 1, Section 20.1.6.3 (clrMap)
 */

import { useCallback, type CSSProperties } from "react";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { DEFAULT_COLOR_MAPPING, type ColorMapping } from "@aurochs-office/pptx/domain/color/types";
import { spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { schemeColorNameOptions } from "@aurochs-ui/editor-controls/editors";

// =============================================================================
// Types
// =============================================================================

export type ColorMapEditorProps = {
  readonly colorMapping: ColorMapping;
  readonly onChange: (mapping: ColorMapping) => void;
  readonly disabled?: boolean;
  readonly title?: string;
};

// =============================================================================
// Constants
// =============================================================================

const COLOR_MAP_SLOTS: readonly { key: keyof ColorMapping; label: string }[] = [
  { key: "bg1", label: "Background 1" },
  { key: "tx1", label: "Text 1" },
  { key: "bg2", label: "Background 2" },
  { key: "tx2", label: "Text 2" },
  { key: "accent1", label: "Accent 1" },
  { key: "accent2", label: "Accent 2" },
  { key: "accent3", label: "Accent 3" },
  { key: "accent4", label: "Accent 4" },
  { key: "accent5", label: "Accent 5" },
  { key: "accent6", label: "Accent 6" },
  { key: "hlink", label: "Hyperlink" },
  { key: "folHlink", label: "Followed Link" },
];

const schemeColorOptions = schemeColorNameOptions;

// DEFAULT_COLOR_MAPPING: import from @aurochs-office/pptx/domain/color/types (SoT)

// =============================================================================
// Styles
// =============================================================================

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.xs,
  padding: spacingTokens.sm,
};

const LABEL_WIDTH = 100;

// =============================================================================
// Component
// =============================================================================

/**
 * Color map editor — maps 12 logical color roles to scheme color names.
 */
export function ColorMapEditor({ colorMapping, onChange, disabled, title = "Color Map" }: ColorMapEditorProps) {
  const handleSlotChange = useCallback(
    (key: keyof ColorMapping, value: string) => {
      onChange({ ...colorMapping, [key]: value });
    },
    [colorMapping, onChange],
  );

  return (
    <OptionalPropertySection title={title} defaultExpanded={false}>
      <div style={contentStyle}>
        {COLOR_MAP_SLOTS.map(({ key, label }) => (
          <FieldGroup key={key} label={label} inline labelWidth={LABEL_WIDTH}>
            <Select
              value={colorMapping[key] ?? DEFAULT_COLOR_MAPPING[key] ?? key}
              onChange={(v) => handleSlotChange(key, v)}
              options={schemeColorOptions}
              disabled={disabled}
            />
          </FieldGroup>
        ))}
      </div>
    </OptionalPropertySection>
  );
}
