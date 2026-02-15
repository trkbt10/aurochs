/**
 * @file Editor Layout Component
 *
 * Xcode-style three-panel layout with navigator, editor, and inspector.
 * Includes resizable panels and visibility toggles.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties, ReactNode, MouseEvent as ReactMouseEvent } from "react";
import { colorTokens, spacingTokens } from "../design-tokens";

// =============================================================================
// Types
// =============================================================================

export type EditorLayoutProps = {
  readonly navigator?: ReactNode;
  readonly editor: ReactNode;
  readonly inspector?: ReactNode;
  readonly console?: ReactNode;
  readonly navigatorWidth?: number;
  readonly inspectorWidth?: number;
  readonly consoleHeight?: number;
  readonly showNavigator?: boolean;
  readonly showInspector?: boolean;
  readonly showConsole?: boolean;
  readonly minNavigatorWidth?: number;
  readonly maxNavigatorWidth?: number;
  readonly minInspectorWidth?: number;
  readonly maxInspectorWidth?: number;
  readonly minConsoleHeight?: number;
  readonly maxConsoleHeight?: number;
  readonly onNavigatorWidthChange?: (width: number) => void;
  readonly onInspectorWidthChange?: (width: number) => void;
  readonly onConsoleHeightChange?: (height: number) => void;
  readonly style?: CSSProperties;
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_NAVIGATOR_WIDTH = 250;
const DEFAULT_INSPECTOR_WIDTH = 250;
const DEFAULT_CONSOLE_HEIGHT = 200;
const DEFAULT_MIN_WIDTH = 150;
const DEFAULT_MAX_WIDTH = 500;
const DEFAULT_MIN_HEIGHT = 100;
const DEFAULT_MAX_HEIGHT = 400;
const RESIZER_WIDTH = 4;

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: colorTokens.background.primary,
};

const mainAreaStyle: CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  backgroundColor: colorTokens.background.primary,
};

const navigatorStyle: CSSProperties = {
  ...panelStyle,
  borderRight: `1px solid ${colorTokens.border.primary}`,
};

const inspectorStyle: CSSProperties = {
  ...panelStyle,
  borderLeft: `1px solid ${colorTokens.border.primary}`,
};

const editorStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflow: "hidden",
};

const consoleContainerStyle: CSSProperties = {
  borderTop: `1px solid ${colorTokens.border.primary}`,
  overflow: "hidden",
};

const resizerBaseStyle: CSSProperties = {
  position: "absolute",
  backgroundColor: "transparent",
  transition: "background-color 0.15s",
  zIndex: 10,
};

const verticalResizerStyle: CSSProperties = {
  ...resizerBaseStyle,
  width: `${RESIZER_WIDTH}px`,
  top: 0,
  bottom: 0,
  cursor: "col-resize",
};

const horizontalResizerStyle: CSSProperties = {
  ...resizerBaseStyle,
  height: `${RESIZER_WIDTH}px`,
  left: 0,
  right: 0,
  cursor: "row-resize",
};

// =============================================================================
// Resizer Hook
// =============================================================================

type ResizeDirection = "horizontal" | "vertical";

function useResizer(
  direction: ResizeDirection,
  initialValue: number,
  min: number,
  max: number,
  onChange?: (value: number) => void,
  invert: boolean = false
): {
  value: number;
  isResizing: boolean;
  onMouseDown: (e: ReactMouseEvent) => void;
} {
  const [value, setValue] = useState(initialValue);
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const startValueRef = useRef(0);

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      const delta =
        direction === "horizontal"
          ? e.clientX - startPosRef.current
          : e.clientY - startPosRef.current;

      const adjustedDelta = invert ? -delta : delta;
      const newValue = Math.min(max, Math.max(min, startValueRef.current + adjustedDelta));

      setValue(newValue);
      onChange?.(newValue);
    },
    [direction, min, max, onChange, invert]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp, direction]);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      startPosRef.current = direction === "horizontal" ? e.clientX : e.clientY;
      startValueRef.current = value;
      setIsResizing(true);
    },
    [direction, value]
  );

  return { value, isResizing, onMouseDown };
}

// =============================================================================
// Component
// =============================================================================

export function EditorLayout({
  navigator,
  editor,
  inspector,
  console: consolePanel,
  navigatorWidth = DEFAULT_NAVIGATOR_WIDTH,
  inspectorWidth = DEFAULT_INSPECTOR_WIDTH,
  consoleHeight = DEFAULT_CONSOLE_HEIGHT,
  showNavigator = true,
  showInspector = true,
  showConsole = false,
  minNavigatorWidth = DEFAULT_MIN_WIDTH,
  maxNavigatorWidth = DEFAULT_MAX_WIDTH,
  minInspectorWidth = DEFAULT_MIN_WIDTH,
  maxInspectorWidth = DEFAULT_MAX_WIDTH,
  minConsoleHeight = DEFAULT_MIN_HEIGHT,
  maxConsoleHeight = DEFAULT_MAX_HEIGHT,
  onNavigatorWidthChange,
  onInspectorWidthChange,
  onConsoleHeightChange,
  style,
}: EditorLayoutProps): ReactNode {
  const navResizer = useResizer(
    "horizontal",
    navigatorWidth,
    minNavigatorWidth,
    maxNavigatorWidth,
    onNavigatorWidthChange
  );

  const inspResizer = useResizer(
    "horizontal",
    inspectorWidth,
    minInspectorWidth,
    maxInspectorWidth,
    onInspectorWidthChange,
    true
  );

  const consoleResizer = useResizer(
    "vertical",
    consoleHeight,
    minConsoleHeight,
    maxConsoleHeight,
    onConsoleHeightChange,
    true
  );

  const resizerHoverColor = colorTokens.accent.primary;

  return (
    <div style={{ ...containerStyle, ...style }}>
      {/* Main horizontal area */}
      <div style={mainAreaStyle}>
        {/* Navigator Panel */}
        {showNavigator && navigator && (
          <div style={{ ...navigatorStyle, width: navResizer.value, position: "relative" }}>
            {navigator}
            {/* Navigator resizer */}
            <div
              style={{
                ...verticalResizerStyle,
                right: 0,
                transform: "translateX(50%)",
                ...(navResizer.isResizing ? { backgroundColor: resizerHoverColor } : {}),
              }}
              onMouseDown={navResizer.onMouseDown}
              onMouseEnter={(e) => {
                if (!navResizer.isResizing) {
                  e.currentTarget.style.backgroundColor = resizerHoverColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!navResizer.isResizing) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            />
          </div>
        )}

        {/* Editor Panel */}
        <div style={editorStyle}>{editor}</div>

        {/* Inspector Panel */}
        {showInspector && inspector && (
          <div style={{ ...inspectorStyle, width: inspResizer.value, position: "relative" }}>
            {/* Inspector resizer */}
            <div
              style={{
                ...verticalResizerStyle,
                left: 0,
                transform: "translateX(-50%)",
                ...(inspResizer.isResizing ? { backgroundColor: resizerHoverColor } : {}),
              }}
              onMouseDown={inspResizer.onMouseDown}
              onMouseEnter={(e) => {
                if (!inspResizer.isResizing) {
                  e.currentTarget.style.backgroundColor = resizerHoverColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!inspResizer.isResizing) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            />
            {inspector}
          </div>
        )}
      </div>

      {/* Console Panel */}
      {showConsole && consolePanel && (
        <div
          style={{
            ...consoleContainerStyle,
            height: consoleResizer.value,
            position: "relative",
          }}
        >
          {/* Console resizer */}
          <div
            style={{
              ...horizontalResizerStyle,
              top: 0,
              transform: "translateY(-50%)",
              ...(consoleResizer.isResizing ? { backgroundColor: resizerHoverColor } : {}),
            }}
            onMouseDown={consoleResizer.onMouseDown}
            onMouseEnter={(e) => {
              if (!consoleResizer.isResizing) {
                e.currentTarget.style.backgroundColor = resizerHoverColor;
              }
            }}
            onMouseLeave={(e) => {
              if (!consoleResizer.isResizing) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          />
          {consolePanel}
        </div>
      )}
    </div>
  );
}
