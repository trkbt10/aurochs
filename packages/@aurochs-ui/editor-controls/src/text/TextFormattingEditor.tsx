/**
 * @file TextFormattingEditor - Shared text run formatting editor
 *
 * High-level composite editor for character-level text formatting.
 * Format-specific packages provide adapters and slots for custom UI.
 * Layout based on PPTX MixedRunPropertiesEditor.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { Input, ToggleButton } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import type { TextFormatting, TextFormattingFeatures } from "./types";
import type { MixedContext } from "../mixed-state";
import { isMixedField } from "../mixed-state";

// =============================================================================
// Types
// =============================================================================

export type TextFormattingEditorProps = {
  readonly value: TextFormatting;
  readonly onChange: (update: Partial<TextFormatting>) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly features?: TextFormattingFeatures;
  readonly mixed?: MixedContext;
  /** Slot: format-specific color picker (replaces default hex input). */
  readonly renderColorPicker?: (props: {
    value: string | undefined;
    onChange: (hex: string) => void;
    disabled?: boolean;
  }) => ReactNode;
  /** Slot: format-specific highlight color picker. */
  readonly renderHighlightPicker?: (props: {
    value: string | undefined;
    onChange: (hex: string) => void;
    disabled?: boolean;
  }) => ReactNode;
  /** Slot: format-specific font family selector. */
  readonly renderFontFamilySelect?: (props: {
    value: string | undefined;
    onChange: (family: string) => void;
    disabled?: boolean;
    placeholder?: string;
  }) => ReactNode;
  /** Slot: format-specific extra controls (PPTX caps, underline styles, spacing, etc.). */
  readonly renderExtras?: () => ReactNode;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, rgba(255, 255, 255, 0.06))",
  margin: "4px 0",
};

// =============================================================================
// Helpers
// =============================================================================

const MIXED_PLACEHOLDER = "Mixed";

function toBareHex(color: string | undefined, fallback: string): string {
  if (!color) {
    return fallback;
  }
  return color.startsWith("#") ? color.slice(1) : color;
}

function buildFontFamilySelect(opts: {
  renderSlot: TextFormattingEditorProps["renderFontFamilySelect"];
  value: string | undefined;
  onChange: (family: string) => void;
  disabled?: boolean;
  placeholder: string;
}): ReactNode {
  if (opts.renderSlot) {
    return opts.renderSlot({ value: opts.value, onChange: opts.onChange, disabled: opts.disabled, placeholder: opts.placeholder });
  }
  return (
    <Input
      type="text"
      value={opts.value ?? ""}
      onChange={(v) => opts.onChange(String(v))}
      disabled={opts.disabled}
      placeholder={opts.placeholder}
    />
  );
}

function buildColorPicker(opts: {
  renderSlot: TextFormattingEditorProps["renderColorPicker"] | TextFormattingEditorProps["renderHighlightPicker"];
  color: string | undefined;
  onChange: (hex: string) => void;
  disabled?: boolean;
  fallbackHex: string;
}): ReactNode {
  if (opts.renderSlot) {
    return opts.renderSlot({ value: opts.color, onChange: opts.onChange, disabled: opts.disabled });
  }
  return (
    <ColorPickerPopover
      value={toBareHex(opts.color, opts.fallbackHex)}
      onChange={(hex) => opts.onChange(`#${hex}`)}
      disabled={opts.disabled}
    />
  );
}

function feat(
  features: TextFormattingFeatures | undefined,
  key: keyof TextFormattingFeatures,
  defaultValue = true,
): boolean {
  return features?.[key] ?? defaultValue;
}

// =============================================================================
// Component
// =============================================================================

/** Shared text run formatting editor with slots for format-specific controls. */
export function TextFormattingEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  features,
  mixed,
  renderColorPicker,
  renderHighlightPicker,
  renderFontFamilySelect,
  renderExtras,
}: TextFormattingEditorProps) {
  // Font handlers
  const handleFontFamilyChange = useCallback(
    (family: string) => {
      onChange({ fontFamily: family || undefined });
    },
    [onChange],
  );

  const handleFontSizeChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num) && num > 0) {
        onChange({ fontSize: num });
      }
    },
    [onChange],
  );

  // Toggle handlers
  const handleBoldToggle = useCallback((pressed: boolean) => onChange({ bold: pressed || undefined }), [onChange]);

  const handleItalicToggle = useCallback((pressed: boolean) => onChange({ italic: pressed || undefined }), [onChange]);

  const handleUnderlineToggle = useCallback(
    (pressed: boolean) => onChange({ underline: pressed || undefined }),
    [onChange],
  );

  const handleStrikethroughToggle = useCallback(
    (pressed: boolean) => onChange({ strikethrough: pressed || undefined }),
    [onChange],
  );

  // Color handlers
  const handleTextColorChange = useCallback((hex: string) => onChange({ textColor: hex }), [onChange]);

  const handleHighlightColorChange = useCallback((hex: string) => onChange({ highlightColor: hex }), [onChange]);

  // Super/subscript handlers
  const handleSuperscriptToggle = useCallback(
    (pressed: boolean) => {
      onChange({ superscript: pressed || undefined, subscript: pressed ? undefined : value.subscript });
    },
    [onChange, value.subscript],
  );

  const handleSubscriptToggle = useCallback(
    (pressed: boolean) => {
      onChange({ subscript: pressed || undefined, superscript: pressed ? undefined : value.superscript });
    },
    [onChange, value.superscript],
  );

  const showFontFamily = feat(features, "showFontFamily");
  const showFontSize = feat(features, "showFontSize");
  const showBold = feat(features, "showBold");
  const showItalic = feat(features, "showItalic");
  const showUnderline = feat(features, "showUnderline");
  const showStrikethrough = feat(features, "showStrikethrough");
  const showTextColor = feat(features, "showTextColor");
  const showHighlight = feat(features, "showHighlight", false);
  const showSuperSubscript = feat(features, "showSuperSubscript", false);

  const hasToggles = showBold || showItalic || showUnderline || showStrikethrough;
  const hasColorRow = showTextColor || showHighlight;

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Row 1: Font Family + Font Size */}
      {(showFontFamily || showFontSize) && (
        <FieldRow>
          {showFontFamily && (
            <FieldGroup label="Font" inline labelWidth={36} style={{ flex: 1 }}>
              {buildFontFamilySelect({
                renderSlot: renderFontFamilySelect,
                value: value.fontFamily,
                onChange: handleFontFamilyChange,
                disabled,
                placeholder: isMixedField(mixed, "fontFamily") ? MIXED_PLACEHOLDER : "Font Family",
              })}
            </FieldGroup>
          )}
          {showFontSize && (
            <FieldGroup
              label={isMixedField(mixed, "fontSize") ? "Size (Mixed)" : "Size"}
              inline
              labelWidth={isMixedField(mixed, "fontSize") ? 72 : 32}
              style={{ width: isMixedField(mixed, "fontSize") ? "130px" : "90px" }}
            >
              <Input
                type="number"
                value={isMixedField(mixed, "fontSize") ? "" : (value.fontSize ?? "")}
                onChange={handleFontSizeChange}
                disabled={disabled}
                placeholder={isMixedField(mixed, "fontSize") ? MIXED_PLACEHOLDER : "Size"}
                min={1}
                max={999}
                suffix="pt"
              />
            </FieldGroup>
          )}
        </FieldRow>
      )}

      {/* Row 2: B / I / U / S toggles */}
      {hasToggles && (
        <div style={rowStyle}>
          {showBold && (
            <ToggleButton
              pressed={isMixedField(mixed, "bold") ? false : (value.bold ?? false)}
              onChange={handleBoldToggle}
              label="B"
              ariaLabel={isMixedField(mixed, "bold") ? "Bold (Mixed)" : "Bold"}
              disabled={disabled}
              mixed={isMixedField(mixed, "bold")}
            />
          )}
          {showItalic && (
            <ToggleButton
              pressed={isMixedField(mixed, "italic") ? false : (value.italic ?? false)}
              onChange={handleItalicToggle}
              label="I"
              ariaLabel={isMixedField(mixed, "italic") ? "Italic (Mixed)" : "Italic"}
              disabled={disabled}
              mixed={isMixedField(mixed, "italic")}
            />
          )}
          {showUnderline && (
            <ToggleButton
              pressed={isMixedField(mixed, "underline") ? false : (value.underline ?? false)}
              onChange={handleUnderlineToggle}
              label="U"
              ariaLabel={isMixedField(mixed, "underline") ? "Underline (Mixed)" : "Underline"}
              disabled={disabled}
              mixed={isMixedField(mixed, "underline")}
              style={{ textDecoration: "underline" }}
            />
          )}
          {showStrikethrough && (
            <ToggleButton
              pressed={isMixedField(mixed, "strikethrough") ? false : (value.strikethrough ?? false)}
              onChange={handleStrikethroughToggle}
              label="S"
              ariaLabel={isMixedField(mixed, "strikethrough") ? "Strikethrough (Mixed)" : "Strikethrough"}
              disabled={disabled}
              mixed={isMixedField(mixed, "strikethrough")}
              style={{ textDecoration: "line-through" }}
            />
          )}
        </div>
      )}

      {/* Separator */}
      {hasToggles && hasColorRow && <div style={separatorStyle} />}

      {/* Row 3: Color + Highlight */}
      {hasColorRow && (
        <FieldRow>
          {showTextColor && (
            <FieldGroup
              label={isMixedField(mixed, "textColor") ? "Color (Mixed)" : "Color"}
              inline
              labelWidth={isMixedField(mixed, "textColor") ? 80 : 40}
            >
              {buildColorPicker({ renderSlot: renderColorPicker, color: value.textColor, onChange: handleTextColorChange, disabled, fallbackHex: "000000" })}
            </FieldGroup>
          )}
          {showHighlight && (
            <FieldGroup
              label={isMixedField(mixed, "highlightColor") ? "Hi (Mixed)" : "Highlight"}
              inline
              labelWidth={isMixedField(mixed, "highlightColor") ? 64 : 56}
            >
              {buildColorPicker({ renderSlot: renderHighlightPicker, color: value.highlightColor, onChange: handleHighlightColorChange, disabled, fallbackHex: "FFFF00" })}
            </FieldGroup>
          )}
        </FieldRow>
      )}

      {/* Separator */}
      {hasColorRow && showSuperSubscript && <div style={separatorStyle} />}

      {/* Row 4: Super/Subscript */}
      {showSuperSubscript && (
        <div style={rowStyle}>
          <ToggleButton
            pressed={isMixedField(mixed, "superscript") ? false : (value.superscript ?? false)}
            onChange={handleSuperscriptToggle}
            label="X\u00B2"
            ariaLabel="Superscript"
            disabled={disabled}
            mixed={isMixedField(mixed, "superscript")}
          />
          <ToggleButton
            pressed={isMixedField(mixed, "subscript") ? false : (value.subscript ?? false)}
            onChange={handleSubscriptToggle}
            label="X\u2082"
            ariaLabel="Subscript"
            disabled={disabled}
            mixed={isMixedField(mixed, "subscript")}
          />
        </div>
      )}

      {/* Extras slot: format-specific controls */}
      {renderExtras?.()}
    </div>
  );
}
