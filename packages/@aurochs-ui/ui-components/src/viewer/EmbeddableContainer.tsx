/**
 * @file EmbeddableContainer
 *
 * Container for lightweight embeddable viewers.
 */

import type { CSSProperties, ReactNode } from "react";
import { radiusTokens, colorTokens, shadowTokens } from "../design-tokens";

export type EmbeddableContainerProps = {
  /** Container content */
  readonly children: ReactNode;
  /** Maximum width */
  readonly maxWidth?: string | number;
  /** Maximum height */
  readonly maxHeight?: string | number;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  backgroundColor: colorTokens.background.primary,
  borderRadius: radiusTokens.lg,
  overflow: "hidden",
  boxShadow: shadowTokens.md,
};

/**
 * Container for embeddable viewers.
 */
export function EmbeddableContainer({
  children,
  maxWidth,
  maxHeight,
  className,
  style,
}: EmbeddableContainerProps) {
  return (
    <div
      style={{
        ...containerStyle,
        ...(maxWidth !== undefined && { maxWidth }),
        ...(maxHeight !== undefined && { maxHeight }),
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}
