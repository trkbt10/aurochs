/**
 * @file Effects Editor Panel - Split-panel layout for effect editing
 *
 * Adobe Photoshop Layer Styles / Figma Effects Panel inspired UI.
 * Left panel: categorized effect list with toggles.
 * Right panel: detail editor for selected effect.
 */

import { useState, useCallback, type CSSProperties } from "react";
import type { Effects } from "@oxen/pptx/domain/types";
import { EFFECT_CONFIGS } from "./constants";
import { EffectListPanel } from "./EffectListPanel";
import { EffectDetailPanel } from "./EffectDetailPanel";
import type { EffectKey } from "./types";

export type EffectsEditorPanelProps = {
  readonly value: Effects;
  readonly onChange: (effects: Effects) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  overflow: "hidden",
  minHeight: 280,
  maxHeight: 400,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Split-panel editor for effects.
 */
export function EffectsEditorPanel({
  value,
  onChange,
  disabled,
}: EffectsEditorPanelProps) {
  const [selectedKey, setSelectedKey] = useState<EffectKey | null>(null);

  // Find config for creating default values
  const findConfig = useCallback((key: EffectKey) => {
    return EFFECT_CONFIGS.find((c) => c.key === key);
  }, []);

  // Toggle effect on/off
  const handleToggleEffect = useCallback(
    (key: EffectKey, enabled: boolean) => {
      if (enabled) {
        const config = findConfig(key);
        if (config) {
          onChange({ ...value, [key]: config.create() });
          setSelectedKey(key);
        }
      } else {
        const updated = { ...value };
        delete (updated as Record<string, unknown>)[key];
        onChange(updated);
      }
    },
    [value, onChange, findConfig]
  );

  // Reset effect to default
  const handleResetEffect = useCallback(
    (key: EffectKey) => {
      const config = findConfig(key);
      if (config) {
        onChange({ ...value, [key]: config.create() });
      }
    },
    [value, onChange, findConfig]
  );

  // Delete (disable) effect
  const handleDeleteEffect = useCallback(
    (key: EffectKey) => {
      const updated = { ...value };
      delete (updated as Record<string, unknown>)[key];
      onChange(updated);
    },
    [value, onChange]
  );

  return (
    <div style={containerStyle}>
      <EffectListPanel
        value={value}
        selectedKey={selectedKey}
        onSelectEffect={setSelectedKey}
        onToggleEffect={handleToggleEffect}
        disabled={disabled}
      />
      <EffectDetailPanel
        value={value}
        selectedKey={selectedKey}
        onChange={onChange}
        onReset={handleResetEffect}
        onDelete={handleDeleteEffect}
        disabled={disabled}
      />
    </div>
  );
}
