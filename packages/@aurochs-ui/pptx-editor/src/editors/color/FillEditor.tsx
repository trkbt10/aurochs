/**
 * @file FillEditor - Editor for Fill union type
 *
 * Design principle: NO INTERNAL LABELS.
 * Parent provides semantic context via FieldGroup label.
 * This editor provides the editing UI only.
 * Uses design tokens for consistent styling.
 *
 * Layout: [Swatch] [Type Select] [Type-specific controls]
 */

import { useCallback, type CSSProperties, type ChangeEvent } from "react";
import { Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldRow } from "@aurochs-ui/ui-components/layout";
import { FillPickerPopover, ColorPickerPopover, FillPreview } from "@aurochs-ui/color-editor";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { createDefaultColor } from "./ColorEditor";
import { GradientStopsEditor, createDefaultGradientStops } from "./GradientStopsEditor";
import { DegreesEditor } from "../primitives/DegreesEditor";
import { colorTokens, fontTokens, radiusTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type {
  NoFill,
  SolidFill,
  GradientFill,
  PatternFill,
  PatternType,
  LinearGradient,
} from "@aurochs-office/drawing-ml/domain/fill";
import { PATTERN_PRESETS } from "@aurochs-office/drawing-ml/domain/fill";
import type { Fill, BlipFill } from "@aurochs-office/pptx/domain/color/types";
import { deg } from "@aurochs-office/drawing-ml/domain/units";
import type { ResourceId } from "@aurochs-office/pptx/domain/types";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { useEditorResourceContext } from "../../context/editor/EditorResourceContext";

// =============================================================================
// Types
// =============================================================================

export type FillEditorProps = EditorProps<Fill> & {
  readonly style?: CSSProperties;
  /** Limit fill types shown */
  readonly allowedTypes?: readonly Fill["type"][];
  /** Compact mode: single swatch with popover */
  readonly compact?: boolean;
};

type FillType = Fill["type"];

// =============================================================================
// Options
// =============================================================================

const allFillTypeOptions: SelectOption<FillType>[] = [
  { value: "noFill", label: "None" },
  { value: "solidFill", label: "Solid" },
  { value: "gradientFill", label: "Gradient" },
  { value: "patternFill", label: "Pattern" },
  { value: "blipFill", label: "Image" },
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

function createDefaultFill(type: FillType): Fill {
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
    case "blipFill":
      return {
        type: "blipFill",
        resourceId: "" as ResourceId,
        relationshipType: "embed",
        rotWithShape: true,
      };
    default:
      return { type: "noFill" };
  }
}

function getFilteredFillOptions(allowedTypes?: readonly Fill["type"][]): SelectOption<FillType>[] {
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

const imageSelectLabelStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.md,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const imagePreviewContainerStyle: CSSProperties = {
  width: "100%",
  height: "60px",
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderRadius: radiusTokens.sm,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
};

const imagePreviewStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Fill editor without internal labels.
 * Parent wraps with FieldGroup to provide context label.
 */
export function FillEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  allowedTypes,
  compact = false,
}: FillEditorProps) {
  const fillTypeOptions = getFilteredFillOptions(allowedTypes);

  // Compact mode: single popover (only for BaseFill-compatible types)
  if (compact) {
    // FillPickerPopover only supports BaseFill types (noFill, solidFill, gradientFill, patternFill, groupFill)
    // BlipFill is PPTX-specific and not supported
    if (value.type === "blipFill") {
      // Show a static preview for unsupported types
      const previewStyle: CSSProperties = {
        width: "24px",
        height: "24px",
        borderRadius: radiusTokens.sm,
        border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
        backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
        opacity: disabled ? 0.5 : 1,
      };
      return <div style={previewStyle} title="Image fill (not editable)" />;
    }
    return <FillPickerPopover value={value as BaseFill} onChange={onChange} disabled={disabled} />;
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
          <FillPickerPopover value={value as BaseFill} onChange={onChange} disabled={disabled} />
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

  // Blip Fill (Image)
  if (value.type === "blipFill") {
    return (
      <BlipFillEditor
        value={value as BlipFill}
        onChange={onChange}
        onTypeChange={handleTypeChange}
        fillTypeOptions={fillTypeOptions}
        disabled={disabled}
        className={className}
        style={style}
      />
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

// =============================================================================
// BlipFillEditor (Image Fill)
// =============================================================================

type BlipFillEditorProps = {
  readonly value: BlipFill;
  readonly onChange: (fill: Fill) => void;
  readonly onTypeChange: (type: string) => void;
  readonly fillTypeOptions: SelectOption<FillType>[];
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
};

/**
 * Separated component for BlipFill editing.
 * Uses EditorResourceContext to manage uploaded images.
 */
function BlipFillEditor({
  value: blipFill,
  onChange,
  onTypeChange,
  fillTypeOptions,
  disabled,
  className,
  style,
}: BlipFillEditorProps) {
  const { store, registerUpload } = useEditorResourceContext();
  const hasImage = blipFill.resourceId !== "";

  // Get the preview URL from resource store
  const previewUrl = hasImage ? store.toDataUrl(blipFill.resourceId) : undefined;

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      // Register the uploaded file to ResourceStore and get the resourceId
      const resourceId = await registerUpload(file);
      onChange({
        ...blipFill,
        resourceId,
      });
    },
    [blipFill, onChange, registerUpload],
  );

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <div style={rowStyle}>
        <Select
          value={blipFill.type}
          onChange={onTypeChange}
          options={fillTypeOptions}
          disabled={disabled}
          style={typeSelectStyle}
        />
        <label style={imageSelectLabelStyle}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled}
            style={{ display: "none" }}
          />
          {hasImage ? "Change Image" : "Select Image"}
        </label>
        <Toggle
          checked={blipFill.rotWithShape}
          onChange={(checked) => onChange({ ...blipFill, rotWithShape: checked })}
          disabled={disabled}
        />
        <span style={{ fontSize: fontTokens.size.sm, color: `var(--text-tertiary, ${colorTokens.text.tertiary})` }}>
          Rotate
        </span>
      </div>
      {previewUrl && (
        <div style={imagePreviewContainerStyle}>
          <img src={previewUrl} alt="Fill preview" style={imagePreviewStyle} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

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
