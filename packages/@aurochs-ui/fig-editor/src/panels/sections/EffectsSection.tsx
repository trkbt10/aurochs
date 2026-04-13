/**
 * @file Effects display section
 *
 * Shows the list of effects (shadows, blurs) applied to the selected node.
 * Read-only display for now — effects editing is complex and deferred.
 */

import type { CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEffect, FigColor } from "@aurochs/fig/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { FieldRow } from "@aurochs-ui/ui-components/layout";

type EffectsSectionProps = {
  readonly node: FigDesignNode;
};

function getEffectTypeName(effect: FigEffect): string {
  const type = effect.type;
  if (typeof type === "string") return type;
  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }
  return "Unknown";
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

const effectItemStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "2px 0",
};

const effectLabelStyle: CSSProperties = {
  color: colorTokens.text.primary,
  flex: 1,
};

const effectDetailStyle: CSSProperties = {
  color: colorTokens.text.tertiary,
  fontFamily: "monospace",
  fontSize: fontTokens.size.xs,
};

const emptyStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  color: colorTokens.text.tertiary,
};

export function EffectsSection({ node }: EffectsSectionProps) {
  const effects = node.effects;

  if (effects.length === 0) {
    return <div style={emptyStyle}>No effects</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {effects.map((effect, i) => {
        const typeName = getEffectTypeName(effect);
        const label = formatEffectLabel(typeName);
        const visible = effect.visible !== false;

        let detail = "";
        if (typeName === "DROP_SHADOW" || typeName === "INNER_SHADOW") {
          const ox = effect.offset?.x ?? 0;
          const oy = effect.offset?.y ?? 0;
          const r = effect.radius ?? 0;
          const c = effect.color ? colorToHex(effect.color) : "";
          detail = `${ox},${oy} r${r}${c ? ` ${c}` : ""}`;
        } else if (typeName === "LAYER_BLUR" || typeName === "BACKGROUND_BLUR") {
          detail = `r${effect.radius ?? 0}`;
        }

        return (
          <div key={i} style={{ ...effectItemStyle, opacity: visible ? 1 : 0.4 }}>
            <span style={effectLabelStyle}>{label}</span>
            <span style={effectDetailStyle}>{detail}</span>
          </div>
        );
      })}
    </div>
  );
}
