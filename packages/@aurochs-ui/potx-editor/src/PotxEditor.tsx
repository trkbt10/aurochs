/**
 * @file PotxEditor - PowerPoint Template Editor
 *
 * Main component for editing POTX (PowerPoint template) files.
 * Uses shared components: ItemList, LayoutThumbnail, EditorCanvas, SlideRenderer.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Shape, Slide } from "@aurochs-office/pptx/domain";
import type { SchemeColorName } from "@aurochs-office/drawing-ml/domain/color";
import type { FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import type { PresentationFile, SlideSize } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { buildSlideLayoutOptions, loadSlideLayoutBundle } from "@aurochs-office/pptx/app";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";
import type { ThemePreset } from "./panels/types";
import { useThemeEditor } from "./context/ThemeEditorContext";
import { ColorSchemeEditor } from "./panels/ColorSchemeEditor";
import { FontSchemeEditor } from "./panels/FontSchemeEditor";
import { ThemePresetSelector } from "./panels/ThemePresetSelector";
import { LayoutAttributesSection } from "./panels/LayoutAttributesSection";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import {
  EditorCanvas,
  type EditorCanvasHandle,
  type EditorCanvasItemBounds,
} from "@aurochs-ui/editor-controls/canvas";
import { ItemList, type ListItem } from "@aurochs-ui/editor-controls/item-list";
import {
  useCanvasHandlers,
  LayoutThumbnail,
  useLayoutThumbnails,
  loadLayoutWithContext,
} from "@aurochs-ui/ooxml-components";
import { collectShapeRenderData } from "@aurochs-ui/editor-controls/shape-editor";
import type { RenderDataResolver } from "@aurochs-ui/editor-controls/shape-editor";
import { isShapeHidden, getShapeTransform } from "@aurochs-renderer/pptx/svg";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";

// =============================================================================
// Types
// =============================================================================

export type PotxEditorProps = {
  readonly presentationFile?: PresentationFile;
  readonly slideSize?: SlideSize;
  readonly className?: string;
};

type LayoutListItem = ListItem<string> & {
  readonly name: string;
  readonly shapes: readonly Shape[];
  readonly svg: string;
};

// =============================================================================
// PPTX Render Resolver
// =============================================================================

function getFillColor(shape: Shape): string | undefined {
  if (!("properties" in shape)) return undefined;
  const fill = shape.properties.fill;
  if (!fill || fill.type !== "solidFill") return "#cccccc";
  if (fill.color.spec.type === "srgb") return `#${fill.color.spec.value}`;
  return "#cccccc";
}

const pptxRenderResolver: RenderDataResolver = {
  getTransform(shape) {
    const t = getShapeTransform(shape as Shape);
    if (!t) return undefined;
    return { x: t.x as number, y: t.y as number, width: t.width as number, height: t.height as number, rotation: t.rotation as number };
  },
  getGroupTransform() { return undefined; },
  isHidden: (shape) => isShapeHidden(shape as Shape),
  getFillColor: (shape) => getFillColor(shape as Shape),
  getStrokeColor: () => undefined,
  getStrokeWidth: () => 1,
};

// =============================================================================
// Component
// =============================================================================

export function PotxEditor({ presentationFile, slideSize, className }: PotxEditorProps) {
  const { state, dispatch } = useThemeEditor();
  const { colorScheme, fontScheme, layoutEdit } = state;
  const canvasRef = useRef<EditorCanvasHandle>(null);

  // Init layout list
  useEffect(() => {
    if (!presentationFile) return;
    const options = buildSlideLayoutOptions(presentationFile);
    const layouts = options.map((opt) => ({ id: opt.value, name: opt.label, type: "blank" as const }));
    dispatch({ type: "INIT_LAYOUT_LIST", layouts });
    if (layouts.length > 0) {
      dispatch({ type: "SELECT_LAYOUT", layoutPath: layouts[0].id });
    }
  }, [presentationFile, dispatch]);

  // Load layout shapes when selection changes
  const activeLayoutData = useMemo(() => {
    if (!presentationFile || !slideSize || !layoutEdit.activeLayoutPath) return undefined;
    return loadLayoutWithContext(presentationFile, layoutEdit.activeLayoutPath, slideSize);
  }, [presentationFile, slideSize, layoutEdit.activeLayoutPath]);

  // Load shapes into state when layout changes
  useEffect(() => {
    if (!activeLayoutData || !layoutEdit.activeLayoutPath) return;
    if (layoutEdit.layoutShapes.length > 0) return; // already loaded
    const bundle = presentationFile ? loadSlideLayoutBundle(presentationFile, layoutEdit.activeLayoutPath) : undefined;
    if (bundle) {
      dispatch({ type: "LOAD_LAYOUT_SHAPES", layoutPath: layoutEdit.activeLayoutPath, shapes: activeLayoutData.shapes, bundle });
    }
  }, [activeLayoutData, layoutEdit.activeLayoutPath, layoutEdit.layoutShapes.length, presentationFile, dispatch]);

  // Shape render data for EditorCanvas hit testing
  const shapeRenderData = useMemo(() => {
    if (layoutEdit.layoutShapes.length === 0) return [];
    return collectShapeRenderData(layoutEdit.layoutShapes, pptxRenderResolver);
  }, [layoutEdit.layoutShapes]);

  // Canvas handlers (shared via ooxml-components)
  const handlers = useCanvasHandlers({
    selectedIds: layoutEdit.layoutSelection.selectedIds,
    onSelect: (id, addToSelection, toggle) => dispatch({ type: "SELECT_LAYOUT_SHAPE", shapeId: id as ShapeId, addToSelection, toggle }),
    onSelectMultiple: (ids) => dispatch({ type: "SELECT_MULTIPLE_LAYOUT_SHAPES", shapeIds: ids as readonly ShapeId[] }),
    onClearSelection: () => dispatch({ type: "CLEAR_LAYOUT_SHAPE_SELECTION" }),
    onStartMove: (startX, startY) => dispatch({ type: "START_LAYOUT_MOVE", startX: px(startX), startY: px(startY) }),
    onStartResize: ({ handle, startX, startY, aspectLocked }) => dispatch({ type: "START_LAYOUT_RESIZE", handle, startX: px(startX), startY: px(startY), aspectLocked }),
    onStartRotate: (startX, startY) => dispatch({ type: "START_LAYOUT_ROTATE", startX: px(startX), startY: px(startY) }),
    onDoubleClick: () => {},
  });

  // Theme callbacks
  const handleColorChange = useCallback((name: SchemeColorName, color: string) => dispatch({ type: "UPDATE_COLOR_SCHEME", name, color }), [dispatch]);
  const handleMajorFontChange = useCallback((spec: Partial<FontSpec>) => dispatch({ type: "UPDATE_FONT_SCHEME", target: "major", spec }), [dispatch]);
  const handleMinorFontChange = useCallback((spec: Partial<FontSpec>) => dispatch({ type: "UPDATE_FONT_SCHEME", target: "minor", spec }), [dispatch]);
  const handlePresetSelect = useCallback((preset: ThemePreset) => dispatch({ type: "APPLY_THEME_PRESET", preset }), [dispatch]);

  const activeLayout = useMemo(() => layoutEdit.layouts.find((l) => l.id === layoutEdit.activeLayoutPath), [layoutEdit.layouts, layoutEdit.activeLayoutPath]);
  const handleLayoutNameChange = useCallback((name: string) => {
    if (!layoutEdit.activeLayoutPath) return;
    dispatch({ type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: layoutEdit.activeLayoutPath, updates: { name } });
  }, [dispatch, layoutEdit.activeLayoutPath]);

  // Layout thumbnails
  const layoutOptions = useMemo(() => {
    if (!presentationFile) return [];
    return buildSlideLayoutOptions(presentationFile);
  }, [presentationFile]);

  const thumbnailData = useLayoutThumbnails({ presentationFile, layoutOptions, slideSize: slideSize ?? { width: px(960), height: px(540) } });

  const layoutItems: readonly LayoutListItem[] = useMemo(() => {
    if (thumbnailData.length > 0) {
      return thumbnailData.map((t) => ({ id: t.value, name: t.label, shapes: t.shapes, svg: t.svg }));
    }
    return layoutEdit.layouts.map((l) => ({ id: l.id, name: l.name, shapes: [], svg: "" }));
  }, [thumbnailData, layoutEdit.layouts]);

  const itemWidth = slideSize ? (slideSize.width as number) : 960;
  const itemHeight = slideSize ? (slideSize.height as number) : 540;

  const renderThumbnail = useCallback((item: LayoutListItem) => {
    if (item.svg || item.shapes.length > 0) {
      return <LayoutThumbnail shapes={item.shapes as Shape[]} svg={item.svg || undefined} slideSize={slideSize ?? { width: px(960), height: px(540) }} width={140} />;
    }
    return <span style={{ fontSize: "10px", color: "#999" }}>{item.name}</span>;
  }, [slideSize]);

  const handleItemClick = useCallback((layoutPath: string) => {
    dispatch({ type: "SELECT_LAYOUT", layoutPath });
  }, [dispatch]);

  // Right panel
  const rightPanel = useMemo(() => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <ColorSchemeEditor colorScheme={colorScheme} onColorChange={handleColorChange} />
      <FontSchemeEditor fontScheme={fontScheme} onMajorFontChange={handleMajorFontChange} onMinorFontChange={handleMinorFontChange} />
      <ThemePresetSelector onPresetSelect={handlePresetSelect} />
      {activeLayout && <LayoutAttributesSection layoutName={activeLayout.name} layoutType={activeLayout.type} onLayoutNameChange={handleLayoutNameChange} />}
    </div>
  ), [colorScheme, fontScheme, handleColorChange, handleMajorFontChange, handleMinorFontChange, handlePresetSelect, activeLayout, handleLayoutNameChange]);

  // Left panel - ItemList with LayoutThumbnail
  const leftPanel = useMemo(() => (
    <ItemList<LayoutListItem, string>
      items={layoutItems}
      itemWidth={itemWidth}
      itemHeight={itemHeight}
      orientation="vertical"
      mode="editable"
      activeItemId={layoutEdit.activeLayoutPath}
      itemLabel="Layout"
      renderThumbnail={renderThumbnail}
      onItemClick={handleItemClick}
    />
  ), [layoutItems, itemWidth, itemHeight, layoutEdit.activeLayoutPath, renderThumbnail, handleItemClick]);

  // Center - EditorCanvas with SlideRenderer
  const widthNum = slideSize ? (slideSize.width as number) : 960;
  const heightNum = slideSize ? (slideSize.height as number) : 540;
  const slideSizeForRenderer = useMemo(() => slideSize ?? { width: px(960), height: px(540) }, [slideSize]);

  const centerContent = useMemo(() => {
    if (!activeLayoutData) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
          Select a layout
        </div>
      );
    }

    return (
      <EditorCanvas
        ref={canvasRef}
        canvasWidth={widthNum}
        canvasHeight={heightNum}
        zoomMode={"fit" as ZoomMode}
        onZoomModeChange={() => {}}
        itemBounds={shapeRenderData as readonly EditorCanvasItemBounds[]}
        selectedIds={layoutEdit.layoutSelection.selectedIds}
        primaryId={layoutEdit.layoutSelection.primaryId}
        drag={layoutEdit.layoutDrag}
        isInteracting={layoutEdit.layoutDrag.type !== "idle"}
        showRotateHandle={true}
        onItemPointerDown={handlers.handleItemPointerDown}
        onItemClick={handlers.handleItemClick}
        onItemDoubleClick={handlers.handleItemDoubleClick}
        onItemContextMenu={handlers.handleItemContextMenu}
        onCanvasPointerDown={handlers.handleCanvasPointerDown}
        onCanvasClick={handlers.handleCanvasClick}
        onResizeStart={handlers.handleResizeStart}
        onRotateStart={handlers.handleRotateStart}
        enableMarquee={true}
        onMarqueeSelect={handlers.handleMarqueeSelect}
      >
        <SlideRenderer
          slide={activeLayoutData.pseudoSlide}
          slideSize={slideSizeForRenderer}
          colorContext={activeLayoutData.colorContext}
          resources={activeLayoutData.resources}
          fontScheme={activeLayoutData.fontScheme}
        />
      </EditorCanvas>
    );
  }, [activeLayoutData, widthNum, heightNum, shapeRenderData, layoutEdit.layoutSelection, layoutEdit.layoutDrag, handlers, slideSizeForRenderer]);

  const panels = useMemo<EditorPanel[]>(() => [
    { id: "layouts", content: leftPanel, position: "left", size: "180px" },
    { id: "inspector", content: rightPanel, position: "right", size: "280px" },
  ], [leftPanel, rightPanel]);

  return (
    <EditorShell className={className} panels={panels}>
      {centerContent}
    </EditorShell>
  );
}
