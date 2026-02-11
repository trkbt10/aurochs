/**
 * @file KeyboardHints
 *
 * Displays keyboard shortcuts hints.
 */

import type { CSSProperties, ReactNode } from "react";

export type KeyboardHintsVariant = "dark" | "light";

export type KeyboardHint = {
  /** Keys to display (e.g., ["←", "→"]) */
  readonly keys: readonly string[];
  /** Label describing the action */
  readonly label: string;
};

export type KeyboardHintsProps = {
  /** List of keyboard hints to display */
  readonly hints: readonly KeyboardHint[];
  /** Visual variant */
  readonly variant?: KeyboardHintsVariant;
  /** Additional CSS class */
  readonly className?: string;
};

const containerStyles: Record<KeyboardHintsVariant, CSSProperties> = {
  dark: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "var(--text-tertiary)",
  },
  light: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.35)",
  },
};

const kbdStyles: Record<KeyboardHintsVariant, CSSProperties> = {
  dark: {
    padding: "2px 6px",
    backgroundColor: "var(--bg-tertiary)",
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

function Kbd({ children, variant }: { children: ReactNode; variant: KeyboardHintsVariant }) {
  return <span style={kbdStyles[variant]}>{children}</span>;
}

/**
 * Displays keyboard shortcut hints for users.
 *
 * @example
 * ```tsx
 * <KeyboardHints
 *   hints={[
 *     { keys: ["←", "→"], label: "Navigate" },
 *     { keys: ["F"], label: "Fullscreen" },
 *   ]}
 * />
 * ```
 */
export function KeyboardHints({ hints, variant = "dark", className }: KeyboardHintsProps) {
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
            <span style={{ margin: "0 4px", color: "var(--text-tertiary)" }}>·</span>
          )}
        </span>
      ))}
    </div>
  );
}
