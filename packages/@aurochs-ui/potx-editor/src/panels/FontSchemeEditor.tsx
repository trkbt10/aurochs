/**
 * @file Font scheme editor component
 *
 * Editor for theme fonts (major and minor).
 * Uses a single OptionalPropertySection with sub-labels,
 * matching the FormatSchemeEditor / ColorSchemeEditor pattern.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (CT_FontScheme / a:fontScheme)
 */

import { useCallback, type CSSProperties } from "react";
import type { FontScheme, FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { FontFamilySelect } from "@aurochs-ui/editor-controls/font";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

export type FontSchemeEditorProps = {
  readonly fontScheme?: FontScheme;
  readonly fontSchemeName?: string;
  readonly onMajorFontChange: (spec: Partial<FontSpec>) => void;
  readonly onMinorFontChange: (spec: Partial<FontSpec>) => void;
  readonly onFontSchemeNameChange?: (name: string) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const sectionContentStyle: CSSProperties = {
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

const emptyStateStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

const LABEL_WIDTH = 100;

// =============================================================================
// FontSpec Fields
// =============================================================================

type FontSpecFieldsProps = {
  readonly fontSpec?: FontSpec;
  readonly onChange: (spec: Partial<FontSpec>) => void;
  readonly disabled?: boolean;
};

/** Renders Latin / East Asian / Complex Script fields as plain content (no wrapping section). */
function FontSpecFields({ fontSpec, onChange, disabled }: FontSpecFieldsProps) {
  const handleLatinChange = useCallback(
    (value: string | undefined) => { onChange({ latin: value || undefined }); },
    [onChange],
  );
  const handleEastAsianChange = useCallback(
    (value: string | undefined) => { onChange({ eastAsian: value || undefined }); },
    [onChange],
  );
  const handleComplexScriptChange = useCallback(
    (value: string | undefined) => { onChange({ complexScript: value || undefined }); },
    [onChange],
  );

  return (
    <>
      <FieldGroup label="Latin" inline labelWidth={LABEL_WIDTH}>
        <FontFamilySelect
          value={fontSpec?.latin ?? ""}
          onChange={handleLatinChange}
          placeholder="e.g., Calibri"
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="East Asian" inline labelWidth={LABEL_WIDTH}>
        <FontFamilySelect
          value={fontSpec?.eastAsian ?? ""}
          onChange={handleEastAsianChange}
          placeholder="e.g., MS Gothic"
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Complex Script" inline labelWidth={LABEL_WIDTH}>
        <FontFamilySelect
          value={fontSpec?.complexScript ?? ""}
          onChange={handleComplexScriptChange}
          placeholder="e.g., Arial"
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Font scheme editor component.
 *
 * Single OptionalPropertySection wrapping:
 * - Scheme name field
 * - Major font (headings) fields with section label
 * - Minor font (body) fields with section label
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (CT_FontScheme)
 */
export function FontSchemeEditor({
  fontScheme,
  fontSchemeName,
  onMajorFontChange,
  onMinorFontChange,
  onFontSchemeNameChange,
  disabled,
}: FontSchemeEditorProps) {
  const handleNameChange = useCallback(
    (value: string | number) => onFontSchemeNameChange?.(String(value)),
    [onFontSchemeNameChange],
  );

  if (!fontScheme) {
    return <div style={emptyStateStyle}>No font scheme defined</div>;
  }

  return (
    <OptionalPropertySection title="Font Scheme" defaultExpanded>
      <div style={sectionContentStyle}>
        {onFontSchemeNameChange && (
          <FieldGroup label="Name" inline labelWidth={LABEL_WIDTH}>
            <Input value={fontSchemeName ?? ""} onChange={handleNameChange} placeholder="Font scheme name" disabled={disabled} />
          </FieldGroup>
        )}

        <div style={sectionLabelStyle}>Major Font (Headings)</div>
        <FontSpecFields fontSpec={fontScheme.majorFont} onChange={onMajorFontChange} disabled={disabled} />

        <div style={sectionLabelStyle}>Minor Font (Body)</div>
        <FontSpecFields fontSpec={fontScheme.minorFont} onChange={onMinorFontChange} disabled={disabled} />
      </div>
    </OptionalPropertySection>
  );
}
