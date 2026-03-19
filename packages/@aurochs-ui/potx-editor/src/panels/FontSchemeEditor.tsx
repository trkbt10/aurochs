/**
 * @file Font scheme editor component
 *
 * Editor for theme fonts (major and minor).
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

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const sectionContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
  padding: spacingTokens.sm,
};

const emptyStateStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

const LABEL_WIDTH = 100;

type FontSpecEditorProps = {
  readonly title: string;
  readonly fontSpec?: FontSpec;
  readonly onChange: (spec: Partial<FontSpec>) => void;
  readonly disabled?: boolean;
};

function FontSpecEditor({ title, fontSpec, onChange, disabled }: FontSpecEditorProps) {
  const handleLatinChange = useCallback(
    (value: string | undefined) => {
      onChange({ latin: value || undefined });
    },
    [onChange],
  );

  const handleEastAsianChange = useCallback(
    (value: string | undefined) => {
      onChange({ eastAsian: value || undefined });
    },
    [onChange],
  );

  const handleComplexScriptChange = useCallback(
    (value: string | undefined) => {
      onChange({ complexScript: value || undefined });
    },
    [onChange],
  );

  return (
    <OptionalPropertySection title={title} defaultExpanded>
      <div style={sectionContentStyle}>
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
      </div>
    </OptionalPropertySection>
  );
}

/**
 * Font scheme editor component.
 *
 * Allows editing of:
 * - Major font (headings/titles)
 * - Minor font (body text)
 *
 * Each font has three script types: Latin, East Asian, Complex Script.
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
    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>No font scheme defined</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {onFontSchemeNameChange && (
        <OptionalPropertySection title="Font Scheme" defaultExpanded>
          <div style={sectionContentStyle}>
            <FieldGroup label="Name" inline labelWidth={LABEL_WIDTH}>
              <Input value={fontSchemeName ?? ""} onChange={handleNameChange} placeholder="Font scheme name" disabled={disabled} />
            </FieldGroup>
          </div>
        </OptionalPropertySection>
      )}
      <FontSpecEditor
        title="Major Font (Headings)"
        fontSpec={fontScheme.majorFont}
        onChange={onMajorFontChange}
        disabled={disabled}
      />
      <FontSpecEditor
        title="Minor Font (Body)"
        fontSpec={fontScheme.minorFont}
        onChange={onMinorFontChange}
        disabled={disabled}
      />
    </div>
  );
}
