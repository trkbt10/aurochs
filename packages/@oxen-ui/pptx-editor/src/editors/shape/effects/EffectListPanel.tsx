/**
 * @file Effect List Panel (left side of split panel)
 *
 * Displays categorized list of effects with toggles and selection state.
 */

import { useMemo, type CSSProperties } from "react";
import { Toggle } from "@oxen-ui/ui-components/primitives";
import type { Effects } from "@oxen/pptx/domain/types";
import { EFFECT_CONFIGS } from "./constants";
import { EFFECT_CATEGORIES, type EffectKey, type EffectCategory } from "./types";

export type EffectListPanelProps = {
  readonly value: Effects;
  readonly selectedKey: EffectKey | null;
  readonly onSelectEffect: (key: EffectKey) => void;
  readonly onToggleEffect: (key: EffectKey, enabled: boolean) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const panelStyle: CSSProperties = {
  width: 160,
  minWidth: 160,
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  borderRight: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const categoryHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "8px 10px 4px",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--text-tertiary, #737373)",
  userSelect: "none",
};

const effectRowStyle = (selected: boolean, enabled: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px 4px 10px",
  height: 28,
  cursor: "pointer",
  borderLeft: `2px solid ${selected ? "var(--accent-blue, #0070f3)" : "transparent"}`,
  backgroundColor: selected ? "var(--bg-tertiary, #111)" : "transparent",
  color: enabled ? "var(--text-primary, #fafafa)" : "var(--text-tertiary, #737373)",
});

const effectLabelStyle: CSSProperties = {
  flex: 1,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const toggleWrapperStyle: CSSProperties = {
  flexShrink: 0,
};

// =============================================================================
// Component
// =============================================================================

type GroupedEffects = {
  category: EffectCategory;
  label: string;
  effects: typeof EFFECT_CONFIGS;
};

/**
 * Left panel list of available effects.
 */
export function EffectListPanel({
  value,
  selectedKey,
  onSelectEffect,
  onToggleEffect,
  disabled,
}: EffectListPanelProps) {
  const groupedEffects = useMemo<GroupedEffects[]>(() => {
    const groups: Record<EffectCategory, typeof EFFECT_CONFIGS[number][]> = {
      visual: [],
      alpha: [],
      color: [],
      transform: [],
    };

    for (const config of EFFECT_CONFIGS) {
      groups[config.category].push(config);
    }

    return (Object.entries(EFFECT_CATEGORIES) as [EffectCategory, typeof EFFECT_CATEGORIES[EffectCategory]][])
      .sort((a, b) => a[1].order - b[1].order)
      .map(([category, meta]) => ({
        category,
        label: meta.label,
        effects: groups[category] as typeof EFFECT_CONFIGS,
      }))
      .filter((group) => group.effects.length > 0);
  }, []);

  return (
    <div style={panelStyle}>
      {groupedEffects.map((group) => (
        <div key={group.category}>
          <div style={categoryHeaderStyle}>{group.label}</div>
          {group.effects.map((config) => {
            const isEnabled = value[config.key] !== undefined;
            const isSelected = selectedKey === config.key;

            return (
              <div
                key={config.key}
                style={effectRowStyle(isSelected, isEnabled)}
                onClick={() => onSelectEffect(config.key)}
              >
                <div
                  style={toggleWrapperStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Toggle
                    checked={isEnabled}
                    onChange={(enabled) => onToggleEffect(config.key, enabled)}
                    disabled={disabled}
                  />
                </div>
                <span style={effectLabelStyle}>{config.label}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
