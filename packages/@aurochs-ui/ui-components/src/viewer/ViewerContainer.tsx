/**
 * @file ViewerContainer
 *
 * Root container for document/slide/sheet viewers.
 */

import type { CSSProperties, ReactNode } from "react";
import { colorTokens } from "../design-tokens";

export type ViewerContainerProps = {
  /** Viewer content */
  readonly children: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: colorTokens.background.primary,
  color: colorTokens.text.primary,
};

/**
 * Root container for viewers.
 */
export function ViewerContainer({ children, className, style }: ViewerContainerProps) {
  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {children}
    </div>
  );
}
