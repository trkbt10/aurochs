/**
 * @file ParagraphPropertiesEditor - Editor for paragraph properties
 *
 * Edits paragraph-level formatting including alignment, indentation, spacing, and bullets.
 */

import { useCallback, useState, type CSSProperties } from "react";
import { Button, Input, Select, Toggle } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PixelsEditor } from "../primitives";
import { LineSpacingEditor } from "./LineSpacingEditor";
import { BulletStyleEditor, createDefaultBulletStyle } from "./BulletStyleEditor";
import { RunPropertiesEditor, createDefaultRunProperties } from "./RunPropertiesEditor";
import type { ParagraphProperties, LineSpacing, BulletStyle, RunProperties } from "../../../pptx/domain/text";
import type { TextAlign } from "../../../pptx/domain/types";
import type { EditorProps, SelectOption } from "../../types";
import { px } from "../../../pptx/domain/types";

// =============================================================================
// Types
// =============================================================================

export type ParagraphPropertiesEditorProps = EditorProps<ParagraphProperties> & {
  readonly style?: CSSProperties;
  /** Show bullet style editor */
  readonly showBullet?: boolean;
  /** Show default run properties editor */
  readonly showDefaultRunProperties?: boolean;
  /** Show advanced options (rtl, fontAlignment) */
  readonly showAdvanced?: boolean;
};

// =============================================================================
// Options
// =============================================================================

const alignmentOptions: readonly SelectOption<TextAlign>[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
  { value: "justifyLow", label: "Justify Low" },
  { value: "distributed", label: "Distributed" },
  { value: "thaiDistributed", label: "Thai Distributed" },
];

const fontAlignmentOptions: readonly SelectOption<"auto" | "top" | "center" | "base" | "bottom">[] = [
  { value: "auto", label: "Auto" },
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "base", label: "Baseline" },
  { value: "bottom", label: "Bottom" },
];

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const sectionStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const fieldStyle: CSSProperties = {
  flex: 1,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for paragraph properties (alignment, indentation, spacing, bullets)
 */
export function ParagraphPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showBullet = true,
  showDefaultRunProperties = false,
  showAdvanced = false,
}: ParagraphPropertiesEditorProps) {
  const [bulletExpanded, setBulletExpanded] = useState(!!value.bulletStyle);
  const [defaultRunPropsExpanded, setDefaultRunPropsExpanded] = useState(!!value.defaultRunProperties);

  const updateField = useCallback(
    <K extends keyof ParagraphProperties>(field: K, newValue: ParagraphProperties[K]) => {
      if (newValue === undefined) {
        const updated = { ...value };
        delete updated[field];
        onChange(updated as ParagraphProperties);
      } else {
        onChange({ ...value, [field]: newValue });
      }
    },
    [value, onChange]
  );

  const handleLevelChange = useCallback(
    (newLevel: string | number) => {
      const num = typeof newLevel === "number" ? newLevel : parseInt(newLevel, 10);
      const clamped = Math.max(0, Math.min(8, isNaN(num) ? 0 : num));
      updateField("level", clamped);
    },
    [updateField]
  );

  const handleLineSpacingChange = useCallback(
    (spacing: LineSpacing | undefined) => {
      updateField("lineSpacing", spacing);
    },
    [updateField]
  );

  const handleSpaceBeforeChange = useCallback(
    (spacing: LineSpacing | undefined) => {
      updateField("spaceBefore", spacing);
    },
    [updateField]
  );

  const handleSpaceAfterChange = useCallback(
    (spacing: LineSpacing | undefined) => {
      updateField("spaceAfter", spacing);
    },
    [updateField]
  );

  const handleBulletStyleChange = useCallback(
    (bulletStyle: BulletStyle | undefined) => {
      updateField("bulletStyle", bulletStyle);
    },
    [updateField]
  );

  const handleDefaultRunPropertiesChange = useCallback(
    (runProps: RunProperties) => {
      const isEmpty = Object.keys(runProps).length === 0;
      updateField("defaultRunProperties", isEmpty ? undefined : runProps);
    },
    [updateField]
  );

  const toggleBullet = useCallback(() => {
    if (bulletExpanded) {
      updateField("bulletStyle", undefined);
      setBulletExpanded(false);
    } else {
      setBulletExpanded(true);
    }
  }, [bulletExpanded, updateField]);

  const toggleDefaultRunProps = useCallback(() => {
    if (defaultRunPropsExpanded) {
      updateField("defaultRunProperties", undefined);
      setDefaultRunPropsExpanded(false);
    } else {
      setDefaultRunPropsExpanded(true);
    }
  }, [defaultRunPropsExpanded, updateField]);

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Alignment & Level Section */}
      <div style={sectionStyle}>
        <FieldRow>
          <FieldGroup label="Alignment" style={fieldStyle}>
            <Select
              value={value.alignment}
              onChange={(v) => updateField("alignment", v)}
              options={alignmentOptions}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Level" style={{ minWidth: "70px" }}>
            <Input
              type="number"
              value={value.level}
              onChange={handleLevelChange}
              min={0}
              max={8}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </div>

      {/* Indentation Section */}
      <div style={sectionStyle}>
        <FieldGroup label="Indentation">
          <FieldRow>
            <FieldGroup label="Left Margin" style={fieldStyle}>
              <PixelsEditor
                value={value.marginLeft ?? px(0)}
                onChange={(v) => updateField("marginLeft", v === px(0) ? undefined : v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Right Margin" style={fieldStyle}>
              <PixelsEditor
                value={value.marginRight ?? px(0)}
                onChange={(v) => updateField("marginRight", v === px(0) ? undefined : v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
          <div style={{ marginTop: "12px" }}>
            <FieldGroup label="First Line Indent">
              <PixelsEditor
                value={value.indent ?? px(0)}
                onChange={(v) => updateField("indent", v === px(0) ? undefined : v)}
                disabled={disabled}
              />
            </FieldGroup>
          </div>
        </FieldGroup>
      </div>

      {/* Line Spacing Section */}
      <div style={sectionStyle}>
        <FieldGroup label="Spacing">
          <FieldGroup label="Line Spacing">
            <LineSpacingEditor
              value={value.lineSpacing}
              onChange={handleLineSpacingChange}
              disabled={disabled}
            />
          </FieldGroup>
          <div style={{ marginTop: "12px" }}>
            <FieldRow>
              <FieldGroup label="Before Paragraph" style={fieldStyle}>
                <LineSpacingEditor
                  value={value.spaceBefore}
                  onChange={handleSpaceBeforeChange}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="After Paragraph" style={fieldStyle}>
                <LineSpacingEditor
                  value={value.spaceAfter}
                  onChange={handleSpaceAfterChange}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
          </div>
        </FieldGroup>
      </div>

      {/* Bullet Section */}
      {showBullet && (
        <>
          <Button
            variant="ghost"
            onClick={toggleBullet}
            disabled={disabled}
            style={{ alignSelf: "flex-start" }}
          >
            {bulletExpanded ? "− Remove Bullet" : "+ Add Bullet"}
          </Button>

          {bulletExpanded && (
            <div style={sectionStyle}>
              <FieldGroup label="Bullet Style">
                <BulletStyleEditor
                  value={value.bulletStyle ?? createDefaultBulletStyle()}
                  onChange={handleBulletStyleChange}
                  disabled={disabled}
                />
              </FieldGroup>
            </div>
          )}
        </>
      )}

      {/* Advanced Section */}
      {showAdvanced && (
        <div style={sectionStyle}>
          <FieldGroup label="Advanced">
            <FieldRow>
              <Toggle
                checked={value.rtl ?? false}
                onChange={(v) => updateField("rtl", v || undefined)}
                label="Right-to-Left"
                disabled={disabled}
              />
            </FieldRow>
            <div style={{ marginTop: "12px" }}>
              <FieldGroup label="Font Alignment">
                <Select
                  value={value.fontAlignment ?? "auto"}
                  onChange={(v) => updateField("fontAlignment", v === "auto" ? undefined : v)}
                  options={fontAlignmentOptions}
                  disabled={disabled}
                />
              </FieldGroup>
            </div>
          </FieldGroup>
        </div>
      )}

      {/* Default Run Properties Section */}
      {showDefaultRunProperties && (
        <>
          <Button
            variant="ghost"
            onClick={toggleDefaultRunProps}
            disabled={disabled}
            style={{ alignSelf: "flex-start" }}
          >
            {defaultRunPropsExpanded ? "− Remove Default Run Properties" : "+ Add Default Run Properties"}
          </Button>

          {defaultRunPropsExpanded && (
            <div style={sectionStyle}>
              <FieldGroup label="Default Run Properties">
                <RunPropertiesEditor
                  value={value.defaultRunProperties ?? createDefaultRunProperties()}
                  onChange={handleDefaultRunPropertiesChange}
                  disabled={disabled}
                  compact
                />
              </FieldGroup>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Create default ParagraphProperties value
 */
export function createDefaultParagraphProperties(): ParagraphProperties {
  return {
    level: 0,
    alignment: "left",
  };
}
