/**
 * @file Select primitive component
 *
 * A minimal select/dropdown component.
 */

import { useCallback, type ChangeEvent, type CSSProperties } from "react";
import type { SelectOption } from "../../types";

export type SelectProps<T extends string = string> = {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly options: readonly SelectOption<T>[];
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
};

const selectStyle: CSSProperties = {
  padding: "5px 8px",
  fontSize: "12px",
  fontFamily: "inherit",
  color: "var(--text-primary, #fafafa)",
  backgroundColor: "var(--bg-tertiary, #1a1a1a)",
  border: "none",
  borderRadius: "4px",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 6px center",
  paddingRight: "24px",
  width: "100%",
};






export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  style,
}: SelectProps<T>) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value as T);
    },
    [onChange]
  );

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      style={{ ...selectStyle, ...style }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
