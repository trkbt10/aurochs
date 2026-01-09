/**
 * @file BulletStyleEditor - Editor for bullet style properties
 *
 * Handles bullet type (none, auto, char, blip) and associated styling options.
 */

import { useCallback, useState, type CSSProperties } from "react";
import { Button, Input, Select, Toggle } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PercentEditor, PointsEditor } from "../primitives";
import { ColorEditor, createDefaultColor } from "../color";
import type {
  BulletStyle,
  Bullet,
  BulletType,
  AutoNumberBullet,
  CharBullet,
} from "../../../pptx/domain/text";
import type { Percent, Points, TextTypeface } from "../../../pptx/domain/types";
import type { Color } from "../../../pptx/domain/color/types";
import type { EditorProps, SelectOption } from "../../types";
import { pct, pt } from "../../../pptx/domain/types";

// =============================================================================
// Types
// =============================================================================

export type BulletStyleEditorProps = EditorProps<BulletStyle | undefined> & {
  readonly style?: CSSProperties;
  /** Show advanced options (size, font) */
  readonly showAdvanced?: boolean;
};

// =============================================================================
// Options
// =============================================================================

const bulletTypeOptions: readonly SelectOption<BulletType>[] = [
  { value: "none", label: "None" },
  { value: "char", label: "Character" },
  { value: "auto", label: "Auto Number" },
  { value: "blip", label: "Picture" },
];

const autoNumberSchemes: readonly SelectOption<string>[] = [
  { value: "arabicPeriod", label: "1. 2. 3." },
  { value: "arabicParenR", label: "1) 2) 3)" },
  { value: "arabicParenBoth", label: "(1) (2) (3)" },
  { value: "arabicPlain", label: "1 2 3" },
  { value: "alphaLcPeriod", label: "a. b. c." },
  { value: "alphaUcPeriod", label: "A. B. C." },
  { value: "alphaLcParenR", label: "a) b) c)" },
  { value: "alphaUcParenR", label: "A) B) C)" },
  { value: "romanLcPeriod", label: "i. ii. iii." },
  { value: "romanUcPeriod", label: "I. II. III." },
];

const commonBulletChars: readonly SelectOption<string>[] = [
  { value: "•", label: "• Bullet" },
  { value: "‣", label: "‣ Triangle" },
  { value: "◦", label: "◦ Hollow" },
  { value: "▪", label: "▪ Square" },
  { value: "▫", label: "▫ Hollow Square" },
  { value: "★", label: "★ Star" },
  { value: "→", label: "→ Arrow" },
  { value: "✓", label: "✓ Check" },
  { value: "✗", label: "✗ Cross" },
  { value: "−", label: "− Dash" },
];

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const sectionStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const toggleRowStyle: CSSProperties = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
};

const fieldStyle: CSSProperties = {
  flex: 1,
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a default bullet for the given type
 */
function createDefaultBullet(type: BulletType): Bullet {
  switch (type) {
    case "none":
      return { type: "none" };
    case "char":
      return { type: "char", char: "•" };
    case "auto":
      return { type: "auto", scheme: "arabicPeriod" };
    case "blip":
      return { type: "blip", resourceId: "" };
  }
}

/**
 * Create default bullet style
 */
function createDefaultBulletStyle(): BulletStyle {
  return {
    bullet: { type: "char", char: "•" },
    colorFollowText: true,
    sizeFollowText: true,
    fontFollowText: true,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for bullet style properties
 */
export function BulletStyleEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showAdvanced = true,
}: BulletStyleEditorProps) {
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const bulletStyle = value ?? createDefaultBulletStyle();

  const updateField = useCallback(
    <K extends keyof BulletStyle>(field: K, newValue: BulletStyle[K]) => {
      onChange({ ...bulletStyle, [field]: newValue });
    },
    [bulletStyle, onChange]
  );

  const handleBulletTypeChange = useCallback(
    (newType: BulletType) => {
      if (newType === "none") {
        onChange(undefined);
      } else {
        const newBullet = createDefaultBullet(newType);
        onChange({ ...bulletStyle, bullet: newBullet });
      }
    },
    [bulletStyle, onChange]
  );

  const handleAutoSchemeChange = useCallback(
    (scheme: string) => {
      const bullet = bulletStyle.bullet as AutoNumberBullet;
      onChange({
        ...bulletStyle,
        bullet: { ...bullet, scheme },
      });
    },
    [bulletStyle, onChange]
  );

  const handleAutoStartAtChange = useCallback(
    (startAt: string | number) => {
      const num = typeof startAt === "number" ? startAt : parseInt(startAt, 10);
      const bullet = bulletStyle.bullet as AutoNumberBullet;
      onChange({
        ...bulletStyle,
        bullet: { ...bullet, startAt: isNaN(num) || num <= 1 ? undefined : num },
      });
    },
    [bulletStyle, onChange]
  );

  const handleCharChange = useCallback(
    (char: string) => {
      const bullet = bulletStyle.bullet as CharBullet;
      onChange({
        ...bulletStyle,
        bullet: { ...bullet, char },
      });
    },
    [bulletStyle, onChange]
  );

  const handleColorChange = useCallback(
    (color: Color) => {
      updateField("color", color);
    },
    [updateField]
  );

  const handleSizePercentChange = useCallback(
    (sizePercent: Percent) => {
      onChange({
        ...bulletStyle,
        sizePercent,
        sizePoints: undefined,
      });
    },
    [bulletStyle, onChange]
  );

  const handleSizePointsChange = useCallback(
    (sizePoints: Points) => {
      onChange({
        ...bulletStyle,
        sizePoints,
        sizePercent: undefined,
      });
    },
    [bulletStyle, onChange]
  );

  const handleFontChange = useCallback(
    (font: string | number) => {
      const strValue = String(font).trim();
      updateField("font", strValue === "" ? undefined : (strValue as TextTypeface));
    },
    [updateField]
  );

  const currentBulletType = value?.bullet.type ?? "none";
  const isNone = currentBulletType === "none";

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Bullet Type Section */}
      <div style={sectionStyle}>
        <FieldGroup label="Bullet Type">
          <Select
            value={currentBulletType}
            onChange={handleBulletTypeChange}
            options={bulletTypeOptions}
            disabled={disabled}
          />
        </FieldGroup>

        {/* Auto Number Options */}
        {currentBulletType === "auto" && (
          <div style={{ marginTop: "12px" }}>
            <FieldRow>
              <FieldGroup label="Number Style" style={fieldStyle}>
                <Select
                  value={(bulletStyle.bullet as AutoNumberBullet).scheme}
                  onChange={handleAutoSchemeChange}
                  options={autoNumberSchemes}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Start At" style={{ minWidth: "80px" }}>
                <Input
                  type="number"
                  value={(bulletStyle.bullet as AutoNumberBullet).startAt ?? 1}
                  onChange={handleAutoStartAtChange}
                  min={1}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
          </div>
        )}

        {/* Char Bullet Options */}
        {currentBulletType === "char" && (
          <div style={{ marginTop: "12px" }}>
            <FieldRow>
              <FieldGroup label="Character" style={fieldStyle}>
                <Select
                  value={(bulletStyle.bullet as CharBullet).char}
                  onChange={handleCharChange}
                  options={commonBulletChars}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Custom" style={{ minWidth: "60px" }}>
                <Input
                  type="text"
                  value={(bulletStyle.bullet as CharBullet).char}
                  onChange={(v) => handleCharChange(String(v))}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
          </div>
        )}

        {/* Blip Bullet (read-only) */}
        {currentBulletType === "blip" && (
          <div style={{ marginTop: "12px" }}>
            <FieldGroup label="Resource ID">
              <Input
                type="text"
                value={(bulletStyle.bullet as { resourceId: string }).resourceId}
                onChange={() => {}}
                disabled={true}
              />
            </FieldGroup>
          </div>
        )}
      </div>

      {/* Color Section */}
      {!isNone && (
        <div style={sectionStyle}>
          <FieldGroup label="Color">
            <div style={toggleRowStyle}>
              <Toggle
                checked={bulletStyle.colorFollowText}
                onChange={(v) => updateField("colorFollowText", v)}
                label="Follow Text"
                disabled={disabled}
              />
            </div>
            {!bulletStyle.colorFollowText && (
              <div style={{ marginTop: "12px" }}>
                <ColorEditor
                  value={bulletStyle.color ?? createDefaultColor("000000")}
                  onChange={handleColorChange}
                  disabled={disabled}
                  showTransform={false}
                />
              </div>
            )}
          </FieldGroup>
        </div>
      )}

      {/* Advanced Section Toggle */}
      {!isNone && showAdvanced && (
        <>
          <Button
            variant="ghost"
            onClick={() => setAdvancedExpanded(!advancedExpanded)}
            disabled={disabled}
            style={{ alignSelf: "flex-start" }}
          >
            {advancedExpanded ? "− Hide Advanced" : "+ Show Advanced"}
          </Button>

          {advancedExpanded && (
            <>
              {/* Size Section */}
              <div style={sectionStyle}>
                <FieldGroup label="Size">
                  <div style={toggleRowStyle}>
                    <Toggle
                      checked={bulletStyle.sizeFollowText}
                      onChange={(v) => updateField("sizeFollowText", v)}
                      label="Follow Text"
                      disabled={disabled}
                    />
                  </div>
                  {!bulletStyle.sizeFollowText && (
                    <div style={{ marginTop: "12px" }}>
                      <FieldRow>
                        <FieldGroup label="Percent" style={fieldStyle}>
                          <PercentEditor
                            value={bulletStyle.sizePercent ?? pct(100)}
                            onChange={handleSizePercentChange}
                            disabled={disabled || bulletStyle.sizePoints !== undefined}
                            min={25}
                            max={400}
                          />
                        </FieldGroup>
                        <FieldGroup label="Points" style={fieldStyle}>
                          <PointsEditor
                            value={bulletStyle.sizePoints ?? pt(12)}
                            onChange={handleSizePointsChange}
                            disabled={disabled || bulletStyle.sizePercent !== undefined}
                            min={1}
                            max={999}
                          />
                        </FieldGroup>
                      </FieldRow>
                    </div>
                  )}
                </FieldGroup>
              </div>

              {/* Font Section */}
              <div style={sectionStyle}>
                <FieldGroup label="Font">
                  <div style={toggleRowStyle}>
                    <Toggle
                      checked={bulletStyle.fontFollowText}
                      onChange={(v) => updateField("fontFollowText", v)}
                      label="Follow Text"
                      disabled={disabled}
                    />
                  </div>
                  {!bulletStyle.fontFollowText && (
                    <div style={{ marginTop: "12px" }}>
                      <Input
                        type="text"
                        value={bulletStyle.font ?? ""}
                        onChange={handleFontChange}
                        placeholder="Font name"
                        disabled={disabled}
                      />
                    </div>
                  )}
                </FieldGroup>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export { createDefaultBulletStyle };
