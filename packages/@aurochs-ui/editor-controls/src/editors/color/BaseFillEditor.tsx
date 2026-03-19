/**
 * @file BaseFillEditor - Editor for BaseFill types (noFill, solidFill, gradientFill, patternFill)
 *
 * Format-agnostic fill editor. Supports extension via FillTypeExtension for
 * format-specific fill types (e.g., blipFill in PPTX).
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldRow } from "@aurochs-ui/ui-components/layout";
import { FillPickerPopover, ColorPickerPopover } from "@aurochs-ui/color-editor";
import type { BaseFill, SolidFill, GradientFill, PatternFill, LinearGradient, NoFill } from "@aurochs-office/drawing-ml/domain/fill";
import { deg } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { createDefaultColor } from "./ColorEditor";
import { GradientStopsEditor, createDefaultGradientStops } from "./GradientStopsEditor";
import { DegreesEditor } from "../primitives/DegreesEditor";
import { patternPresetOptions } from "./color-options";

// =============================================================================
// Types
// =============================================================================

/** Props passed to FillTypeExtension.renderEditor */
export type ExtensionRenderProps = {
  readonly value: BaseFill;
  readonly onChange: (fill: BaseFill) => void;
  readonly onTypeChange: (type: string) => void;
  readonly fillTypeOptions: SelectOption<string>[];
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
};

/**
 * Extension descriptor for custom fill types (e.g., blipFill).
 * Allows format-specific editors to add fill types to BaseFillEditor via composition.
 */
export type FillTypeExtension = {
  readonly typeOption: SelectOption<string>;
  readonly createDefault: () => BaseFill;
  readonly renderEditor: (props: ExtensionRenderProps) => ReactNode;
  readonly renderCompactPreview?: (props: { value: BaseFill; disabled?: boolean }) => ReactNode;
};

export type BaseFillEditorProps = EditorProps<BaseFill> & {
  readonly style?: CSSProperties;
  /** Limit fill types shown */
  readonly allowedTypes?: readonly BaseFill["type"][];
  /** Compact mode: single swatch with popover */
  readonly compact?: boolean;
  /** Custom fill type extensions (e.g., blipFill for PPTX) */
  readonly extensions?: readonly FillTypeExtension[];
};

type FillType = BaseFill["type"];

// =============================================================================
// Options
// =============================================================================

const baseFillTypeOptions: SelectOption<FillType>[] = [
  { value: "noFill", label: "None" },
  { value: "solidFill", label: "Solid" },
  { value: "gradientFill", label: "Gradient" },
  { value: "patternFill", label: "Pattern" },
];

// =============================================================================
// Utilities
// =============================================================================

function createDefaultFill(type: FillType, extensions?: readonly FillTypeExtension[]): BaseFill {
  // Check extensions first
  const ext = extensions?.find((e) => e.typeOption.value === type);
  if (ext) {
    return ext.createDefault();
  }

  switch (type) {
    case "noFill":
      return { type: "noFill" };
    case "solidFill":
      return { type: "solidFill", color: createDefaultColor("000000") };
    case "gradientFill":
      return {
        type: "gradientFill",
        stops: createDefaultGradientStops(),
        linear: { angle: deg(90), scaled: true },
        rotWithShape: true,
      };
    case "patternFill":
      return {
        type: "patternFill",
        preset: "pct50",
        foregroundColor: createDefaultColor("000000"),
        backgroundColor: createDefaultColor("FFFFFF"),
      };
    case "groupFill":
      return { type: "groupFill" };
    default:
      return { type: "noFill" };
  }
}

function getAllFillTypeOptions(extensions?: readonly FillTypeExtension[]): SelectOption<string>[] {
  if (!extensions || extensions.length === 0) {
    return baseFillTypeOptions;
  }
  return [...baseFillTypeOptions, ...extensions.map((e) => e.typeOption)];
}

function getFilteredFillOptions(
  allowedTypes: readonly BaseFill["type"][] | undefined,
  extensions?: readonly FillTypeExtension[],
): SelectOption<string>[] {
  const all = getAllFillTypeOptions(extensions);
  if (!allowedTypes) {
    return all;
  }
  return all.filter((opt) => allowedTypes.includes(opt.value as FillType));
}

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacingTokens.sm,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const typeSelectStyle: CSSProperties = {
  width: "90px",
  flexShrink: 0,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Base fill editor for format-agnostic fill types.
 * Supports noFill, solidFill, gradientFill, and patternFill.
 */
export function BaseFillEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  allowedTypes,
  compact = false,
  extensions,
}: BaseFillEditorProps) {
  const fillTypeOptions = getFilteredFillOptions(allowedTypes, extensions);

  // Compact mode: single popover
  if (compact) {
    // Check if an extension handles compact preview for this fill type
    const ext = extensions?.find((e) => e.typeOption.value === value.type);
    if (ext?.renderCompactPreview) {
      return <>{ext.renderCompactPreview({ value, disabled })}</>;
    }
    return <FillPickerPopover value={value} onChange={onChange} disabled={disabled} />;
  }

  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createDefaultFill(newType as FillType, extensions));
    },
    [onChange, extensions],
  );

  // No Fill
  if (value.type === "noFill") {
    return (
      <div className={className} style={style}>
        <Select
          value={value.type}
          onChange={handleTypeChange}
          options={fillTypeOptions}
          disabled={disabled}
          style={typeSelectStyle}
        />
      </div>
    );
  }

  // Solid Fill: [Swatch] [Type]
  if (value.type === "solidFill") {
    const solidFill = value as SolidFill;
    const hex = solidFill.color.spec.type === "srgb" ? solidFill.color.spec.value : "000000";

    return (
      <div className={className} style={style}>
        <div style={rowStyle}>
          <ColorPickerPopover
            value={hex}
            onChange={(newHex) => onChange({ ...solidFill, color: createDefaultColor(newHex) })}
            disabled={disabled}
          />
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            disabled={disabled}
            style={typeSelectStyle}
          />
        </div>
      </div>
    );
  }

  // Gradient Fill
  if (value.type === "gradientFill") {
    const gradientFill = value as GradientFill;
    const angle = gradientFill.linear?.angle ?? 0;

    return (
      <div className={className} style={{ ...containerStyle, ...style }}>
        <div style={rowStyle}>
          <FillPickerPopover value={value} onChange={onChange} disabled={disabled} />
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            disabled={disabled}
            style={typeSelectStyle}
          />
          <DegreesEditor
            value={deg(angle)}
            onChange={(a) =>
              onChange({
                ...gradientFill,
                linear: { ...(gradientFill.linear ?? { scaled: true }), angle: a } as LinearGradient,
              })
            }
            disabled={disabled}
          />
        </div>
        <GradientStopsEditor
          value={gradientFill.stops}
          onChange={(stops) => onChange({ ...gradientFill, stops })}
          disabled={disabled}
        />
      </div>
    );
  }

  // Pattern Fill
  if (value.type === "patternFill") {
    const patternFill = value as PatternFill;
    const fgHex = patternFill.foregroundColor.spec.type === "srgb" ? patternFill.foregroundColor.spec.value : "000000";
    const bgHex = patternFill.backgroundColor.spec.type === "srgb" ? patternFill.backgroundColor.spec.value : "FFFFFF";

    return (
      <div className={className} style={style}>
        <div style={rowStyle}>
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            disabled={disabled}
            style={typeSelectStyle}
          />
          <Select
            value={patternFill.preset}
            onChange={(preset) => onChange({ ...patternFill, preset })}
            options={patternPresetOptions}
            disabled={disabled}
            style={{ flex: 1 }}
          />
        </div>
        <FieldRow gap={8} style={{ marginTop: "8px" }}>
          <ColorPickerPopover
            value={fgHex}
            onChange={(hex) => onChange({ ...patternFill, foregroundColor: createDefaultColor(hex) })}
            disabled={disabled}
          />
          <ColorPickerPopover
            value={bgHex}
            onChange={(hex) => onChange({ ...patternFill, backgroundColor: createDefaultColor(hex) })}
            disabled={disabled}
          />
          <span style={{ fontSize: fontTokens.size.sm, color: `var(--text-tertiary, ${colorTokens.text.tertiary})` }}>
            FG / BG
          </span>
        </FieldRow>
      </div>
    );
  }

  // Extension types
  const matchedExtension = extensions?.find((ext) => ext.typeOption.value === value.type);
  if (matchedExtension) {
    return (
      <>
        {matchedExtension.renderEditor({
          value,
          onChange,
          onTypeChange: handleTypeChange,
          fillTypeOptions,
          disabled,
          className,
          style,
        })}
      </>
    );
  }

  // Fallback (groupFill, unknown)
  return (
    <div className={className} style={style}>
      <Select
        value={value.type}
        onChange={handleTypeChange}
        options={fillTypeOptions}
        disabled={disabled}
        style={typeSelectStyle}
      />
    </div>
  );
}

/**
 * Create a solid fill with the provided hex color.
 */
export function createDefaultSolidFill(hex: string = "000000"): SolidFill {
  return {
    type: "solidFill",
    color: createDefaultColor(hex),
  };
}

/**
 * Create a no-fill definition.
 */
export function createNoFill(): NoFill {
  return { type: "noFill" };
}
