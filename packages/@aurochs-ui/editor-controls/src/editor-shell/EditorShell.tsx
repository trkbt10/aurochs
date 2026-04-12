/**
 * @file EditorShell — responsive 3-panel layout shell
 *
 * Provides a slot-based layout with optional left/right panels, toolbar,
 * and bottom bar. Automatically switches between grid and drawer modes
 * based on container width.
 *
 * When panels collapse into drawers at narrow widths, toggle buttons are
 * integrated into the toolbar row — not overlaid on the canvas. This keeps
 * the drawer controls within the established operation context (the toolbar)
 * and avoids obscuring the editing surface.
 */

import { useRef, useMemo, useState, useEffect, useCallback, type CSSProperties } from "react";
import { GridLayout } from "react-panel-layout";
import type { LayerDefinition } from "react-panel-layout";
import { SidebarIcon } from "@aurochs-ui/ui-components/icons";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import { useContainerWidth } from "./useContainerWidth";
import { resolveEditorLayoutMode, DEFAULT_EDITOR_LAYOUT_BREAKPOINTS } from "./responsive-layout";
import { resolveEditorShellSchema, type LayerPlacement } from "./editor-shell-schema";
import { editorContainerStyle, toolbarStyle, gridContainerStyle, bottomBarStyle } from "./editor-styles";
import type { EditorShellProps } from "./types";
import { EditorShellContextProvider, type EditorShellContextValue } from "./EditorShellContext";

// ---------------------------------------------------------------------------
// Internal border styles applied around panel content
// ---------------------------------------------------------------------------

const leftPanelWrapperStyle: CSSProperties = {
  height: "100%",
  borderRight: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  overflow: "hidden",
};

const rightPanelWrapperStyle: CSSProperties = {
  height: "100%",
  borderLeft: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  overflow: "hidden",
};

// ---------------------------------------------------------------------------
// Toolbar integration styles
// ---------------------------------------------------------------------------

/**
 * When the consumer supplies a toolbar, we wrap it in a flex row together
 * with any drawer toggle buttons. The consumer toolbar fills the center
 * via `flex: 1; min-width: 0` so it can shrink naturally.
 */
const toolbarRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
};

const TOGGLE_ICON_SIZE = 18;

const drawerToggleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  padding: 0,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  backgroundColor: "transparent",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  transition: "background-color 0.15s, color 0.15s",
  flexShrink: 0,
};

const drawerToggleActiveStyle: CSSProperties = {
  ...drawerToggleStyle,
  backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLayerFromPlacement(
  id: string,
  placement: LayerPlacement,
  component: React.ReactNode,
): LayerDefinition | undefined {
  if (placement.type === "hidden") {
    return undefined;
  }

  if (placement.type === "grid") {
    return {
      id,
      component,
      gridArea: placement.gridArea,
      scrollable: placement.scrollable,
    };
  }

  return {
    id,
    component,
    drawer: placement.drawer,
    width: placement.width,
    height: placement.height,
    position: placement.position,
    zIndex: placement.zIndex,
    scrollable: placement.scrollable,
  };
}

// ---------------------------------------------------------------------------
// EditorShell
// ---------------------------------------------------------------------------

/**
 * Responsive 3-panel layout shell.
 *
 * Desktop: left (grid) + center + right (grid)
 * Tablet: left (grid) + center + right (drawer)
 * Mobile: center + left (drawer) + right (drawer)
 *
 * Drawer toggle buttons are placed inside the toolbar row so that panel
 * controls stay in the same operational context as other editor actions
 * (undo, zoom, etc.), rather than floating over the canvas.
 */
export function EditorShell({
  toolbar,
  panels = [],
  children,
  bottomBar,
  breakpoints,
  style,
  className,
}: EditorShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const containerWidth = useContainerWidth(containerRef);
  const effectiveBreakpoints = breakpoints ?? DEFAULT_EDITOR_LAYOUT_BREAKPOINTS;

  const responsiveMode = useMemo(
    () => resolveEditorLayoutMode(containerWidth, effectiveBreakpoints),
    [containerWidth, effectiveBreakpoints],
  );

  // Extract left/right panels from panels array
  const leftPanel = useMemo(() => panels.find((p) => p.position === "left"), [panels]);
  const rightPanel = useMemo(() => panels.find((p) => p.position === "right"), [panels]);

  // Drawer open state
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // Reset drawers on mode change
  useEffect(() => {
    if (responsiveMode === "desktop") {
      setLeftDrawerOpen(false);
      setRightDrawerOpen(false);
    } else if (responsiveMode === "tablet") {
      setLeftDrawerOpen(false);
    }
  }, [responsiveMode]);

  // Close right drawer when right panel is removed
  useEffect(() => {
    if (!rightPanel && rightDrawerOpen) {
      setRightDrawerOpen(false);
    }
  }, [rightPanel, rightDrawerOpen]);

  // Resolve schema
  const schema = useMemo(
    () =>
      resolveEditorShellSchema({
        mode: responsiveMode,
        panels,
        leftDrawerOpen,
        setLeftDrawerOpen,
        rightDrawerOpen,
        setRightDrawerOpen,
      }),
    [responsiveMode, panels, leftDrawerOpen, rightDrawerOpen],
  );

  // Wrap panel content with border styles
  const leftComponent = useMemo(() => {
    if (!leftPanel) {
      return null;
    }
    return <div style={{ ...leftPanelWrapperStyle, ...leftPanel.style }}>{leftPanel.content}</div>;
  }, [leftPanel]);

  const rightComponent = useMemo(() => {
    if (!rightPanel) {
      return null;
    }
    return <div style={{ ...rightPanelWrapperStyle, ...rightPanel.style }}>{rightPanel.content}</div>;
  }, [rightPanel]);

  // Build layers
  const layers = useMemo<LayerDefinition[]>(() => {
    const result: LayerDefinition[] = [];

    if (leftComponent) {
      const leftLayer = buildLayerFromPlacement("left", schema.leftPlacement, leftComponent);
      if (leftLayer) {
        result.push(leftLayer);
      }
    }

    result.push({
      id: "center",
      gridArea: "center",
      component: children,
    });

    if (rightComponent) {
      const rightLayer = buildLayerFromPlacement("right", schema.rightPlacement, rightComponent);
      if (rightLayer) {
        result.push(rightLayer);
      }
    }

    return result;
  }, [schema, leftComponent, rightComponent, children]);

  // Drawer toggle callbacks
  const handleToggleLeftDrawer = useCallback(() => {
    setLeftDrawerOpen((v) => {
      const next = !v;
      if (next) {
        setRightDrawerOpen(false);
      }
      return next;
    });
  }, []);

  const handleToggleRightDrawer = useCallback(() => {
    setRightDrawerOpen((v) => {
      const next = !v;
      if (next) {
        setLeftDrawerOpen(false);
      }
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Toolbar rendering with integrated drawer toggles
  // -------------------------------------------------------------------------

  const needsLeftToggle = schema.showLeftDrawerButton && !!leftPanel;
  const needsRightToggle = schema.showRightDrawerButton && !!rightPanel;
  const needsAnyToggle = needsLeftToggle || needsRightToggle;

  const toolbarRow = useMemo(() => {
    // Desktop mode with no drawers — render toolbar as-is (or nothing)
    if (!needsAnyToggle) {
      return toolbar ?? null;
    }

    // Drawer mode — compose toggle buttons with the consumer toolbar.
    // Left toggle sits at the start of the row, right toggle at the end.
    // If there is no consumer toolbar, the toggles form a minimal toolbar row.
    const LeftIcon = leftPanel?.drawerIcon ?? SidebarIcon;
    const leftToggle = needsLeftToggle ? (
      <button
        type="button"
        style={leftDrawerOpen ? drawerToggleActiveStyle : drawerToggleStyle}
        onClick={handleToggleLeftDrawer}
        title={leftPanel!.drawerLabel ?? "Left panel"}
        aria-label={leftPanel!.drawerLabel ?? "Left panel"}
        aria-pressed={leftDrawerOpen}
      >
        <LeftIcon size={TOGGLE_ICON_SIZE} />
      </button>
    ) : null;

    const RightIcon = rightPanel?.drawerIcon ?? SidebarIcon;
    const rightToggle = needsRightToggle ? (
      <button
        type="button"
        style={rightDrawerOpen ? drawerToggleActiveStyle : drawerToggleStyle}
        onClick={handleToggleRightDrawer}
        title={rightPanel!.drawerLabel ?? "Right panel"}
        aria-label={rightPanel!.drawerLabel ?? "Right panel"}
        aria-pressed={rightDrawerOpen}
      >
        <RightIcon size={TOGGLE_ICON_SIZE} />
      </button>
    ) : null;

    return (
      <div style={toolbarRowStyle}>
        {leftToggle}
        {toolbar && <div style={{ flex: 1, minWidth: 0 }}>{toolbar}</div>}
        {rightToggle}
      </div>
    );
  }, [
    needsAnyToggle,
    needsLeftToggle,
    needsRightToggle,
    toolbar,
    leftPanel,
    rightPanel,
    leftDrawerOpen,
    rightDrawerOpen,
    handleToggleLeftDrawer,
    handleToggleRightDrawer,
  ]);

  // Whether the toolbar row should be rendered at all
  const showToolbarRow = toolbar != null || needsAnyToggle;

  // -------------------------------------------------------------------------
  // Context value — lets descendants dismiss drawers after operations
  // -------------------------------------------------------------------------

  const dismissDrawer = useCallback((position: "left" | "right") => {
    if (position === "left") {
      setLeftDrawerOpen(false);
    } else {
      setRightDrawerOpen(false);
    }
  }, []);

  const shellContext = useMemo<EditorShellContextValue>(() => ({
    mode: responsiveMode,
    dismissDrawer,
  }), [responsiveMode, dismissDrawer]);

  return (
    <EditorShellContextProvider value={shellContext}>
      <div style={{ ...editorContainerStyle, ...style }} className={className}>
        {showToolbarRow && <div style={toolbarStyle}>{toolbarRow}</div>}
        <div ref={containerRef} style={gridContainerStyle}>
          <GridLayout config={schema.gridConfig} layers={layers} />
        </div>
        {bottomBar && <div style={bottomBarStyle}>{bottomBar}</div>}
      </div>
    </EditorShellContextProvider>
  );
}
