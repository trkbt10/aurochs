/**
 * @file ViewerMain
 *
 * Main content area for viewers (sidebar + content layout).
 */

import type { CSSProperties, ReactNode } from "react";

export type ViewerMainProps = {
  /** Main content */
  readonly children: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const mainStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  overflow: "hidden",
};

/**
 * Main content area with flex row layout.
 */
export function ViewerMain({ children, className, style }: ViewerMainProps) {
  return (
    <div style={{ ...mainStyle, ...style }} className={className}>
      {children}
    </div>
  );
}
