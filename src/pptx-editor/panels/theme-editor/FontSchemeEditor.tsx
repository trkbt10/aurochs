/**
 * @file Font scheme editor component
 *
 * Editor for theme fonts (major and minor).
 */

import { useCallback, type CSSProperties } from "react";
import type { FontScheme, FontSpec } from "../../../pptx/domain/resolution";
import { InspectorSection, Accordion, FieldGroup, FieldRow } from "../../ui/layout";
import { Input } from "../../ui/primitives/Input";
import { colorTokens, fontTokens, spacingTokens } from "../../ui/design-tokens";

export type FontSchemeEditorProps = {
  readonly fontScheme?: FontScheme;
  readonly onMajorFontChange: (spec: Partial<FontSpec>) => void;
  readonly onMinorFontChange: (spec: Partial<FontSpec>) => void;
  readonly disabled?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

const fontSectionStyle: CSSProperties = {
  padding: spacingTokens.sm,
};

const fontRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  marginBottom: spacingTokens.sm,
};

const fontLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.secondary,
  width: "100px",
  flexShrink: 0,
};

const inputStyle: CSSProperties = {
  flex: 1,
};

const emptyStateStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

type FontSpecEditorProps = {
  readonly title: string;
  readonly fontSpec?: FontSpec;
  readonly onChange: (spec: Partial<FontSpec>) => void;
  readonly disabled?: boolean;
};

function FontSpecEditor({ title, fontSpec, onChange, disabled }: FontSpecEditorProps) {
  const handleLatinChange = useCallback(
    (value: string | number) => {
      onChange({ latin: String(value) || undefined });
    },
    [onChange]
  );

  const handleEastAsianChange = useCallback(
    (value: string | number) => {
      onChange({ eastAsian: String(value) || undefined });
    },
    [onChange]
  );

  const handleComplexScriptChange = useCallback(
    (value: string | number) => {
      onChange({ complexScript: String(value) || undefined });
    },
    [onChange]
  );

  return (
    <Accordion title={title} defaultExpanded>
      <div style={fontSectionStyle}>
        <div style={fontRowStyle}>
          <span style={fontLabelStyle}>Latin</span>
          <Input
            value={fontSpec?.latin ?? ""}
            onChange={handleLatinChange}
            placeholder="e.g., Calibri"
            disabled={disabled}
            style={inputStyle}
          />
        </div>
        <div style={fontRowStyle}>
          <span style={fontLabelStyle}>East Asian</span>
          <Input
            value={fontSpec?.eastAsian ?? ""}
            onChange={handleEastAsianChange}
            placeholder="e.g., MS Gothic"
            disabled={disabled}
            style={inputStyle}
          />
        </div>
        <div style={fontRowStyle}>
          <span style={fontLabelStyle}>Complex Script</span>
          <Input
            value={fontSpec?.complexScript ?? ""}
            onChange={handleComplexScriptChange}
            placeholder="e.g., Arial"
            disabled={disabled}
            style={inputStyle}
          />
        </div>
      </div>
    </Accordion>
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
  onMajorFontChange,
  onMinorFontChange,
  disabled,
}: FontSchemeEditorProps) {
  if (!fontScheme) {
    return (
      <div style={containerStyle}>
        <InspectorSection title="Font Scheme">
          <div style={emptyStateStyle}>No font scheme defined</div>
        </InspectorSection>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <InspectorSection title="Font Scheme">
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
      </InspectorSection>
    </div>
  );
}
