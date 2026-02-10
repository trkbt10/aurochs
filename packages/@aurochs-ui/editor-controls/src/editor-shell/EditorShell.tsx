/**
 * @file EditorShell — responsive 3-panel layout shell
 *
 * Provides a slot-based layout with optional left/right panels, toolbar,
 * and bottom bar. Automatically switches between grid and drawer modes
 * based on container width.
 */

import { useRef, useMemo, useState, useEffect, useCallback, type CSSProperties } from "react";
import { GridLayout } from "react-panel-layout";
import type { LayerDefinition } from "react-panel-layout";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import { useContainerWidth } from "./useContainerWidth";
import { resolveEditorLayoutMode, DEFAULT_EDITOR_LAYOUT_BREAKPOINTS } from "./responsive-layout";
import { resolveEditorShellSchema, type LayerPlacement } from "./editor-shell-schema";
import { editorContainerStyle, toolbarStyle, gridContainerStyle, bottomBarStyle } from "./editor-styles";
import type { EditorShellProps } from "./types";

// ---------------------------------------------------------------------------
// Internal border styles applied around panel content
// ---------------------------------------------------------------------------

const leftPanelWrapperStyle: CSSProperties = {
  height: "100%",
  borderRight: "1px solid var(--border-subtle, #333)",
  overflow: "hidden",
};

const rightPanelWrapperStyle: CSSProperties = {
  height: "100%",
  borderLeft: "1px solid var(--border-subtle, #333)",
  overflow: "hidden",
};

const overlayContainerStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  display: "flex",
  gap: 8,
  zIndex: 250,
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
 */
export function EditorShell({
  toolbar,
  leftPanel,
  children,
  rightPanel,
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
        leftPanel,
        rightPanel,
        leftDrawerOpen,
        setLeftDrawerOpen,
        rightDrawerOpen,
        setRightDrawerOpen,
      }),
    [responsiveMode, leftPanel, rightPanel, leftDrawerOpen, rightDrawerOpen],
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

  const showOverlay = schema.showLeftDrawerButton || schema.showRightDrawerButton;

  return (
    <div style={{ ...editorContainerStyle, ...style }} className={className}>
      {toolbar && <div style={toolbarStyle}>{toolbar}</div>}
      <div ref={containerRef} style={gridContainerStyle}>
        <GridLayout config={schema.gridConfig} layers={layers} />
        {showOverlay && (
          <div style={overlayContainerStyle}>
            {schema.showLeftDrawerButton && leftPanel?.drawerLabel && (
              <Button variant="secondary" size="sm" onClick={handleToggleLeftDrawer} title={`Toggle ${leftPanel.drawerLabel}`}>
                {leftPanel.drawerLabel}
              </Button>
            )}
            {schema.showRightDrawerButton && rightPanel?.drawerLabel && (
              <Button variant="secondary" size="sm" onClick={handleToggleRightDrawer} title={`Toggle ${rightPanel.drawerLabel}`}>
                {rightPanel.drawerLabel}
              </Button>
            )}
          </div>
        )}
      </div>
      {bottomBar && <div style={bottomBarStyle}>{bottomBar}</div>}
    </div>
  );
}
