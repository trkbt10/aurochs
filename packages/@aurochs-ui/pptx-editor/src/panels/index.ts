/**
 * @file Panel components for PPTX editor
 *
 * Mountable panel/toolbar components:
 * - PropertyPanel: Shape/slide property editor (right panel)
 * - LayerPanel: Shape hierarchy view (right panel)
 * - SlideThumbnailPanel: Slide navigation (left panel)
 * - CreationToolbar: Shape creation tools (toolbar)
 * - ShapeToolbar: Shape editing tools (toolbar)
 *
 * Right panel tabs (for pivot layout):
 * - SelectedElementTab: Selected shape properties
 * - SlideInfoTab: Slide background and layout
 * - LayersTab: Layer hierarchy
 *
 * Inspector panels (read-only views):
 * - AssetPanel: Embedded assets browser
 * - LayoutInfoPanel: Layout information viewer
 * - ThemeViewerPanel: Theme colors and fonts viewer
 */

export { PropertyPanel } from "./PropertyPanel";
export type { PropertyPanelProps } from "./PropertyPanel";

export { LayerPanel } from "./LayerPanel";
export type { LayerPanelProps } from "./LayerPanel";

export { SlideThumbnailPanel } from "./SlideThumbnailPanel";
export type { SlideThumbnailPanelProps } from "./SlideThumbnailPanel";

export { CreationToolbar } from "./CreationToolbar";
export type { CreationToolbarProps } from "./CreationToolbar";

export { ShapeToolbar } from "./ShapeToolbar";
export type { ShapeToolbarProps } from "./ShapeToolbar";

// Right panel tabs
export { SelectedElementTab, SlideInfoTab, LayersTab } from "./right-panel";
export type { SelectedElementTabProps, SlideInfoTabProps, LayersTabProps } from "./right-panel";

// Inspector panels
export { AssetPanel, LayoutInfoPanel, ThemeViewerPanel } from "./inspector";
export type { AssetPanelProps, LayoutInfoPanelProps, ThemeViewerPanelProps } from "./inspector";

// Property sub-panels (internal components used by PropertyPanel)
export { SlidePropertiesPanel } from "./property/SlidePropertiesPanel";
export { MultiSelectState } from "./property/MultiSelectState";
export { SpShapePanel } from "./property/SpShapePanel";
export { PicShapePanel } from "./property/PicShapePanel";
export { CxnShapePanel } from "./property/CxnShapePanel";
export { GrpShapePanel } from "./property/GrpShapePanel";
export { TableFramePanel } from "./property/TableFramePanel";
export { ChartFramePanel } from "./property/ChartFramePanel";
export { DiagramFramePanel } from "./property/DiagramFramePanel";
export { OleFramePanel } from "./property/OleFramePanel";
export { UnknownShapePanel } from "./property/UnknownShapePanel";
