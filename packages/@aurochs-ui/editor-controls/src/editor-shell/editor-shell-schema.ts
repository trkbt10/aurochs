/**
 * @file Editor shell schema builder
 *
 * Resolves responsive layout mode + panel configuration into
 * a concrete grid config and drawer placements for EditorShell.
 */

import type { DrawerBehavior, PanelLayoutConfig, WindowPosition } from "react-panel-layout";
import { buildEditorGridConfig } from "./grid-config";
import type { EditorLayoutMode, EditorPanel } from "./types";

// ---------------------------------------------------------------------------
// Layer placement types (generalized from pptx-editor's layer-placements.ts)
// ---------------------------------------------------------------------------

export type LayerPlacement =
  | {
      readonly type: "grid";
      readonly gridArea: string;
      readonly scrollable?: boolean;
    }
  | {
      readonly type: "drawer";
      readonly drawer: DrawerBehavior;
      readonly width?: string | number;
      readonly height?: string | number;
      readonly position?: WindowPosition;
      readonly zIndex?: number;
      readonly scrollable?: boolean;
    }
  | {
      readonly type: "hidden";
    };

// ---------------------------------------------------------------------------
// Schema output
// ---------------------------------------------------------------------------

export type EditorShellSchema = {
  readonly gridConfig: PanelLayoutConfig;
  readonly leftPlacement: LayerPlacement;
  readonly rightPlacement: LayerPlacement;
  readonly showLeftDrawerButton: boolean;
  readonly showRightDrawerButton: boolean;
};

// ---------------------------------------------------------------------------
// Shared drawer constants
// ---------------------------------------------------------------------------

const DRAWER_TRANSITION_MODE = "css" as const;
const DRAWER_TRANSITION_DURATION = "250ms";
const DRAWER_TRANSITION_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

// ---------------------------------------------------------------------------
// Schema resolver
// ---------------------------------------------------------------------------

export type EditorShellSchemaInput = {
  readonly mode: EditorLayoutMode;
  readonly panels: EditorPanel[];
  readonly leftDrawerOpen: boolean;
  readonly setLeftDrawerOpen: (open: boolean) => void;
  readonly rightDrawerOpen: boolean;
  readonly setRightDrawerOpen: (open: boolean) => void;
};

/**
 * Helper to extract left/right panels from panels array.
 */
function extractPanels(panels: EditorPanel[]): {
  leftPanel: EditorPanel | undefined;
  rightPanel: EditorPanel | undefined;
} {
  return {
    leftPanel: panels.find((p) => p.position === "left"),
    rightPanel: panels.find((p) => p.position === "right"),
  };
}

const HIDDEN: LayerPlacement = { type: "hidden" };

function gridPlacement(gridArea: string, panel: EditorPanel): LayerPlacement {
  return { type: "grid", gridArea, scrollable: panel.scrollable };
}

type DrawerPlacementOptions = {
  readonly panel: EditorPanel;
  readonly open: boolean;
  readonly onStateChange: (open: boolean) => void;
  readonly anchor: "left" | "right" | "bottom";
  readonly width: string | number;
  readonly height: string | number;
  readonly position: WindowPosition;
  readonly defaultLabel: string;
};

function drawerPlacement(options: DrawerPlacementOptions): LayerPlacement {
  const drawer: DrawerBehavior = {
    open: options.open,
    onStateChange: options.onStateChange,
    dismissible: true,
    chrome: false,
    inline: true,
    anchor: options.anchor,
    transitionMode: DRAWER_TRANSITION_MODE,
    transitionDuration: DRAWER_TRANSITION_DURATION,
    transitionEasing: DRAWER_TRANSITION_EASING,
    ariaLabel: options.panel.drawerLabel ?? options.defaultLabel,
  };
  return {
    type: "drawer",
    drawer,
    width: options.width,
    height: options.height,
    position: options.position,
    zIndex: 200,
    scrollable: options.panel.scrollable,
  };
}

/**
 * Resolves the responsive layout mode and panel configuration into a concrete
 * grid config + drawer placements for EditorShell rendering.
 *
 * Responsive behavior:
 * | Mode    | Left panel          | Right panel            |
 * |---------|---------------------|------------------------|
 * | desktop | grid                | grid                   |
 * | tablet  | grid                | drawer (right, 360px)  |
 * | mobile  | drawer (left, 80vw) | drawer (bottom, 60%)   |
 *
 * Panels are automatically shown in drawer mode when present.
 * The optional `drawerLabel` property customizes the drawer button label.
 */
export function resolveEditorShellSchema(input: EditorShellSchemaInput): EditorShellSchema {
  switch (input.mode) {
    case "desktop":
      return resolveDesktop(input);
    case "tablet":
      return resolveTablet(input);
    case "mobile":
      return resolveMobile(input);
  }
}

function resolveDesktop(input: EditorShellSchemaInput): EditorShellSchema {
  const { leftPanel, rightPanel } = extractPanels(input.panels);

  const gridConfig = buildEditorGridConfig({
    hasLeft: !!leftPanel,
    hasRight: !!rightPanel,
    leftSize: leftPanel?.size,
    leftMinSize: leftPanel?.minSize,
    leftMaxSize: leftPanel?.maxSize,
    leftResizable: leftPanel?.resizable,
    rightSize: rightPanel?.size,
    rightMinSize: rightPanel?.minSize,
    rightMaxSize: rightPanel?.maxSize,
    rightResizable: rightPanel?.resizable,
  });

  return {
    gridConfig,
    leftPlacement: leftPanel ? gridPlacement("left", leftPanel) : HIDDEN,
    rightPlacement: rightPanel ? gridPlacement("right", rightPanel) : HIDDEN,
    showLeftDrawerButton: false,
    showRightDrawerButton: false,
  };
}

function resolveTabletRightPlacement(
  rightPanel: EditorPanel | undefined,
  rightDrawerOpen: boolean,
  setRightDrawerOpen: (open: boolean) => void,
): LayerPlacement {
  if (!rightPanel) {
    return HIDDEN;
  }
  return drawerPlacement({
    panel: rightPanel,
    open: rightDrawerOpen,
    onStateChange: setRightDrawerOpen,
    anchor: "right",
    width: 360,
    height: "100%",
    position: { right: 0, top: 0 },
    defaultLabel: "Right panel",
  });
}

function resolveTablet(input: EditorShellSchemaInput): EditorShellSchema {
  const { leftPanel, rightPanel } = extractPanels(input.panels);

  const gridConfig = buildEditorGridConfig({
    hasLeft: !!leftPanel,
    hasRight: false,
    leftSize: leftPanel?.size,
    leftMinSize: leftPanel?.minSize,
    leftMaxSize: leftPanel?.maxSize,
    leftResizable: leftPanel?.resizable,
  });

  return {
    gridConfig,
    leftPlacement: leftPanel ? gridPlacement("left", leftPanel) : HIDDEN,
    rightPlacement: resolveTabletRightPlacement(rightPanel, input.rightDrawerOpen, input.setRightDrawerOpen),
    showLeftDrawerButton: false,
    showRightDrawerButton: !!rightPanel,
  };
}

function resolveMobileLeftPlacement(
  leftPanel: EditorPanel | undefined,
  leftDrawerOpen: boolean,
  setLeftDrawerOpen: (open: boolean) => void,
): LayerPlacement {
  if (!leftPanel) {
    return HIDDEN;
  }
  return drawerPlacement({
    panel: leftPanel,
    open: leftDrawerOpen,
    onStateChange: setLeftDrawerOpen,
    anchor: "left",
    width: "80vw",
    height: "100%",
    position: { left: 0, top: 0 },
    defaultLabel: "Left panel",
  });
}

function resolveMobileRightPlacement(
  rightPanel: EditorPanel | undefined,
  rightDrawerOpen: boolean,
  setRightDrawerOpen: (open: boolean) => void,
): LayerPlacement {
  if (!rightPanel) {
    return HIDDEN;
  }
  return drawerPlacement({
    panel: rightPanel,
    open: rightDrawerOpen,
    onStateChange: setRightDrawerOpen,
    anchor: "bottom",
    width: "100%",
    height: "60%",
    position: { left: 0, bottom: 0 },
    defaultLabel: "Right panel",
  });
}

function resolveMobile(input: EditorShellSchemaInput): EditorShellSchema {
  const { leftPanel, rightPanel } = extractPanels(input.panels);

  const gridConfig = buildEditorGridConfig({
    hasLeft: false,
    hasRight: false,
  });

  return {
    gridConfig,
    leftPlacement: resolveMobileLeftPlacement(leftPanel, input.leftDrawerOpen, input.setLeftDrawerOpen),
    rightPlacement: resolveMobileRightPlacement(rightPanel, input.rightDrawerOpen, input.setRightDrawerOpen),
    showLeftDrawerButton: !!leftPanel,
    showRightDrawerButton: !!rightPanel,
  };
}
