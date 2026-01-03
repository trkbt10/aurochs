/**
 * @file Input primitive component
 *
 * A minimal input component that supports text and number types with optional suffix.
 * Suffix is rendered inside the input container for consistent layout.
 */

import { useCallback, useEffect, type ChangeEvent, type CSSProperties } from "react";

export type InputProps = {
  readonly value: string | number;
  readonly onChange: (value: string | number) => void;
  readonly type?: "text" | "number";
  readonly suffix?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Width constraint for the input container */
  readonly width?: number | string;
};

// One-time style injection for spinner hiding
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = `
    .pptx-editor-input::-webkit-outer-spin-button,
    .pptx-editor-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .pptx-editor-input {
      -moz-appearance: textfield;
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

const containerStyle = (width?: number | string): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: "var(--bg-tertiary, #1a1a1a)",
  borderRadius: "4px",
  overflow: "hidden",
  // Use explicit width if provided, otherwise fill container
  width: width ?? "100%",
  minWidth: "48px",
  maxWidth: width ?? "100%",
});

const inputInnerStyle = (hasSuffix: boolean): CSSProperties => ({
  flex: 1,
  minWidth: 0,
  width: "100%",
  padding: hasSuffix ? "5px 4px 5px 8px" : "5px 8px",
  fontSize: "12px",
  fontFamily: "inherit",
  color: "var(--text-primary, #fafafa)",
  backgroundColor: "transparent",
  border: "none",
  outline: "none",
});

const suffixInnerStyle: CSSProperties = {
  flexShrink: 0,
  paddingRight: "8px",
  fontSize: "11px",
  color: "var(--text-tertiary, #666)",
  userSelect: "none",
  pointerEvents: "none",
};

export function Input({
  value,
  onChange,
  type = "text",
  suffix,
  placeholder,
  disabled,
  className,
  style,
  min,
  max,
  step,
  width,
}: InputProps) {
  // Inject spinner-hiding styles once
  useEffect(() => {
    injectStyles();
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = type === "number" ? parseFloat(e.target.value) : e.target.value;
      onChange(type === "number" && isNaN(newValue as number) ? 0 : newValue);
    },
    [onChange, type]
  );

  const hasSuffix = !!suffix;

  return (
    <div
      style={{ ...containerStyle(width), ...style }}
      className={className}
    >
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        style={inputInnerStyle(hasSuffix)}
        className="pptx-editor-input"
      />
      {suffix && <span style={suffixInnerStyle}>{suffix}</span>}
    </div>
  );
}
