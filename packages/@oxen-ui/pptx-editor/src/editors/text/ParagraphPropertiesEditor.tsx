/**
 * @file ParagraphPropertiesEditor - Editor for paragraph properties
 *
 * Edits paragraph-level formatting including alignment, indentation, spacing, and bullets.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { Button, Select } from "@oxen-ui/ui-components/primitives";
import { FieldGroup } from "@oxen-ui/ui-components/layout";
import { BulletStyleEditor, createDefaultBulletStyle } from "./BulletStyleEditor";
import { RunPropertiesEditor, createDefaultRunProperties } from "./RunPropertiesEditor";
import type { ParagraphProperties, BulletStyle, RunProperties } from "@oxen/pptx/domain/text";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";
import { MixedParagraphPropertiesEditor } from "./MixedParagraphPropertiesEditor";
import { extractMixedParagraphProperties, mergeParagraphProperties } from "./mixed-properties";

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
  const mixedValue = useMemo(() => extractMixedParagraphProperties([value]), [value]);
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

  const handleCoreChange = useCallback(
    (update: Partial<ParagraphProperties>) => {
      onChange(mergeParagraphProperties(value, update));
    },
    [value, onChange]
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
      <div style={sectionStyle}>
        <MixedParagraphPropertiesEditor
          value={mixedValue}
          onChange={handleCoreChange}
          disabled={disabled}
          showSpacing
          showIndentation
          showDirection={showAdvanced}
        />
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
            <FieldGroup label="Font Alignment">
              <Select
                value={value.fontAlignment ?? "auto"}
                onChange={(v) => updateField("fontAlignment", v === "auto" ? undefined : v)}
                options={fontAlignmentOptions}
                disabled={disabled}
              />
            </FieldGroup>
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
