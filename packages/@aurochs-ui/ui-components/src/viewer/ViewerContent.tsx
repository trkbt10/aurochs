/**
 * @file ViewerContent
 *
 * Scrollable content area for viewers.
 */

import type { CSSProperties, ReactNode, Ref } from "react";
import { forwardRef } from "react";
import { spacingTokens, colorTokens } from "../design-tokens";

export type ViewerContentProps = {
  /** Content to display */
  readonly children: ReactNode;
  /** Background variant */
  readonly variant?: "default" | "grid";
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const contentAreaStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  backgroundColor: colorTokens.background.tertiary,
};

const scrollContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: spacingTokens.xl,
};

const gridContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
};

/**
 * Scrollable content area for document/slide viewing.
 */
export const ViewerContent = forwardRef(function ViewerContent(
  { children, variant = "default", className, style }: ViewerContentProps,
  ref: Ref<HTMLDivElement>,
) {
  if (variant === "grid") {
    return (
      <div style={{ ...contentAreaStyle, ...style }} className={className}>
        <div ref={ref} style={gridContainerStyle}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <main style={{ ...contentAreaStyle, ...style }} className={className}>
      <div ref={ref} style={scrollContainerStyle}>
        {children}
      </div>
    </main>
  );
});
