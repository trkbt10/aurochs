/**
 * @file Controls panel for story props
 */

import type { CSSProperties, ReactNode } from "react";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { ControlDef, ControlType } from "../types";

// =============================================================================
// Styles
// =============================================================================

const panelStyle: CSSProperties = {
  padding: 16,
  borderTop: `1px solid ${colorTokens.border.subtle}`,
  background: colorTokens.background.secondary,
};

const titleStyle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: colorTokens.text.tertiary,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: colorTokens.text.secondary,
  minWidth: 100,
};

const inputStyle: CSSProperties = {
  padding: "4px 8px",
  border: `1px solid ${colorTokens.border.primary}`,
  borderRadius: 4,
  fontSize: 12,
  background: colorTokens.background.primary,
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  minWidth: 120,
};

const checkboxLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: colorTokens.text.primary,
  cursor: "pointer",
};

// =============================================================================
// Types
// =============================================================================

export type ControlsProps = {
  readonly controls: Record<string, ControlDef<unknown>>;
  readonly values: Record<string, unknown>;
  readonly onChange: (key: string, value: unknown) => void;
};

// =============================================================================
// Control Renderers
// =============================================================================

function renderControl(
  key: string,
  def: ControlDef<unknown>,
  value: unknown,
  onChange: (key: string, value: unknown) => void
): ReactNode {
  const control = def.control;

  switch (control.type) {
    case "select":
      return (
        <select
          style={selectStyle}
          value={value as string}
          onChange={(e) => onChange(key, e.target.value)}
        >
          {control.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "boolean":
      return (
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(key, e.target.checked)}
          />
          {value ? "true" : "false"}
        </label>
      );

    case "number":
      return (
        <input
          type="number"
          style={{ ...inputStyle, width: 80 }}
          value={value as number}
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          onChange={(e) => onChange(key, Number(e.target.value))}
        />
      );

    case "text":
      return (
        <input
          type="text"
          style={{ ...inputStyle, minWidth: 150 }}
          value={value as string}
          onChange={(e) => onChange(key, e.target.value)}
        />
      );

    case "range":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range"
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            value={value as number}
            onChange={(e) => onChange(key, Number(e.target.value))}
          />
          <span style={{ fontSize: 12, color: colorTokens.text.secondary, minWidth: 30 }}>
            {value as number}
          </span>
        </div>
      );

    default:
      return null;
  }
}

// =============================================================================
// Component
// =============================================================================

export function Controls({ controls, values, onChange }: ControlsProps): ReactNode {
  const keys = Object.keys(controls);

  if (keys.length === 0) {
    return null;
  }

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Controls</h3>

      {keys.map((key) => {
        const def = controls[key];
        if (!def) return null;

        return (
          <div key={key} style={rowStyle}>
            <span style={labelStyle}>{def.label}</span>
            {renderControl(key, def, values[key], onChange)}
          </div>
        );
      })}
    </div>
  );
}
