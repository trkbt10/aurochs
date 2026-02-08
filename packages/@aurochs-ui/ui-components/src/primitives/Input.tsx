/**
 * @file Input primitive component
 *
 * A minimal input component that supports text and number types with optional suffix.
 * Suffix is rendered inside the input container for consistent layout.
 */

import { useCallback, useEffect, type ChangeEvent, type CSSProperties } from "react";
import { colorTokens, fontTokens, radiusTokens } from "../design-tokens";

export type InputProps = {
  readonly value: string | number;
  readonly onChange: (value: string | number) => void;
  readonly type?: "text" | "number";
  readonly suffix?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Width constraint for the input container */
  readonly width?: number | string;
};

// One-time style injection for spinner hiding
const stylesInjected = { current: false };
function injectStyles() {
  if (stylesInjected.current || typeof document === "undefined") {
    return;
  }
  const style = document.createElement("style");
  style.textContent = `
    .office-editor-input::-webkit-outer-spin-button,
    .office-editor-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .office-editor-input {
      -moz-appearance: textfield;
    }
  `;
  document.head.appendChild(style);
  stylesInjected.current = true;
}

const containerStyle = (width?: number | string): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  borderRadius: radiusTokens.sm,
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
  fontSize: fontTokens.size.md,
  fontFamily: "inherit",
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  backgroundColor: "transparent",
  border: "none",
  outline: "none",
});

const suffixInnerStyle: CSSProperties = {
  flexShrink: 0,
  paddingRight: "8px",
  fontSize: fontTokens.size.sm,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  userSelect: "none",
  pointerEvents: "none",
};

/**
 * Input field with optional suffix.
 */
export function Input({
  value,
  onChange,
  type = "text",
  suffix,
  placeholder,
  disabled,
  readOnly,
  onKeyDown,
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
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        min={min}
        max={max}
        step={step}
        style={inputInnerStyle(hasSuffix)}
        className="office-editor-input"
      />
      {suffix && <span style={suffixInnerStyle}>{suffix}</span>}
    </div>
  );
}
