/**
 * @file KeyboardHints
 *
 * Displays keyboard shortcuts hints.
 */

import type { CSSProperties, ReactNode } from "react";

type Variant = "dark" | "light";

type KeyboardHint = {
  keys: string[];
  label: string;
};

type Props = {
  hints: KeyboardHint[];
  variant?: Variant;
  className?: string;
};

const containerStyles: Record<Variant, CSSProperties> = {
  dark: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#737373",
  },
  light: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.35)",
  },
};

const kbdStyles: Record<Variant, CSSProperties> = {
  dark: {
    padding: "2px 6px",
    backgroundColor: "#1a1a1a",
    borderRadius: "3px",
    fontSize: "11px",
    fontFamily: "monospace",
  },
  light: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "18px",
    height: "18px",
    padding: "0 4px",
    fontFamily: "monospace",
    fontSize: "10px",
    color: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "3px",
  },
};

const hintGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

function Kbd({ children, variant }: { children: ReactNode; variant: Variant }) {
  return <span style={kbdStyles[variant]}>{children}</span>;
}






export function KeyboardHints({ hints, variant = "dark", className }: Props) {
  return (
    <div style={containerStyles[variant]} className={className}>
      {hints.map((hint, index) => (
        <span key={index} style={hintGroupStyle}>
          {hint.keys.map((key, keyIndex) => (
            <Kbd key={keyIndex} variant={variant}>
              {key}
            </Kbd>
          ))}
          <span style={{ marginLeft: "2px" }}>{hint.label}</span>
          {index < hints.length - 1 && variant === "dark" && (
            <span style={{ margin: "0 4px", color: "#525252" }}>·</span>
          )}
        </span>
      ))}
    </div>
  );
}
