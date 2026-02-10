/**
 * @file Canvas area wrapper for GridLayout integration
 *
 * Contains the slide canvas and floating toolbar.
 * This component receives all canvas-related props and renders the editing surface.
 */

import { forwardRef, type CSSProperties, type ReactNode } from "react";

export type CanvasAreaProps = {
  /** Floating toolbar element (optional) */
  readonly floatingToolbar?: ReactNode;
  /** Main canvas content */
  readonly children: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  backgroundColor: "var(--bg-tertiary, #111)",
  overflow: "hidden",
};

const floatingToolbarStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: "16px",
  transform: "translateX(-50%)",
  zIndex: 10,
};

const canvasWrapperStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  position: "relative",
  overflow: "hidden",
};

/**
 * Canvas area container component.
 *
 * Provides a container for the slide canvas with optional floating toolbar.
 * Used within the GridLayout to represent the center editing area.
 */
export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(function CanvasArea(
  { floatingToolbar, children, className, style },
  ref,
) {
  return (
    <div ref={ref} className={className} style={{ ...containerStyle, ...style }}>
      {floatingToolbar && <div style={floatingToolbarStyle}>{floatingToolbar}</div>}
      <div style={canvasWrapperStyle}>{children}</div>
    </div>
  );
});
