/**
 * @file EmbeddableContent
 *
 * Content area for embeddable viewers.
 */

import type { CSSProperties, ReactNode } from "react";
import { spacingTokens, colorTokens } from "../design-tokens";

export type EmbeddableContentProps = {
  /** Content to display */
  readonly children: ReactNode;
  /** Content variant */
  readonly variant?: "scroll" | "grid";
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const scrollContentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: spacingTokens.lg,
  backgroundColor: colorTokens.background.tertiary,
};

const gridContentStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  backgroundColor: colorTokens.background.tertiary,
};

/**
 * Content area for embeddable viewers.
 */
export function EmbeddableContent({ children, variant = "scroll", className, style }: EmbeddableContentProps) {
  const baseStyle = variant === "grid" ? gridContentStyle : scrollContentStyle;
  return (
    <div style={{ ...baseStyle, ...style }} className={className}>
      {children}
    </div>
  );
}
