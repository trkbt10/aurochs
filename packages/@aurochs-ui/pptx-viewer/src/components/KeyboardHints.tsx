/**
 * @file KeyboardHints
 *
 * Displays keyboard shortcuts hints.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, fontTokens, radiusTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

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

/** Kbd key minimum width for light variant (18px) */
const KBD_MIN_WIDTH = 18;
/** Kbd key height for light variant (18px) */
const KBD_HEIGHT = 18;

const containerStyles: Record<KeyboardHintsVariant, CSSProperties> = {
  dark: {
    display: "flex",
    alignItems: "center",
    gap: spacingTokens.sm,
    fontSize: fontTokens.size.md,
    color: colorTokens.text.tertiary,
  },
  light: {
    display: "flex",
    alignItems: "center",
    gap: spacingTokens.lg,
    fontSize: fontTokens.size.sm,
    color: colorTokens.overlay.lightTextMuted,
  },
};

const kbdStyles: Record<KeyboardHintsVariant, CSSProperties> = {
  dark: {
    padding: `${spacingTokens["2xs"]} ${spacingTokens["xs-plus"]}`,
    backgroundColor: colorTokens.background.tertiary,
    borderRadius: radiusTokens.xs,
    fontSize: fontTokens.size.sm,
    fontFamily: "monospace",
  },
  light: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: KBD_MIN_WIDTH,
    height: KBD_HEIGHT,
    padding: `0 ${spacingTokens.xs}`,
    fontFamily: "monospace",
    fontSize: fontTokens.size.xs,
    color: colorTokens.overlay.lightTextSecondary,
    backgroundColor: colorTokens.overlay.lightBgSubtle,
    border: `1px solid ${colorTokens.overlay.lightBorder}`,
    borderRadius: radiusTokens.xs,
  },
};

const hintGroupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.xs,
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
          <span style={{ marginLeft: spacingTokens["2xs"] }}>{hint.label}</span>
          {index < hints.length - 1 && variant === "dark" && (
            <span style={{ margin: `0 ${spacingTokens.xs}`, color: colorTokens.text.tertiary }}>·</span>
          )}
        </span>
      ))}
    </div>
  );
}
