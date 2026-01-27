/**
 * @file Effect configurations with category information
 */

import React from "react";
import { FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { Input, Select, Toggle } from "@oxen-ui/ui-components/primitives";
import { PixelsEditor } from "../../primitives/PixelsEditor";
import { DegreesEditor } from "../../primitives/DegreesEditor";
import { PercentEditor } from "../../primitives/PercentEditor";
import { ColorEditor, createDefaultColor } from "../../color/ColorEditor";
import { px, deg, pct } from "@oxen/ooxml/domain/units";
import { type ShadowEffect, type GlowEffect, type ReflectionEffect, type SoftEdgeEffect, type AlphaBiLevelEffect, type AlphaCeilingEffect, type AlphaFloorEffect, type AlphaInverseEffect, type AlphaModulateEffect, type AlphaModulateFixedEffect, type AlphaOutsetEffect, type AlphaReplaceEffect, type BiLevelEffect, type BlendEffect, type BlendMode, type ColorChangeEffect, type ColorReplaceEffect, type DuotoneEffect, type FillOverlayEffect, type FillEffectType, type GrayscaleEffect, type PresetShadowEffect, type PresetShadowValue, type RelativeOffsetEffect, type EffectContainer, type EffectContainerType } from "@oxen/pptx/domain/types";
import type { Color } from "@oxen/ooxml/domain/color";
import type { SelectOption } from "@oxen-ui/ui-components/types";
import type { EffectConfig } from "./types";

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

const containerTypeOptions: SelectOption<EffectContainerType>[] = [
  { value: "sib", label: "Sibling" },
  { value: "tree", label: "Tree" },
];

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
    startPosition: pct(0),
    endOpacity: pct(0),
    endPosition: pct(100),
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

function ShadowEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: ShadowEffect;
  readonly onChange: (v: ShadowEffect) => void;
  readonly disabled?: boolean;
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

function GlowEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: GlowEffect;
  readonly onChange: (v: GlowEffect) => void;
  readonly disabled?: boolean;
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

function ReflectionEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: ReflectionEffect;
  readonly onChange: (v: ReflectionEffect) => void;
  readonly disabled?: boolean;
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

function SoftEdgeEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: SoftEdgeEffect;
  readonly onChange: (v: SoftEdgeEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
    <FieldGroup label="Radius">
      <PixelsEditor
        value={value.radius}
        onChange={(radius) => onChange({ ...value, radius })}
        disabled={disabled}
        min={0}
      />
    </FieldGroup>
  );
}

function AlphaBiLevelEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: AlphaBiLevelEffect;
  readonly onChange: (v: AlphaBiLevelEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
    <FieldGroup label="Threshold">
      <PercentEditor
        value={value.threshold}
        onChange={(threshold) => onChange({ ...value, threshold })}
        disabled={disabled}
      />
    </FieldGroup>
  );
}

function AlphaModFixEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: AlphaModulateFixedEffect;
  readonly onChange: (v: AlphaModulateFixedEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
    <FieldGroup label="Amount">
      <PercentEditor
        value={value.amount}
        onChange={(amount) => onChange({ ...value, amount })}
        disabled={disabled}
      />
    </FieldGroup>
  );
}

function AlphaOutsetEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: AlphaOutsetEffect;
  readonly onChange: (v: AlphaOutsetEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
    <FieldGroup label="Radius">
      <PixelsEditor
        value={value.radius}
        onChange={(radius) => onChange({ ...value, radius })}
        disabled={disabled}
      />
    </FieldGroup>
  );
}

function AlphaReplEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: AlphaReplaceEffect;
  readonly onChange: (v: AlphaReplaceEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
    <FieldGroup label="Alpha">
      <PercentEditor
        value={value.alpha}
        onChange={(alpha) => onChange({ ...value, alpha })}
        disabled={disabled}
      />
    </FieldGroup>
  );
}

function BiLevelEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: BiLevelEffect;
  readonly onChange: (v: BiLevelEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
    <FieldGroup label="Threshold">
      <PercentEditor
        value={value.threshold}
        onChange={(threshold) => onChange({ ...value, threshold })}
        disabled={disabled}
      />
    </FieldGroup>
  );
}

function EffectContainerEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: EffectContainer | undefined;
  readonly onChange: (v: EffectContainer | undefined) => void;
  readonly disabled?: boolean;
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
  );
}

function AlphaModEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: AlphaModulateEffect;
  readonly onChange: (v: AlphaModulateEffect) => void;
  readonly disabled?: boolean;
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

function BlendEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: BlendEffect;
  readonly onChange: (v: BlendEffect) => void;
  readonly disabled?: boolean;
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

function ColorChangeEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: ColorChangeEffect;
  readonly onChange: (v: ColorChangeEffect) => void;
  readonly disabled?: boolean;
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

function ColorReplaceEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: ColorReplaceEffect;
  readonly onChange: (v: ColorReplaceEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
    <FieldGroup label="Color">
      <ColorEditor
        value={value.color}
        onChange={(color) => onChange({ ...value, color })}
        disabled={disabled}
      />
    </FieldGroup>
  );
}

function DuotoneEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: DuotoneEffect;
  readonly onChange: (v: DuotoneEffect) => void;
  readonly disabled?: boolean;
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

function FillOverlayEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: FillOverlayEffect;
  readonly onChange: (v: FillOverlayEffect) => void;
  readonly disabled?: boolean;
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

function PresetShadowEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: PresetShadowEffect;
  readonly onChange: (v: PresetShadowEffect) => void;
  readonly disabled?: boolean;
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

function RelativeOffsetEditor({
  value,
  onChange,
  disabled,
}: {
  readonly value: RelativeOffsetEffect;
  readonly onChange: (v: RelativeOffsetEffect) => void;
  readonly disabled?: boolean;
}) {
  return (
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
  );
}

function NoOptionsMessage() {
  return <div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>No configurable options</div>;
}

// =============================================================================
// Effect Configurations
// =============================================================================

export const EFFECT_CONFIGS: readonly EffectConfig[] = [
  // Visual Effects
  {
    key: "shadow",
    label: "Shadow",
    category: "visual",
    create: createDefaultShadow,
    render: (v, onChange, disabled) => (
      <ShadowEditor value={v as ShadowEffect} onChange={onChange as (v: ShadowEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "glow",
    label: "Glow",
    category: "visual",
    create: createDefaultGlow,
    render: (v, onChange, disabled) => (
      <GlowEditor value={v as GlowEffect} onChange={onChange as (v: GlowEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "reflection",
    label: "Reflection",
    category: "visual",
    create: createDefaultReflection,
    render: (v, onChange, disabled) => (
      <ReflectionEditor value={v as ReflectionEffect} onChange={onChange as (v: ReflectionEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "softEdge",
    label: "Soft Edge",
    category: "visual",
    create: createDefaultSoftEdge,
    render: (v, onChange, disabled) => (
      <SoftEdgeEditor value={v as SoftEdgeEffect} onChange={onChange as (v: SoftEdgeEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "presetShadow",
    label: "Preset Shadow",
    category: "visual",
    create: createDefaultPresetShadow,
    render: (v, onChange, disabled) => (
      <PresetShadowEditor value={v as PresetShadowEffect} onChange={onChange as (v: PresetShadowEffect) => void} disabled={disabled} />
    ),
  },
  // Alpha Effects
  {
    key: "alphaBiLevel",
    label: "Alpha Bi-Level",
    category: "alpha",
    create: createDefaultAlphaBiLevel,
    render: (v, onChange, disabled) => (
      <AlphaBiLevelEditor value={v as AlphaBiLevelEffect} onChange={onChange as (v: AlphaBiLevelEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaCeiling",
    label: "Alpha Ceiling",
    category: "alpha",
    create: createDefaultAlphaCeiling,
    render: () => <NoOptionsMessage />,
  },
  {
    key: "alphaFloor",
    label: "Alpha Floor",
    category: "alpha",
    create: createDefaultAlphaFloor,
    render: () => <NoOptionsMessage />,
  },
  {
    key: "alphaInv",
    label: "Alpha Inverse",
    category: "alpha",
    create: createDefaultAlphaInv,
    render: () => <NoOptionsMessage />,
  },
  {
    key: "alphaMod",
    label: "Alpha Modulate",
    category: "alpha",
    create: createDefaultAlphaMod,
    render: (v, onChange, disabled) => (
      <AlphaModEditor value={v as AlphaModulateEffect} onChange={onChange as (v: AlphaModulateEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaModFix",
    label: "Alpha Modulate Fixed",
    category: "alpha",
    create: createDefaultAlphaModFix,
    render: (v, onChange, disabled) => (
      <AlphaModFixEditor value={v as AlphaModulateFixedEffect} onChange={onChange as (v: AlphaModulateFixedEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaOutset",
    label: "Alpha Outset",
    category: "alpha",
    create: createDefaultAlphaOutset,
    render: (v, onChange, disabled) => (
      <AlphaOutsetEditor value={v as AlphaOutsetEffect} onChange={onChange as (v: AlphaOutsetEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "alphaRepl",
    label: "Alpha Replace",
    category: "alpha",
    create: createDefaultAlphaRepl,
    render: (v, onChange, disabled) => (
      <AlphaReplEditor value={v as AlphaReplaceEffect} onChange={onChange as (v: AlphaReplaceEffect) => void} disabled={disabled} />
    ),
  },
  // Color Effects
  {
    key: "biLevel",
    label: "Bi-Level (B&W)",
    category: "color",
    create: createDefaultBiLevel,
    render: (v, onChange, disabled) => (
      <BiLevelEditor value={v as BiLevelEffect} onChange={onChange as (v: BiLevelEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "blend",
    label: "Blend",
    category: "color",
    create: createDefaultBlend,
    render: (v, onChange, disabled) => (
      <BlendEditor value={v as BlendEffect} onChange={onChange as (v: BlendEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "colorChange",
    label: "Color Change",
    category: "color",
    create: createDefaultColorChange,
    render: (v, onChange, disabled) => (
      <ColorChangeEditor value={v as ColorChangeEffect} onChange={onChange as (v: ColorChangeEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "colorReplace",
    label: "Color Replace",
    category: "color",
    create: createDefaultColorReplace,
    render: (v, onChange, disabled) => (
      <ColorReplaceEditor value={v as ColorReplaceEffect} onChange={onChange as (v: ColorReplaceEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "duotone",
    label: "Duotone",
    category: "color",
    create: createDefaultDuotone,
    render: (v, onChange, disabled) => (
      <DuotoneEditor value={v as DuotoneEffect} onChange={onChange as (v: DuotoneEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "fillOverlay",
    label: "Fill Overlay",
    category: "color",
    create: createDefaultFillOverlay,
    render: (v, onChange, disabled) => (
      <FillOverlayEditor value={v as FillOverlayEffect} onChange={onChange as (v: FillOverlayEffect) => void} disabled={disabled} />
    ),
  },
  {
    key: "grayscale",
    label: "Grayscale",
    category: "color",
    create: createDefaultGrayscale,
    render: () => <NoOptionsMessage />,
  },
  // Transform Effects
  {
    key: "relativeOffset",
    label: "Relative Offset",
    category: "transform",
    create: createDefaultRelativeOffset,
    render: (v, onChange, disabled) => (
      <RelativeOffsetEditor value={v as RelativeOffsetEffect} onChange={onChange as (v: RelativeOffsetEffect) => void} disabled={disabled} />
    ),
  },
];
