/**
 * @file Presentation editor layout schemas
 *
 * Centralizes desktop/tablet/mobile layout definitions as data.
 */

import type { PanelLayoutConfig } from "react-panel-layout";
import { EDITOR_GRID_CONFIG, EDITOR_GRID_CONFIG_MOBILE, EDITOR_GRID_CONFIG_NO_INSPECTOR, EDITOR_GRID_CONFIG_TABLET } from "./EditorLayoutConfig";
import type { EditorLayoutMode } from "./responsive-layout";
import type { LayerPlacements } from "./layer-placements";

export type PresentationEditorOverlaySchema = {
  readonly show: boolean;
  readonly showSlidesButton: boolean;
  readonly showInspectorButton: boolean;
};

export type PresentationEditorLayoutSchema = {
  readonly gridLayoutConfig: PanelLayoutConfig;
  readonly placements: LayerPlacements;
  readonly overlay: PresentationEditorOverlaySchema;
};

export type PresentationEditorLayoutSchemaInput = {
  readonly showInspector: boolean;
  readonly slidesDrawerOpen: boolean;
  readonly setSlidesDrawerOpen: (open: boolean) => void;
  readonly inspectorDrawerOpen: boolean;
  readonly setInspectorDrawerOpen: (open: boolean) => void;
};

/**
 * Returns per-mode layout schemas for PresentationEditor.
 *
 * Drawer configs are controlled via the provided open state + setters.
 */
export function createPresentationEditorLayoutSchemas(
  input: PresentationEditorLayoutSchemaInput,
): Record<EditorLayoutMode, PresentationEditorLayoutSchema> {
  const desktop: PresentationEditorLayoutSchema = {
    gridLayoutConfig: input.showInspector ? EDITOR_GRID_CONFIG : EDITOR_GRID_CONFIG_NO_INSPECTOR,
    placements: {
      thumbnails: { type: "grid", gridArea: "thumbnails", scrollable: true },
      inspector: { type: "grid", gridArea: "inspector" },
    },
    overlay: { show: false, showSlidesButton: false, showInspectorButton: false },
  };

  const tablet: PresentationEditorLayoutSchema = {
    gridLayoutConfig: EDITOR_GRID_CONFIG_TABLET,
    placements: {
      thumbnails: { type: "grid", gridArea: "thumbnails", scrollable: true },
      inspector: {
        type: "drawer",
        drawer: {
          open: input.inspectorDrawerOpen,
          onStateChange: input.setInspectorDrawerOpen,
          dismissible: true,
          chrome: false,
          inline: true,
          anchor: "right",
          transitionMode: "css",
          transitionDuration: "250ms",
          transitionEasing: "cubic-bezier(0.16, 1, 0.3, 1)",
          ariaLabel: "Inspector",
        },
        width: 360,
        height: "100%",
        position: { right: 0, top: 0 },
        zIndex: 200,
      },
    },
    overlay: {
      show: true,
      showSlidesButton: false,
      showInspectorButton: input.showInspector,
    },
  };

  const mobile: PresentationEditorLayoutSchema = {
    gridLayoutConfig: EDITOR_GRID_CONFIG_MOBILE,
    placements: {
      thumbnails: {
        type: "drawer",
        drawer: {
          open: input.slidesDrawerOpen,
          onStateChange: input.setSlidesDrawerOpen,
          dismissible: true,
          chrome: false,
          inline: true,
          anchor: "left",
          transitionMode: "css",
          transitionDuration: "250ms",
          transitionEasing: "cubic-bezier(0.16, 1, 0.3, 1)",
          ariaLabel: "Slides",
        },
        width: "80vw",
        height: "100%",
        position: { left: 0, top: 0 },
        zIndex: 200,
      },
      inspector: {
        type: "drawer",
        drawer: {
          open: input.inspectorDrawerOpen,
          onStateChange: input.setInspectorDrawerOpen,
          dismissible: true,
          chrome: false,
          inline: true,
          anchor: "bottom",
          transitionMode: "css",
          transitionDuration: "250ms",
          transitionEasing: "cubic-bezier(0.16, 1, 0.3, 1)",
          ariaLabel: "Inspector",
        },
        width: "100%",
        height: "60%",
        position: { left: 0, bottom: 0 },
        zIndex: 200,
      },
    },
    overlay: {
      show: true,
      showSlidesButton: true,
      showInspectorButton: input.showInspector,
    },
  };

  return { desktop, tablet, mobile };
}
