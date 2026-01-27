/**
 * @file Effect Detail Panel (right side of split panel)
 *
 * Displays the editor for the selected effect.
 */

import { useMemo, type CSSProperties } from "react";
import { Button } from "@oxen-ui/ui-components/primitives";
import type { Effects } from "@oxen/pptx/domain/types";
import { EFFECT_CONFIGS } from "./constants";
import type { EffectKey } from "./types";

export type EffectDetailPanelProps = {
  readonly value: Effects;
  readonly selectedKey: EffectKey | null;
  readonly onChange: (effects: Effects) => void;
  readonly onReset: (key: EffectKey) => void;
  readonly onDelete: (key: EffectKey) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const panelStyle: CSSProperties = {
  flex: 1,
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  minWidth: 200,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary, #fafafa)",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: 4,
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  overflow: "auto",
};

const emptyStateStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: 8,
  color: "var(--text-tertiary, #737373)",
  fontSize: 12,
  textAlign: "center",
  padding: 24,
};

const disabledStateStyle: CSSProperties = {
  ...emptyStateStyle,
  color: "var(--text-secondary, #a1a1a1)",
};

// =============================================================================
// Icons
// =============================================================================

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Panel for editing a single effect entry.
 */
export function EffectDetailPanel({
  value,
  selectedKey,
  onChange,
  onReset,
  onDelete,
  disabled,
}: EffectDetailPanelProps) {
  const selectedConfig = useMemo(() => {
    if (!selectedKey) {
      return null;
    }
    return EFFECT_CONFIGS.find((c) => c.key === selectedKey) ?? null;
  }, [selectedKey]);

  const effectValue = selectedKey ? value[selectedKey] : undefined;
  const isEffectEnabled = effectValue !== undefined;

  // Handle effect value change
  const handleEffectChange = (newValue: NonNullable<Effects[EffectKey]>) => {
    if (!selectedKey) {
      return;
    }
    onChange({ ...value, [selectedKey]: newValue });
  };

  // Empty state: no effect selected
  if (!selectedConfig) {
    return (
      <div style={panelStyle}>
        <div style={emptyStateStyle}>
          <span>Select an effect to edit</span>
        </div>
      </div>
    );
  }

  // Disabled state: effect not enabled
  if (!isEffectEnabled) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ ...titleStyle, color: "var(--text-tertiary, #737373)" }}>
            {selectedConfig.label}
          </span>
        </div>
        <div style={disabledStateStyle}>
          <span>Enable this effect to edit its properties</span>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>{selectedConfig.label}</span>
        <div style={actionsStyle}>
          <Button
            variant="ghost"
            onClick={() => onReset(selectedConfig.key)}
            disabled={disabled}
            title="Reset to default"
          >
            <ResetIcon />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDelete(selectedConfig.key)}
            disabled={disabled}
            title="Remove effect"
          >
            <DeleteIcon />
          </Button>
        </div>
      </div>
      <div style={contentStyle}>
        {selectedConfig.render(
          effectValue as NonNullable<Effects[EffectKey]>,
          handleEffectChange,
          disabled
        )}
      </div>
    </div>
  );
}
