/** @file Effects property section. */

import { useCallback, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { BlendMode, FigEffectType } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";
import { Toggle } from "@aurochs-ui/ui-components/primitives/Toggle";
import {
  effectColorToHex,
  formatEffectLabel,
  getEffectTypeName,
  type EffectOperation,
} from "./effect-domain";
import { applyAppearanceOperation } from "./appearance-domain";

type EffectsSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

const effectTypeOptions: readonly SelectOption<FigEffectType>[] = [
  { value: "DROP_SHADOW", label: "Drop shadow" },
  { value: "INNER_SHADOW", label: "Inner shadow" },
  { value: "FOREGROUND_BLUR", label: "Layer blur" },
  { value: "BACKGROUND_BLUR", label: "Background blur" },
];

const blendModeOptions: readonly SelectOption<BlendMode>[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "MULTIPLY", label: "Multiply" },
  { value: "SCREEN", label: "Screen" },
  { value: "OVERLAY", label: "Overlay" },
  { value: "DARKEN", label: "Darken" },
  { value: "LIGHTEN", label: "Lighten" },
  { value: "COLOR_DODGE", label: "Color dodge" },
  { value: "COLOR_BURN", label: "Color burn" },
  { value: "HARD_LIGHT", label: "Hard light" },
  { value: "SOFT_LIGHT", label: "Soft light" },
  { value: "DIFFERENCE", label: "Difference" },
  { value: "EXCLUSION", label: "Exclusion" },
  { value: "HUE", label: "Hue" },
  { value: "SATURATION", label: "Saturation" },
  { value: "COLOR", label: "Color" },
  { value: "LUMINOSITY", label: "Luminosity" },
];

const effectItemStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "4px 0",
};

const effectHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const effectControlsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 4,
};

const emptyStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  color: colorTokens.text.tertiary,
};

const addButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  border: `1px dashed ${colorTokens.border.primary}`,
  background: "none",
  borderRadius: 4,
  padding: "4px 8px",
  color: colorTokens.text.secondary,
  cursor: "pointer",
  fontSize: fontTokens.size.sm,
};

const removeButtonStyle: CSSProperties = {
  border: "none",
  background: "none",
  color: colorTokens.text.tertiary,
  cursor: "pointer",
  lineHeight: 0,
  padding: 2,
};

/** Panel section for viewing and editing visual effects on a Figma node. */
export function EffectsSection({ node, target, dispatch }: EffectsSectionProps) {
  const effects = node.effects;

  const applyEffectOperationAt = useCallback(
    (index: number, operation: EffectOperation) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, {
          type: "effects",
          operation: { type: "update", index, operation },
        }),
      }));
    },
    [dispatch, target],
  );

  const addEffect = useCallback(() => {
    dispatch(createPropertyTargetUpdateAction({
      target,
      updater: (n) => applyAppearanceOperation(n, {
        type: "effects",
        operation: { type: "add", effectType: "DROP_SHADOW" },
      }),
    }));
  }, [dispatch, target]);

  const removeEffect = useCallback((index: number) => {
    dispatch(createPropertyTargetUpdateAction({
      target,
      updater: (n) => applyAppearanceOperation(n, {
        type: "effects",
        operation: { type: "remove", index },
      }),
    }));
  }, [dispatch, target]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {effects.length === 0 && <div style={emptyStyle}>No effects</div>}
      {effects.map((effect, i) => {
        const typeName = getEffectTypeName(effect);
        const color = effect.color ?? { r: 0, g: 0, b: 0, a: 0.25 };
        const isShadow = typeName === "DROP_SHADOW" || typeName === "INNER_SHADOW";

        return (
          <div key={i} style={{ ...effectItemStyle, opacity: effect.visible === false ? 0.4 : 1 }}>
            <div style={effectHeaderStyle}>
              <Toggle
                checked={effect.visible !== false}
                onChange={(checked) => applyEffectOperationAt(i, { type: "set-visible", visible: checked })}
                ariaLabel={`Effect visible ${i + 1}`}
              />
              <Select<FigEffectType>
                value={typeName}
                onChange={(type) => applyEffectOperationAt(i, { type: "set-type", effectType: type })}
                options={effectTypeOptions}
                ariaLabel={`Effect type ${i + 1}`}
              />
              <button type="button" title="Remove effect" onClick={() => removeEffect(i)} style={removeButtonStyle}>
                <CloseIcon size={12} />
              </button>
            </div>
            <div style={effectControlsStyle}>
              <Input
                type="number"
                ariaLabel={`${formatEffectLabel(typeName)} radius`}
                value={effect.radius ?? 0}
                onChange={(v) => applyEffectOperationAt(i, { type: "set-radius", radius: v as number })}
                suffix="r"
              />
              {isShadow && (
                <>
                  <Select<BlendMode>
                    value={effect.blendMode ?? "NORMAL"}
                    onChange={(value) => applyEffectOperationAt(i, { type: "set-blend-mode", blendMode: value })}
                    options={blendModeOptions}
                    ariaLabel={`${formatEffectLabel(typeName)} blend mode`}
                  />
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} offset x`}
                    value={effect.offset?.x ?? 0}
                    onChange={(v) => applyEffectOperationAt(i, { type: "set-offset-x", x: v as number })}
                    suffix="x"
                  />
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} offset y`}
                    value={effect.offset?.y ?? 0}
                    onChange={(v) => applyEffectOperationAt(i, { type: "set-offset-y", y: v as number })}
                    suffix="y"
                  />
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} spread`}
                    value={effect.spread ?? 0}
                    onChange={(v) => applyEffectOperationAt(i, { type: "set-spread", spread: v as number })}
                    suffix="s"
                  />
                  <input
                    type="color"
                    value={effectColorToHex(color)}
                    aria-label={`${formatEffectLabel(typeName)} color`}
                    onChange={(e) => applyEffectOperationAt(i, { type: "set-color", hex: e.target.value })}
                    style={{ width: "100%", height: 28, padding: 0, border: `1px solid ${colorTokens.border.strong}`, borderRadius: 4 }}
                  />
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} opacity`}
                    value={Math.round(color.a * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => applyEffectOperationAt(i, { type: "set-opacity", opacity: (v as number) / 100 })}
                    suffix="%"
                  />
                  <Toggle
                    checked={effect.showShadowBehindNode !== false}
                    onChange={(checked) => applyEffectOperationAt(i, { type: "set-shadow-behind-node", showShadowBehindNode: checked })}
                    label="Behind"
                    ariaLabel={`${formatEffectLabel(typeName)} show behind node`}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
      <button type="button" onClick={addEffect} style={addButtonStyle}>
        <AddIcon size={12} />
        Add effect
      </button>
    </div>
  );
}
