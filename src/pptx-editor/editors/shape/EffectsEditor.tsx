/**
 * @file EffectsEditor - Editor for Effects type
 *
 * Edits all ECMA-376 effect types.
 * @see ECMA-376 Part 1, Section 20.1.8 (Effect)
 */

import React, { useCallback } from "react";
import { Input, Select, Toggle } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PixelsEditor } from "../primitives/PixelsEditor";
import { DegreesEditor } from "../primitives/DegreesEditor";
import { PercentEditor } from "../primitives/PercentEditor";
import { ColorEditor, createDefaultColor } from "../color/ColorEditor";
import {
  px,
  deg,
  pct,
  type Effects,
  type ShadowEffect,
  type GlowEffect,
  type ReflectionEffect,
  type SoftEdgeEffect,
  type AlphaBiLevelEffect,
  type AlphaCeilingEffect,
  type AlphaFloorEffect,
  type AlphaInverseEffect,
  type AlphaModulateEffect,
  type AlphaModulateFixedEffect,
  type AlphaOutsetEffect,
  type AlphaReplaceEffect,
  type BiLevelEffect,
  type BlendEffect,
  type BlendMode,
  type ColorChangeEffect,
  type ColorReplaceEffect,
  type DuotoneEffect,
  type FillOverlayEffect,
  type FillEffectType,
  type GrayscaleEffect,
  type PresetShadowEffect,
  type PresetShadowValue,
  type RelativeOffsetEffect,
  type EffectContainer,
  type EffectContainerType,
} from "../../../pptx/domain/types";
import type { Color } from "../../../pptx/domain/color";
import type { EditorProps, SelectOption } from "../../types";

export type EffectsEditorProps = EditorProps<Effects>;

const fieldStyle = { flex: 1 };

// =============================================================================
// Option Constants
// =============================================================================

const shadowTypeOptions: SelectOption<ShadowEffect["type"]>[] = [
  { value: "outer", label: "Outer Shadow" },
  { value: "inner", label: "Inner Shadow" },
];

const shadowAlignmentOptions: SelectOption<string>[] = [
  { value: "tl", label: "Top Left" },
  { value: "t", label: "Top" },
  { value: "tr", label: "Top Right" },
  { value: "l", label: "Left" },
  { value: "ctr", label: "Center" },
  { value: "r", label: "Right" },
  { value: "bl", label: "Bottom Left" },
  { value: "b", label: "Bottom" },
  { value: "br", label: "Bottom Right" },
];

const blendModeOptions: SelectOption<BlendMode>[] = [
  { value: "over", label: "Over" },
  { value: "mult", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
];

const fillEffectTypeOptions: SelectOption<FillEffectType>[] = [
  { value: "solidFill", label: "Solid Fill" },
  { value: "gradFill", label: "Gradient Fill" },
  { value: "blipFill", label: "Image Fill" },
  { value: "pattFill", label: "Pattern Fill" },
  { value: "grpFill", label: "Group Fill" },
];

const presetShadowOptions: SelectOption<PresetShadowValue>[] = Array.from(
  { length: 20 },
  (_, i) => ({
    value: `shdw${i + 1}` as PresetShadowValue,
    label: `Preset Shadow ${i + 1}`,
  })
);

// =============================================================================
// Default Value Creators
// =============================================================================

function createDefaultShadow(): ShadowEffect {
  return {
    type: "outer",
    color: createDefaultColor("000000"),
    blurRadius: px(4),
    distance: px(4),
    direction: deg(45),
  };
}

function createDefaultGlow(): GlowEffect {
  return {
    color: createDefaultColor("FFD700"),
    radius: px(8),
  };
}

function createDefaultReflection(): ReflectionEffect {
  return {
    blurRadius: px(0),
    startOpacity: pct(50),
    endOpacity: pct(0),
    distance: px(0),
    direction: deg(90),
    fadeDirection: deg(90),
    scaleX: pct(100),
    scaleY: pct(-100),
  };
}

function createDefaultSoftEdge(): SoftEdgeEffect {
  return { radius: px(4) };
}

function createDefaultAlphaBiLevel(): AlphaBiLevelEffect {
  return { threshold: pct(50) };
}

function createDefaultAlphaCeiling(): AlphaCeilingEffect {
  return { type: "alphaCeiling" };
}

function createDefaultAlphaFloor(): AlphaFloorEffect {
  return { type: "alphaFloor" };
}

function createDefaultAlphaInv(): AlphaInverseEffect {
  return { type: "alphaInv" };
}

function createDefaultAlphaMod(): AlphaModulateEffect {
  return { type: "alphaMod" };
}

function createDefaultAlphaModFix(): AlphaModulateFixedEffect {
  return { amount: pct(100) };
}

function createDefaultAlphaOutset(): AlphaOutsetEffect {
  return { radius: px(0) };
}

function createDefaultAlphaRepl(): AlphaReplaceEffect {
  return { alpha: pct(100) };
}

function createDefaultBiLevel(): BiLevelEffect {
  return { threshold: pct(50) };
}

function createDefaultBlend(): BlendEffect {
  return { type: "blend", blend: "over" };
}

function createDefaultColorChange(): ColorChangeEffect {
  return {
    from: createDefaultColor("000000"),
    to: createDefaultColor("FFFFFF"),
    useAlpha: false,
  };
}

function createDefaultColorReplace(): ColorReplaceEffect {
  return { color: createDefaultColor("000000") };
}

function createDefaultDuotone(): DuotoneEffect {
  return {
    colors: [createDefaultColor("000000"), createDefaultColor("FFFFFF")],
  };
}

function createDefaultFillOverlay(): FillOverlayEffect {
  return { blend: "over", fillType: "solidFill" };
}

function createDefaultGrayscale(): GrayscaleEffect {
  return { type: "grayscl" };
}

function createDefaultPresetShadow(): PresetShadowEffect {
  return {
    type: "preset",
    preset: "shdw1",
    color: createDefaultColor("000000"),
    direction: deg(45),
    distance: px(4),
  };
}

function createDefaultRelativeOffset(): RelativeOffsetEffect {
  return { offsetX: pct(0), offsetY: pct(0) };
}

// =============================================================================
// Sub-Editors
// =============================================================================

/**
 * Shadow effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw/innerShdw)
 */
function ShadowEditor({
  value,
  onChange,
  disabled,
}: {
  value: ShadowEffect;
  onChange: (v: ShadowEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldRow>
        <FieldGroup label="Type" style={fieldStyle}>
          <Select
            value={value.type}
            onChange={(type) => onChange({ ...value, type })}
            options={shadowTypeOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Alignment" style={fieldStyle}>
          <Select
            value={value.alignment ?? "ctr"}
            onChange={(alignment) =>
              onChange({ ...value, alignment: alignment === "ctr" ? undefined : alignment })
            }
            options={shadowAlignmentOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Color">
        <ColorEditor
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldGroup label="Blur Radius">
        <PixelsEditor
          value={value.blurRadius}
          onChange={(blurRadius) => onChange({ ...value, blurRadius })}
          disabled={disabled}
          min={0}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Distance" style={fieldStyle}>
          <PixelsEditor
            value={value.distance}
            onChange={(distance) => onChange({ ...value, distance })}
            disabled={disabled}
            min={0}
          />
        </FieldGroup>
        <FieldGroup label="Direction" style={fieldStyle}>
          <DegreesEditor
            value={value.direction}
            onChange={(direction) => onChange({ ...value, direction })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Glow effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */
function GlowEditor({
  value,
  onChange,
  disabled,
}: {
  value: GlowEffect;
  onChange: (v: GlowEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Color">
        <ColorEditor
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Radius">
        <PixelsEditor
          value={value.radius}
          onChange={(radius) => onChange({ ...value, radius })}
          disabled={disabled}
          min={0}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Reflection effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
function ReflectionEditor({
  value,
  onChange,
  disabled,
}: {
  value: ReflectionEffect;
  onChange: (v: ReflectionEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Blur Radius">
        <PixelsEditor
          value={value.blurRadius}
          onChange={(blurRadius) => onChange({ ...value, blurRadius })}
          disabled={disabled}
          min={0}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Start Opacity" style={fieldStyle}>
          <PercentEditor
            value={value.startOpacity}
            onChange={(startOpacity) => onChange({ ...value, startOpacity })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="End Opacity" style={fieldStyle}>
          <PercentEditor
            value={value.endOpacity}
            onChange={(endOpacity) => onChange({ ...value, endOpacity })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Distance">
        <PixelsEditor
          value={value.distance}
          onChange={(distance) => onChange({ ...value, distance })}
          disabled={disabled}
          min={0}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Direction" style={fieldStyle}>
          <DegreesEditor
            value={value.direction}
            onChange={(direction) => onChange({ ...value, direction })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Fade Direction" style={fieldStyle}>
          <DegreesEditor
            value={value.fadeDirection}
            onChange={(fadeDirection) => onChange({ ...value, fadeDirection })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Scale X" style={fieldStyle}>
          <PercentEditor
            value={value.scaleX}
            onChange={(scaleX) => onChange({ ...value, scaleX })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Scale Y" style={fieldStyle}>
          <PercentEditor
            value={value.scaleY}
            onChange={(scaleY) => onChange({ ...value, scaleY })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Soft edge effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */
function SoftEdgeEditor({
  value,
  onChange,
  disabled,
}: {
  value: SoftEdgeEffect;
  onChange: (v: SoftEdgeEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Radius">
        <PixelsEditor
          value={value.radius}
          onChange={(radius) => onChange({ ...value, radius })}
          disabled={disabled}
          min={0}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Alpha bi-level effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.1 (alphaBiLevel)
 */
function AlphaBiLevelEditor({
  value,
  onChange,
  disabled,
}: {
  value: AlphaBiLevelEffect;
  onChange: (v: AlphaBiLevelEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Threshold">
        <PercentEditor
          value={value.threshold}
          onChange={(threshold) => onChange({ ...value, threshold })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Alpha modulate fixed effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.6 (alphaModFix)
 */
function AlphaModFixEditor({
  value,
  onChange,
  disabled,
}: {
  value: AlphaModulateFixedEffect;
  onChange: (v: AlphaModulateFixedEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Amount">
        <PercentEditor
          value={value.amount}
          onChange={(amount) => onChange({ ...value, amount })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Alpha outset effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.7 (alphaOutset)
 */
function AlphaOutsetEditor({
  value,
  onChange,
  disabled,
}: {
  value: AlphaOutsetEffect;
  onChange: (v: AlphaOutsetEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Radius">
        <PixelsEditor
          value={value.radius}
          onChange={(radius) => onChange({ ...value, radius })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Alpha replace effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.8 (alphaRepl)
 */
function AlphaReplEditor({
  value,
  onChange,
  disabled,
}: {
  value: AlphaReplaceEffect;
  onChange: (v: AlphaReplaceEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Alpha">
        <PercentEditor
          value={value.alpha}
          onChange={(alpha) => onChange({ ...value, alpha })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Bi-level effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.11 (biLevel)
 */
function BiLevelEditor({
  value,
  onChange,
  disabled,
}: {
  value: BiLevelEffect;
  onChange: (v: BiLevelEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Threshold">
        <PercentEditor
          value={value.threshold}
          onChange={(threshold) => onChange({ ...value, threshold })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

// Effect container type options
const containerTypeOptions: SelectOption<EffectContainerType>[] = [
  { value: "sib", label: "Sibling" },
  { value: "tree", label: "Tree" },
];

/**
 * Effect container sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.20 (cont)
 */
function EffectContainerEditor({
  value,
  onChange,
  disabled,
}: {
  value: EffectContainer | undefined;
  onChange: (v: EffectContainer | undefined) => void;
  disabled?: boolean;
}) {
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ type: "sib" });
    } else {
      onChange(undefined);
    }
  };

  return (
    <>
      <>
        <Toggle
          checked={!!value}
          onChange={handleToggle}
          label="Enable Container"
          disabled={disabled}
        />
        {value && (
          <>
            <FieldGroup label="Type">
              <Select
                value={value.type ?? "sib"}
                onChange={(type) => onChange({ ...value, type })}
                options={containerTypeOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Name" hint="Optional container name">
              <Input
                value={value.name ?? ""}
                onChange={(v) => onChange({ ...value, name: String(v) || undefined })}
                disabled={disabled}
                placeholder="Container name"
              />
            </FieldGroup>
          </>
        )}
      </>
    </>
  );
}

/**
 * Alpha modulate effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.5 (alphaMod)
 */
function AlphaModEditor({
  value,
  onChange,
  disabled,
}: {
  value: AlphaModulateEffect;
  onChange: (v: AlphaModulateEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Container Type">
        <Select
          value={value.containerType ?? "sib"}
          onChange={(containerType) => onChange({ ...value, containerType })}
          options={containerTypeOptions}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Name" hint="Optional effect name">
        <Input
          value={value.name ?? ""}
          onChange={(v) => onChange({ ...value, name: String(v) || undefined })}
          disabled={disabled}
          placeholder="Effect name"
        />
      </FieldGroup>
      <EffectContainerEditor
        value={value.container}
        onChange={(container) => onChange({ ...value, container })}
        disabled={disabled}
      />
    </>
  );
}

/**
 * Blend effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.12 (blend)
 */
function BlendEditor({
  value,
  onChange,
  disabled,
}: {
  value: BlendEffect;
  onChange: (v: BlendEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Blend Mode">
        <Select
          value={value.blend}
          onChange={(blend) => onChange({ ...value, blend })}
          options={blendModeOptions}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Container Type">
        <Select
          value={value.containerType ?? "sib"}
          onChange={(containerType) => onChange({ ...value, containerType })}
          options={containerTypeOptions}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Name" hint="Optional effect name">
        <Input
          value={value.name ?? ""}
          onChange={(v) => onChange({ ...value, name: String(v) || undefined })}
          disabled={disabled}
          placeholder="Effect name"
        />
      </FieldGroup>
      <EffectContainerEditor
        value={value.container}
        onChange={(container) => onChange({ ...value, container })}
        disabled={disabled}
      />
    </>
  );
}

/**
 * Color change effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.16 (clrChange)
 */
function ColorChangeEditor({
  value,
  onChange,
  disabled,
}: {
  value: ColorChangeEffect;
  onChange: (v: ColorChangeEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="From Color">
        <ColorEditor
          value={value.from}
          onChange={(from) => onChange({ ...value, from })}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="To Color">
        <ColorEditor
          value={value.to}
          onChange={(to) => onChange({ ...value, to })}
          disabled={disabled}
        />
      </FieldGroup>
      <Toggle
        checked={value.useAlpha}
        onChange={(useAlpha) => onChange({ ...value, useAlpha })}
        label="Use Alpha"
        disabled={disabled}
      />
    </>
  );
}

/**
 * Color replace effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.18 (clrRepl)
 */
function ColorReplaceEditor({
  value,
  onChange,
  disabled,
}: {
  value: ColorReplaceEffect;
  onChange: (v: ColorReplaceEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Color">
        <ColorEditor
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Duotone effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.23 (duotone)
 */
function DuotoneEditor({
  value,
  onChange,
  disabled,
}: {
  value: DuotoneEffect;
  onChange: (v: DuotoneEffect) => void;
  disabled?: boolean;
}) {
  const handleColorChange = (index: 0 | 1, color: Color) => {
    const colors: [Color, Color] =
      index === 0 ? [color, value.colors[1]] : [value.colors[0], color];
    onChange({ ...value, colors });
  };

  return (
    <>
      <FieldGroup label="Color 1">
        <ColorEditor
          value={value.colors[0]}
          onChange={(c) => handleColorChange(0, c)}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Color 2">
        <ColorEditor
          value={value.colors[1]}
          onChange={(c) => handleColorChange(1, c)}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Fill overlay effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.29 (fillOverlay)
 */
function FillOverlayEditor({
  value,
  onChange,
  disabled,
}: {
  value: FillOverlayEffect;
  onChange: (v: FillOverlayEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Blend Mode">
        <Select
          value={value.blend}
          onChange={(blend) => onChange({ ...value, blend })}
          options={blendModeOptions}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Fill Type">
        <Select
          value={value.fillType}
          onChange={(fillType) => onChange({ ...value, fillType })}
          options={fillEffectTypeOptions}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Preset shadow effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.49 (prstShdw)
 */
function PresetShadowEditor({
  value,
  onChange,
  disabled,
}: {
  value: PresetShadowEffect;
  onChange: (v: PresetShadowEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldGroup label="Preset">
        <Select
          value={value.preset}
          onChange={(preset) => onChange({ ...value, preset })}
          options={presetShadowOptions}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Color">
        <ColorEditor
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldRow>
        <FieldGroup label="Direction" style={fieldStyle}>
          <DegreesEditor
            value={value.direction}
            onChange={(direction) => onChange({ ...value, direction })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Distance" style={fieldStyle}>
          <PixelsEditor
            value={value.distance}
            onChange={(distance) => onChange({ ...value, distance })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Relative offset effect sub-editor
 * @see ECMA-376 Part 1, Section 20.1.8.51 (relOff)
 */
function RelativeOffsetEditor({
  value,
  onChange,
  disabled,
}: {
  value: RelativeOffsetEffect;
  onChange: (v: RelativeOffsetEffect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldRow>
        <FieldGroup label="Offset X" style={fieldStyle}>
          <PercentEditor
            value={value.offsetX}
            onChange={(offsetX) => onChange({ ...value, offsetX })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Offset Y" style={fieldStyle}>
          <PercentEditor
            value={value.offsetY}
            onChange={(offsetY) => onChange({ ...value, offsetY })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

// =============================================================================
// Effect Toggle Wrapper
// =============================================================================

type EffectKey = keyof Effects;

type EffectConfig = {
  key: EffectKey;
  label: string;
  create: () => Effects[EffectKey];
  render: (
    value: NonNullable<Effects[EffectKey]>,
    onChange: (v: NonNullable<Effects[EffectKey]>) => void,
    disabled?: boolean
  ) => React.ReactNode;
};

const EFFECT_CONFIGS: readonly EffectConfig[] = [
  // Visual Effects
  {
    key: "shadow",
    label: "Shadow",
    create: createDefaultShadow,
    render: (v, onChange, disabled) => (
      <ShadowEditor value={v as ShadowEffect} onChange={onChange as (v: ShadowEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "glow",
    label: "Glow",
    create: createDefaultGlow,
    render: (v, onChange, disabled) => (
      <GlowEditor value={v as GlowEffect} onChange={onChange as (v: GlowEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "reflection",
    label: "Reflection",
    create: createDefaultReflection,
    render: (v, onChange, disabled) => (
      <ReflectionEditor value={v as ReflectionEffect} onChange={onChange as (v: ReflectionEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "softEdge",
    label: "Soft Edge",
    create: createDefaultSoftEdge,
    render: (v, onChange, disabled) => (
      <SoftEdgeEditor value={v as SoftEdgeEffect} onChange={onChange as (v: SoftEdgeEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "presetShadow",
    label: "Preset Shadow",
    create: createDefaultPresetShadow,
    render: (v, onChange, disabled) => (
      <PresetShadowEditor value={v as PresetShadowEffect} onChange={onChange as (v: PresetShadowEffect) => void} disabled={disabled} />
    ),
  },
  // Alpha Effects
  {
    key: "alphaBiLevel",
    label: "Alpha Bi-Level",
    create: createDefaultAlphaBiLevel,
    render: (v, onChange, disabled) => (
      <AlphaBiLevelEditor value={v as AlphaBiLevelEffect} onChange={onChange as (v: AlphaBiLevelEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaCeiling",
    label: "Alpha Ceiling",
    create: createDefaultAlphaCeiling,
    render: () => <><div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>No configurable options</div></>,
  },
  {
    key: "alphaFloor",
    label: "Alpha Floor",
    create: createDefaultAlphaFloor,
    render: () => <><div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>No configurable options</div></>,
  },
  {
    key: "alphaInv",
    label: "Alpha Inverse",
    create: createDefaultAlphaInv,
    render: () => <><div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>No configurable options</div></>,
  },
  {
    key: "alphaMod",
    label: "Alpha Modulate",
    create: createDefaultAlphaMod,
    render: (v, onChange, disabled) => (
      <AlphaModEditor value={v as AlphaModulateEffect} onChange={onChange as (v: AlphaModulateEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaModFix",
    label: "Alpha Modulate Fixed",
    create: createDefaultAlphaModFix,
    render: (v, onChange, disabled) => (
      <AlphaModFixEditor value={v as AlphaModulateFixedEffect} onChange={onChange as (v: AlphaModulateFixedEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaOutset",
    label: "Alpha Outset",
    create: createDefaultAlphaOutset,
    render: (v, onChange, disabled) => (
      <AlphaOutsetEditor value={v as AlphaOutsetEffect} onChange={onChange as (v: AlphaOutsetEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaRepl",
    label: "Alpha Replace",
    create: createDefaultAlphaRepl,
    render: (v, onChange, disabled) => (
      <AlphaReplEditor value={v as AlphaReplaceEffect} onChange={onChange as (v: AlphaReplaceEffect) => void} disabled={disabled} />
    ),
  },
  // Color Effects
  {
    key: "biLevel",
    label: "Bi-Level (B&W)",
    create: createDefaultBiLevel,
    render: (v, onChange, disabled) => (
      <BiLevelEditor value={v as BiLevelEffect} onChange={onChange as (v: BiLevelEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "blend",
    label: "Blend",
    create: createDefaultBlend,
    render: (v, onChange, disabled) => (
      <BlendEditor value={v as BlendEffect} onChange={onChange as (v: BlendEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "colorChange",
    label: "Color Change",
    create: createDefaultColorChange,
    render: (v, onChange, disabled) => (
      <ColorChangeEditor value={v as ColorChangeEffect} onChange={onChange as (v: ColorChangeEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "colorReplace",
    label: "Color Replace",
    create: createDefaultColorReplace,
    render: (v, onChange, disabled) => (
      <ColorReplaceEditor value={v as ColorReplaceEffect} onChange={onChange as (v: ColorReplaceEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "duotone",
    label: "Duotone",
    create: createDefaultDuotone,
    render: (v, onChange, disabled) => (
      <DuotoneEditor value={v as DuotoneEffect} onChange={onChange as (v: DuotoneEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "fillOverlay",
    label: "Fill Overlay",
    create: createDefaultFillOverlay,
    render: (v, onChange, disabled) => (
      <FillOverlayEditor value={v as FillOverlayEffect} onChange={onChange as (v: FillOverlayEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "grayscale",
    label: "Grayscale",
    create: createDefaultGrayscale,
    render: () => <><div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>No configurable options</div></>,
  },
  // Transform Effects
  {
    key: "relativeOffset",
    label: "Relative Offset",
    create: createDefaultRelativeOffset,
    render: (v, onChange, disabled) => (
      <RelativeOffsetEditor value={v as RelativeOffsetEffect} onChange={onChange as (v: RelativeOffsetEffect) => void} disabled={disabled} />
    ),
  },
];

// =============================================================================
// Main Editor
// =============================================================================

/**
 * Editor for Effects type (all ECMA-376 effects).
 * Pure content - no container styling.
 * @see ECMA-376 Part 1, Section 20.1.8
 */
export function EffectsEditor({
  value,
  onChange,
  disabled,
}: EffectsEditorProps) {
  const handleToggleEffect = useCallback(
    (key: EffectKey, enabled: boolean, create: () => Effects[EffectKey]) => {
      if (enabled) {
        onChange({ ...value, [key]: create() });
      } else {
        const updated = { ...value };
        delete (updated as Record<string, unknown>)[key];
        onChange(updated);
      }
    },
    [value, onChange]
  );

  const handleEffectChange = useCallback(
    (key: EffectKey, effectValue: Effects[EffectKey]) => {
      onChange({ ...value, [key]: effectValue });
    },
    [value, onChange]
  );

  return (
    <>
      {EFFECT_CONFIGS.map((config) => {
        const effectValue = value[config.key];
        const isEnabled = effectValue !== undefined;

        return (
          <React.Fragment key={config.key}>
            <Toggle
              checked={isEnabled}
              onChange={(enabled) =>
                handleToggleEffect(config.key, enabled, config.create)
              }
              label={config.label}
              disabled={disabled}
            />
            {isEnabled &&
              config.render(
                effectValue as NonNullable<Effects[EffectKey]>,
                (v) => handleEffectChange(config.key, v),
                disabled
              )}
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Create default effects (empty)
 */
export function createDefaultEffects(): Effects {
  return {};
}
