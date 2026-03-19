/**
 * @file BaseFillEditor - Editor for BaseFill types (noFill, solidFill, gradientFill, patternFill)
 *
 * Format-agnostic fill editor without image/blipFill support.
 * For image fills, use the format-specific FillEditor (e.g., pptx-editor's FillEditor).
 */

import { useCallback, type CSSProperties } from "react";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldRow } from "@aurochs-ui/ui-components/layout";
import { FillPickerPopover, ColorPickerPopover } from "@aurochs-ui/color-editor";
import type { BaseFill, SolidFill, GradientFill, PatternFill, PatternType, LinearGradient, NoFill } from "@aurochs-office/drawing-ml/domain/fill";
import { PATTERN_PRESETS } from "@aurochs-office/drawing-ml/domain/fill";
import { deg } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { createDefaultColor } from "./ColorEditor";
import { GradientStopsEditor, createDefaultGradientStops } from "./GradientStopsEditor";
import { DegreesEditor } from "../primitives/DegreesEditor";

// =============================================================================
// Types
// =============================================================================

export type BaseFillEditorProps = EditorProps<BaseFill> & {
  readonly style?: CSSProperties;
  /** Limit fill types shown */
  readonly allowedTypes?: readonly BaseFill["type"][];
  /** Compact mode: single swatch with popover */
  readonly compact?: boolean;
};

type FillType = BaseFill["type"];

// =============================================================================
// Options
// =============================================================================

const allFillTypeOptions: SelectOption<FillType>[] = [
  { value: "noFill", label: "None" },
  { value: "solidFill", label: "Solid" },
  { value: "gradientFill", label: "Gradient" },
  { value: "patternFill", label: "Pattern" },
];

const PATTERN_LABELS: Record<PatternType, string> = {
  pct5: "5%",
  pct10: "10%",
  pct20: "20%",
  pct25: "25%",
  pct30: "30%",
  pct40: "40%",
  pct50: "50%",
  pct60: "60%",
  pct70: "70%",
  pct75: "75%",
  pct80: "80%",
  pct90: "90%",
  horz: "Horizontal",
  vert: "Vertical",
  ltHorz: "Light Horz",
  ltVert: "Light Vert",
  dkHorz: "Dark Horz",
  dkVert: "Dark Vert",
  narHorz: "Narrow Horz",
  narVert: "Narrow Vert",
  dashHorz: "Dash Horz",
  dashVert: "Dash Vert",
  cross: "Cross",
  dnDiag: "Down Diag",
  upDiag: "Up Diag",
  ltDnDiag: "Lt Down Diag",
  ltUpDiag: "Lt Up Diag",
  dkDnDiag: "Dk Down Diag",
  dkUpDiag: "Dk Up Diag",
  wdDnDiag: "Wide Down Diag",
  wdUpDiag: "Wide Up Diag",
  dashDnDiag: "Dash Down Diag",
  dashUpDiag: "Dash Up Diag",
  diagCross: "Diag Cross",
  smCheck: "Sm Check",
  lgCheck: "Lg Check",
  smGrid: "Sm Grid",
  lgGrid: "Lg Grid",
  dotGrid: "Dot Grid",
  smConfetti: "Sm Confetti",
  lgConfetti: "Lg Confetti",
  horzBrick: "Horz Brick",
  diagBrick: "Diag Brick",
  solidDmnd: "Solid Diamond",
  openDmnd: "Open Diamond",
  dotDmnd: "Dot Diamond",
  plaid: "Plaid",
  sphere: "Sphere",
  weave: "Weave",
  divot: "Divot",
  shingle: "Shingle",
  wave: "Wave",
  trellis: "Trellis",
  zigZag: "Zig Zag",
};

const patternPresetOptions: SelectOption<PatternType>[] = PATTERN_PRESETS.map((preset) => ({
  value: preset,
  label: PATTERN_LABELS[preset],
}));

// =============================================================================
// Utilities
// =============================================================================

function createDefaultFill(type: FillType): BaseFill {
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

function getFilteredFillOptions(allowedTypes?: readonly BaseFill["type"][]): SelectOption<FillType>[] {
  if (!allowedTypes) {
    return allFillTypeOptions;
  }
  return allFillTypeOptions.filter((opt) => allowedTypes.includes(opt.value));
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
}: BaseFillEditorProps) {
  const fillTypeOptions = getFilteredFillOptions(allowedTypes);

  // Compact mode: single popover
  if (compact) {
    return <FillPickerPopover value={value} onChange={onChange} disabled={disabled} />;
  }

  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createDefaultFill(newType as FillType));
    },
    [onChange],
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

  // Fallback
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
