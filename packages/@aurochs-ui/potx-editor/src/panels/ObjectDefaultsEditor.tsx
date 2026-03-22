/**
 * @file ObjectDefaultsEditor - Editor for object defaults (a:objectDefaults)
 *
 * Edits default fill for shape/line/text defaults.
 * Object defaults use domain types (ShapeProperties, BodyProperties, TextStyleLevels).
 *
 * @see ECMA-376 Part 1, Section 20.1.6.7 (objectDefaults)
 */

import { useCallback, type CSSProperties } from "react";
import type { ObjectDefaults, ObjectDefaultProperties } from "@aurochs-office/pptx/domain/theme/types";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { BaseFillEditor } from "@aurochs-ui/editor-controls/editors";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ObjectDefaultsEditorProps = {
  readonly objectDefaults: ObjectDefaults | undefined;
  readonly onChange: (objectDefaults: ObjectDefaults) => void;
  readonly disabled?: boolean;
};

type DefaultKind = "shapeDefault" | "lineDefault" | "textDefault";

type DefaultEntry = {
  readonly key: DefaultKind;
  readonly label: string;
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ENTRIES: readonly DefaultEntry[] = [
  { key: "shapeDefault", label: "Shape Default" },
  { key: "lineDefault", label: "Line Default" },
  { key: "textDefault", label: "Text Default" },
];

// =============================================================================
// Styles
// =============================================================================

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.xs,
};

const sectionContainerStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderRadius: "4px",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
};

const infoStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for object defaults (shape, line, text defaults).
 *
 * Each default's shapeProperties.fill is editable via BaseFillEditor.
 */
export function ObjectDefaultsEditor({ objectDefaults, onChange, disabled }: ObjectDefaultsEditorProps) {
  const handleFillChange = useCallback(
    (key: DefaultKind, fill: BaseFill) => {
      const current = objectDefaults ?? {};
      const currentProps = current[key] ?? {};
      const currentSpPr = currentProps.shapeProperties ?? {};
      const updated: ObjectDefaultProperties = {
        ...currentProps,
        shapeProperties: { ...currentSpPr, fill },
      };
      onChange({ ...current, [key]: updated });
    },
    [objectDefaults, onChange],
  );

  const hasAny = DEFAULT_ENTRIES.some(({ key }) => objectDefaults?.[key] != null);

  return (
    <OptionalPropertySection title="Object Defaults" defaultExpanded={false}>
      <div style={contentStyle}>
        {!hasAny && <span style={infoStyle}>No defaults defined</span>}
        {DEFAULT_ENTRIES.map(({ key, label }) => {
          const props = objectDefaults?.[key];
          if (props === undefined) {
            return null;
          }
          const fill = props.shapeProperties?.fill;
          return (
            <div key={key}>
              <div style={sectionLabelStyle}>{label}</div>
              <div style={sectionContainerStyle}>
                {fill !== undefined ? (
                  <BaseFillEditor
                    value={fill}
                    onChange={(f) => handleFillChange(key, f)}
                    disabled={disabled}
                    compact
                  />
                ) : (
                  <span style={infoStyle}>No fill defined</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </OptionalPropertySection>
  );
}
