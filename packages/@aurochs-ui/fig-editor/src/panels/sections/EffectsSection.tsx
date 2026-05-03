/** @file Effects property section. */

import { useCallback, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEffect, FigColor, FigEffectType } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../property-mutation-target";

type EffectsSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

function getEffectTypeName(effect: FigEffect): FigEffectType {
  const type = effect.type;
  if (typeof type === "string") {return type;}
  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: FigEffectType }).name;
  }
  return "DROP_SHADOW";
}

function formatEffectLabel(typeName: string): string {
  switch (typeName) {
    case "DROP_SHADOW": return "Drop Shadow";
    case "INNER_SHADOW": return "Inner Shadow";
    case "LAYER_BLUR": return "Layer Blur";
    case "BACKGROUND_BLUR": return "Background Blur";
    default: return typeName;
  }
}

function colorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToColor(hex: string, alpha = 1): FigColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: alpha,
  };
}

const effectTypeOptions: readonly SelectOption<FigEffectType>[] = [
  { value: "DROP_SHADOW", label: "Drop shadow" },
  { value: "INNER_SHADOW", label: "Inner shadow" },
  { value: "FOREGROUND_BLUR", label: "Layer blur" },
  { value: "BACKGROUND_BLUR", label: "Background blur" },
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

function createDefaultEffect(type: FigEffectType): FigEffect {
  const effectType = createEffectTypeEnum(type);
  if (type === "DROP_SHADOW" || type === "INNER_SHADOW") {
    return {
      type: effectType,
      visible: true,
      offset: { x: 0, y: 4 },
      radius: 8,
      spread: 0,
      color: { r: 0, g: 0, b: 0, a: 0.25 },
    };
  }
  return {
    type: effectType,
    visible: true,
    radius: 8,
  };
}

function createEffectTypeEnum(type: FigEffectType): FigEffect["type"] {
  switch (type) {
    case "INNER_SHADOW":
      return { value: 0, name: "INNER_SHADOW" };
    case "DROP_SHADOW":
      return { value: 1, name: "DROP_SHADOW" };
    case "LAYER_BLUR":
    case "FOREGROUND_BLUR":
      return { value: 2, name: "FOREGROUND_BLUR" };
    case "BACKGROUND_BLUR":
      return { value: 3, name: "BACKGROUND_BLUR" };
  }
}

/** Panel section for viewing and editing visual effects on a Figma node. */
export function EffectsSection({ node, target, dispatch }: EffectsSectionProps) {
  const effects = node.effects;

  const updateEffects = useCallback(
    (updater: (effects: readonly FigEffect[]) => readonly FigEffect[]) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => ({ ...n, effects: updater(n.effects) }),
      }));
    },
    [dispatch, target],
  );

  const updateEffect = useCallback(
    (index: number, updater: (effect: FigEffect) => FigEffect) => {
      updateEffects((current) => current.map((effect, i) => i === index ? updater(effect) : effect));
    },
    [updateEffects],
  );

  const addEffect = useCallback(() => {
    updateEffects((current) => [...current, createDefaultEffect("DROP_SHADOW")]);
  }, [updateEffects]);

  const removeEffect = useCallback((index: number) => {
    updateEffects((current) => current.filter((_, i) => i !== index));
  }, [updateEffects]);

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
              <Select<FigEffectType>
                value={typeName}
                onChange={(type) => updateEffect(i, () => createDefaultEffect(type))}
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
                onChange={(v) => updateEffect(i, (current) => ({ ...current, radius: v as number }))}
                suffix="r"
              />
              {isShadow && (
                <>
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} offset x`}
                    value={effect.offset?.x ?? 0}
                    onChange={(v) => updateEffect(i, (current) => ({ ...current, offset: { x: v as number, y: current.offset?.y ?? 0 } }))}
                    suffix="x"
                  />
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} offset y`}
                    value={effect.offset?.y ?? 0}
                    onChange={(v) => updateEffect(i, (current) => ({ ...current, offset: { x: current.offset?.x ?? 0, y: v as number } }))}
                    suffix="y"
                  />
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} spread`}
                    value={effect.spread ?? 0}
                    onChange={(v) => updateEffect(i, (current) => ({ ...current, spread: v as number }))}
                    suffix="s"
                  />
                  <input
                    type="color"
                    value={colorToHex(color)}
                    aria-label={`${formatEffectLabel(typeName)} color`}
                    onChange={(e) => updateEffect(i, (current) => ({ ...current, color: hexToColor(e.target.value, current.color?.a ?? color.a) }))}
                    style={{ width: "100%", height: 28, padding: 0, border: `1px solid ${colorTokens.border.strong}`, borderRadius: 4 }}
                  />
                  <Input
                    type="number"
                    ariaLabel={`${formatEffectLabel(typeName)} opacity`}
                    value={Math.round(color.a * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => updateEffect(i, (current) => ({ ...current, color: { ...(current.color ?? color), a: (v as number) / 100 } }))}
                    suffix="%"
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
