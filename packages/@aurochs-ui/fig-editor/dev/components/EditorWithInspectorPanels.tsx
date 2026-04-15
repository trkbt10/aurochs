/**
 * @file Panel configuration that adds FigInspectorPanel to FigEditor.
 *
 * Demonstrates how to use FigEditor's `panels` prop to compose
 * a custom panel layout including the inspector.
 */

import type { CSSProperties } from "react";
import type { EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { Tabs } from "@aurochs-ui/ui-components";
import { PageListPanel } from "../../src/panels/PageListPanel";
import { LayerPanel } from "../../src/panels/LayerPanel";
import { PropertyPanel } from "../../src/panels/PropertyPanel";
import { FigInspectorPanel } from "../../src/panels/FigInspectorPanel";

// =============================================================================
// Left panel (unchanged from default)
// =============================================================================

const leftPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

const layerPanelWrapperStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
};

function LeftPanelContent() {
  return (
    <div style={leftPanelStyle}>
      <PageListPanel />
      <div style={layerPanelWrapperStyle}>
        <LayerPanel />
      </div>
    </div>
  );
}

// =============================================================================
// Right panel: Inspector + Properties in tabs
// =============================================================================

type RightTab = "inspector" | "properties";

function RightPanelContent() {
  return (
    <Tabs<RightTab>
      items={[
        { id: "inspector", label: "Inspector", content: <FigInspectorPanel /> },
        { id: "properties", label: "Properties", content: <PropertyPanel /> },
      ]}
      defaultValue="inspector"
      size="sm"
      style={{ height: "100%", overflow: "hidden" }}
    />
  );
}

// =============================================================================
// Panel configuration
// =============================================================================

/**
 * Panel configuration for FigEditor with inspector.
 *
 * Usage:
 * ```tsx
 * <FigEditor initialDocument={doc} panels={EDITOR_PANELS_WITH_INSPECTOR} />
 * ```
 */
export const EDITOR_PANELS_WITH_INSPECTOR: EditorPanel[] = [
  {
    id: "pages-layers",
    position: "left",
    content: <LeftPanelContent />,
    drawerLabel: "Pages & Layers",
    scrollable: false,
  },
  {
    id: "inspector-properties",
    position: "right",
    content: <RightPanelContent />,
    drawerLabel: "Inspector",
    scrollable: false,
  },
];
