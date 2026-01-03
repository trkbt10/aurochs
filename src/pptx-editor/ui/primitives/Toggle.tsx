/**
 * @file Toggle primitive component
 *
 * A minimal toggle/switch component.
 */

import { useCallback, type CSSProperties } from "react";

export type ToggleProps = {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  cursor: "pointer",
};

const trackStyle = (checked: boolean, disabled: boolean): CSSProperties => ({
  position: "relative",
  width: "28px",
  height: "16px",
  borderRadius: "8px",
  backgroundColor: checked ? "var(--accent-blue, #0070f3)" : "var(--bg-tertiary, #222)",
  transition: "background-color 150ms ease",
  opacity: disabled ? 0.5 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
  flexShrink: 0,
});

const thumbStyle = (checked: boolean): CSSProperties => ({
  position: "absolute",
  top: "2px",
  left: checked ? "14px" : "2px",
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  backgroundColor: "#ffffff",
  transition: "left 150ms ease",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
});

const labelStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--text-secondary, #a1a1a1)",
  userSelect: "none",
};

export function Toggle({ checked, onChange, label, disabled, className, style }: ToggleProps) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, onChange, disabled]);

  return (
    <div
      style={{ ...containerStyle, ...style }}
      className={className}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
    >
      <div style={trackStyle(checked, disabled ?? false)}>
        <div style={thumbStyle(checked)} />
      </div>
      {label && <span style={labelStyle}>{label}</span>}
    </div>
  );
}
