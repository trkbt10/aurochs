/**
 * @file PotxEditor - PowerPoint Template Editor
 *
 * Main component for editing POTX (PowerPoint template) files.
 * Uses shared components: ItemList, LayoutThumbnail, EditorCanvas, SlideRenderer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import type { PresentationFile, SlideSize, SlideLayoutType } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { buildSlideLayoutOptions, loadSlideLayoutBundle } from "@aurochs-office/pptx/app";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";
import type { ThemePreset } from "./panels/types";
import type { LayoutListEntry } from "./context/types";
import { useThemeEditor } from "./context/ThemeEditorContext";
import { ColorSchemeEditor } from "./panels/ColorSchemeEditor";
import { FontSchemeEditor } from "./panels/FontSchemeEditor";
import { ThemePresetSelector } from "./panels/ThemePresetSelector";
import { LayoutAttributesSection } from "./panels/LayoutAttributesSection";
import { LayoutShapePanel, NoShapeSelected } from "./panels/LayoutShapePanel";
import { MasterBackgroundEditor, type BackgroundState } from "./panels/MasterBackgroundEditor";
import { ColorMapEditor } from "./panels/ColorMapEditor";
import { CustomColorsEditor } from "./panels/CustomColorsEditor";
import { ExtraColorSchemesEditor } from "./panels/ExtraColorSchemesEditor";
import { FormatSchemeEditor } from "./panels/FormatSchemeEditor";
import { ObjectDefaultsEditor } from "./panels/ObjectDefaultsEditor";
import { MasterTextStylesEditor } from "./panels/MasterTextStylesEditor";
import type { ColorMapping } from "@aurochs-office/pptx/domain/color/types";
import type { CustomColor, ExtraColorScheme, FormatScheme } from "@aurochs-office/pptx/domain/theme/types";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { OptionalPropertySection, InspectorPanelWithTabs, type InspectorTab } from "@aurochs-ui/editor-controls/ui";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
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
  TransitionEditor,
} from "@aurochs-ui/ooxml-components";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
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
// Helpers
// =============================================================================

function getLayoutColorMapping(layout: LayoutListEntry, fallback: ColorMapping): ColorMapping {
  const override = layout.overrides?.colorMapOverride;
  if (override?.type === "override") {
    return override.mappings;
  }
  return fallback;
}

function renderShapePanel(shape: Shape | undefined, onShapeChange: (id: ShapeId, updater: (s: Shape) => Shape) => void): React.ReactNode {
  if (shape) {
    return <LayoutShapePanel shape={shape} onShapeChange={onShapeChange} />;
  }
  return <NoShapeSelected />;
}

// =============================================================================
// PPTX Render Resolver
// =============================================================================

function getFillColor(shape: Shape): string | undefined {
  if (!("properties" in shape)) {return undefined;}
  const fill = shape.properties.fill;
  if (!fill || fill.type !== "solidFill") {return "#cccccc";}
  if (fill.color.spec.type === "srgb") {return `#${fill.color.spec.value}`;}
  return "#cccccc";
}

const pptxRenderResolver: RenderDataResolver = {
  getTransform(shape) {
    const t = getShapeTransform(shape as Shape);
    if (!t) {return undefined;}
    return { x: t.x as number, y: t.y as number, width: t.width as number, height: t.height as number, rotation: t.rotation as number };
  },
  getGroupTransform() { return undefined; },
  isHidden: (shape) => isShapeHidden(shape as Shape),
  getFillColor: (shape) => getFillColor(shape as Shape),
  getStrokeColor: () => undefined,
  getStrokeWidth: () => 1,
};

// =============================================================================
// Theme Name Section
// =============================================================================

function ThemeNameSection({ themeName, onThemeNameChange }: { readonly themeName: string; readonly onThemeNameChange: (name: string) => void }) {
  const handleChange = useCallback((value: string | number) => onThemeNameChange(String(value)), [onThemeNameChange]);
  return (
    <OptionalPropertySection title="Theme" defaultExpanded>
      <FieldGroup label="Name" inline labelWidth={60}>
        <Input value={themeName} onChange={handleChange} placeholder="Theme name" />
      </FieldGroup>
    </OptionalPropertySection>
  );
}

// =============================================================================
// Component
// =============================================================================

/** Main editor component for editing POTX (PowerPoint template) files. */
export function PotxEditor({ presentationFile, slideSize, className }: PotxEditorProps) {
  const { state, dispatch } = useThemeEditor();
  const { themeName, colorScheme, fontScheme, fontSchemeName, layoutEdit } = state;
  const canvasRef = useRef<EditorCanvasHandle>(null);

  // Init layout list
  useEffect(() => {
    if (!presentationFile) {return;}
    const options = buildSlideLayoutOptions(presentationFile);
    const layouts = options.map((opt) => ({ id: opt.value, name: opt.label, type: "blank" as const }));
    dispatch({ type: "INIT_LAYOUT_LIST", layouts });
    if (layouts.length > 0) {
      dispatch({ type: "SELECT_LAYOUT", layoutPath: layouts[0].id });
    }
  }, [presentationFile, dispatch]);

  // Load layout shapes when selection changes
  const activeLayoutData = useMemo(() => {
    if (!presentationFile || !slideSize || !layoutEdit.activeLayoutPath) {return undefined;}
    return loadLayoutWithContext(presentationFile, layoutEdit.activeLayoutPath, slideSize);
  }, [presentationFile, slideSize, layoutEdit.activeLayoutPath]);

  // Load shapes into state when layout changes
  useEffect(() => {
    if (!activeLayoutData || !layoutEdit.activeLayoutPath) {return;}
    if (layoutEdit.layoutShapes.length > 0) {return;} // already loaded
    const bundle = presentationFile ? loadSlideLayoutBundle(presentationFile, layoutEdit.activeLayoutPath) : undefined;
    if (bundle) {
      dispatch({ type: "LOAD_LAYOUT_SHAPES", layoutPath: layoutEdit.activeLayoutPath, shapes: activeLayoutData.shapes, bundle });
    }
  }, [activeLayoutData, layoutEdit.activeLayoutPath, layoutEdit.layoutShapes.length, presentationFile, dispatch]);

  // Shape render data for EditorCanvas hit testing
  const shapeRenderData = useMemo(() => {
    if (layoutEdit.layoutShapes.length === 0) {return [];}
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
  const handleColorChange = useCallback((name: string, color: string) => dispatch({ type: "UPDATE_COLOR_SCHEME", name, color }), [dispatch]);
  const handleColorAdd = useCallback((name: string, color: string) => dispatch({ type: "ADD_SCHEME_COLOR", name, color }), [dispatch]);
  const handleColorRemove = useCallback((name: string) => dispatch({ type: "REMOVE_SCHEME_COLOR", name }), [dispatch]);
  const handleColorRename = useCallback((oldName: string, newName: string) => dispatch({ type: "RENAME_SCHEME_COLOR", oldName, newName }), [dispatch]);
  const handleMajorFontChange = useCallback((spec: Partial<FontSpec>) => dispatch({ type: "UPDATE_FONT_SCHEME", target: "major", spec }), [dispatch]);
  const handleMinorFontChange = useCallback((spec: Partial<FontSpec>) => dispatch({ type: "UPDATE_FONT_SCHEME", target: "minor", spec }), [dispatch]);
  const handlePresetSelect = useCallback((preset: ThemePreset) => dispatch({ type: "APPLY_THEME_PRESET", preset }), [dispatch]);
  const handleThemeNameChange = useCallback((name: string) => dispatch({ type: "UPDATE_THEME_NAME", name }), [dispatch]);
  const handleFontSchemeNameChange = useCallback((name: string) => dispatch({ type: "UPDATE_FONT_SCHEME_NAME", name }), [dispatch]);

  const activeLayout = useMemo(() => layoutEdit.layouts.find((l) => l.id === layoutEdit.activeLayoutPath), [layoutEdit.layouts, layoutEdit.activeLayoutPath]);
  const handleLayoutNameChange = useCallback((name: string) => {
    if (!layoutEdit.activeLayoutPath) {return;}
    dispatch({ type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: layoutEdit.activeLayoutPath, updates: { name } });
  }, [dispatch, layoutEdit.activeLayoutPath]);
  const handleLayoutTypeChange = useCallback((type: string) => {
    if (!layoutEdit.activeLayoutPath) {return;}
    dispatch({ type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: layoutEdit.activeLayoutPath, updates: { type: type as SlideLayoutType } });
  }, [dispatch, layoutEdit.activeLayoutPath]);
  const handleMatchingNameChange = useCallback((matchingName: string) => {
    if (!layoutEdit.activeLayoutPath) {return;}
    dispatch({ type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: layoutEdit.activeLayoutPath, updates: { matchingName } });
  }, [dispatch, layoutEdit.activeLayoutPath]);

  // Master background & color map callbacks
  const handleMasterBackgroundChange = useCallback((background: BackgroundState) => {
    dispatch({ type: "UPDATE_MASTER_BACKGROUND", background });
  }, [dispatch]);
  const handleMasterColorMappingChange = useCallback((mapping: ColorMapping) => {
    dispatch({ type: "UPDATE_MASTER_COLOR_MAPPING", mapping });
  }, [dispatch]);
  // Custom colors & extra color schemes
  const handleAddCustomColor = useCallback((color: CustomColor) => {
    dispatch({ type: "ADD_CUSTOM_COLOR", color });
  }, [dispatch]);
  const handleRemoveCustomColor = useCallback((index: number) => {
    dispatch({ type: "REMOVE_CUSTOM_COLOR", index });
  }, [dispatch]);
  const handleUpdateCustomColor = useCallback((index: number, color: CustomColor) => {
    dispatch({ type: "UPDATE_CUSTOM_COLOR", index, color });
  }, [dispatch]);
  const handleAddExtraScheme = useCallback((scheme: ExtraColorScheme) => {
    dispatch({ type: "ADD_EXTRA_COLOR_SCHEME", scheme });
  }, [dispatch]);
  const handleRemoveExtraScheme = useCallback((index: number) => {
    dispatch({ type: "REMOVE_EXTRA_COLOR_SCHEME", index });
  }, [dispatch]);
  const handleUpdateExtraScheme = useCallback((index: number, scheme: ExtraColorScheme) => {
    dispatch({ type: "UPDATE_EXTRA_COLOR_SCHEME", index, scheme });
  }, [dispatch]);
  const handleFormatSchemeChange = useCallback((formatScheme: FormatScheme) => {
    dispatch({ type: "UPDATE_FORMAT_SCHEME", formatScheme });
  }, [dispatch]);
  const handleLayoutBackgroundChange = useCallback((background: BackgroundState) => {
    if (!layoutEdit.activeLayoutPath) {return;}
    dispatch({ type: "UPDATE_LAYOUT_BACKGROUND", layoutId: layoutEdit.activeLayoutPath, background });
  }, [dispatch, layoutEdit.activeLayoutPath]);
  const handleLayoutColorMapOverrideChange = useCallback((mapping: ColorMapping) => {
    if (!layoutEdit.activeLayoutPath) {return;}
    dispatch({ type: "UPDATE_LAYOUT_COLOR_MAP_OVERRIDE", layoutId: layoutEdit.activeLayoutPath, override: { type: "override", mappings: mapping } });
  }, [dispatch, layoutEdit.activeLayoutPath]);
  const handleLayoutTransitionChange = useCallback((transition: SlideTransition | undefined) => {
    if (!layoutEdit.activeLayoutPath) {return;}
    dispatch({ type: "UPDATE_LAYOUT_TRANSITION", layoutId: layoutEdit.activeLayoutPath, transition });
  }, [dispatch, layoutEdit.activeLayoutPath]);

  // Layout CRUD
  const handleAddLayout = useCallback(() => {
    const newId = `ppt/slideLayouts/slideLayout${Date.now()}.xml`;
    dispatch({ type: "ADD_LAYOUT", layout: { id: newId, name: "New Layout", type: "blank" } });
  }, [dispatch]);
  // Layout thumbnails
  const layoutOptions = useMemo(() => {
    if (!presentationFile) {return [];}
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

  // Right panel tabs
  const [activeTab, setActiveTab] = useState("theme");

  const themeTabContent = useMemo(() => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <ThemeNameSection themeName={themeName} onThemeNameChange={handleThemeNameChange} />
      <ColorSchemeEditor colorScheme={colorScheme} onColorChange={handleColorChange} onColorAdd={handleColorAdd} onColorRemove={handleColorRemove} onColorRename={handleColorRename} />
      <FontSchemeEditor fontScheme={fontScheme} fontSchemeName={fontSchemeName} onMajorFontChange={handleMajorFontChange} onMinorFontChange={handleMinorFontChange} onFontSchemeNameChange={handleFontSchemeNameChange} />
      <CustomColorsEditor customColors={state.customColors} onAdd={handleAddCustomColor} onRemove={handleRemoveCustomColor} onUpdate={handleUpdateCustomColor} />
      <ExtraColorSchemesEditor extraColorSchemes={state.extraColorSchemes} onAdd={handleAddExtraScheme} onRemove={handleRemoveExtraScheme} onUpdate={handleUpdateExtraScheme} />
      {state.formatScheme && (
        <FormatSchemeEditor formatScheme={state.formatScheme} onChange={handleFormatSchemeChange} />
      )}
      <ObjectDefaultsEditor objectDefaults={state.objectDefaults} onChange={(od) => dispatch({ type: "UPDATE_OBJECT_DEFAULTS", objectDefaults: od })} />
      <MasterTextStylesEditor masterTextStyles={state.masterTextStyles} onChange={(mts) => dispatch({ type: "UPDATE_MASTER_TEXT_STYLES", masterTextStyles: mts })} />
      <MasterBackgroundEditor background={state.masterBackground} onChange={handleMasterBackgroundChange} title="Master Background" />
      <ColorMapEditor colorMapping={state.masterColorMapping} onChange={handleMasterColorMappingChange} />
    </div>
  ), [themeName, colorScheme, fontScheme, fontSchemeName, state.customColors, state.extraColorSchemes, state.formatScheme, state.objectDefaults, state.masterTextStyles, state.masterBackground, state.masterColorMapping, dispatch, handleThemeNameChange, handleColorChange, handleColorAdd, handleColorRemove, handleColorRename, handleMajorFontChange, handleMinorFontChange, handleFontSchemeNameChange, handleAddCustomColor, handleRemoveCustomColor, handleUpdateCustomColor, handleAddExtraScheme, handleRemoveExtraScheme, handleUpdateExtraScheme, handleFormatSchemeChange, handleMasterBackgroundChange, handleMasterColorMappingChange]);

  const presetsTabContent = useMemo(() => (
    <ThemePresetSelector onPresetSelect={handlePresetSelect} />
  ), [handlePresetSelect]);

  // Selected shape for Layout tab
  const selectedShape = useMemo(() => {
    const primaryId = layoutEdit.layoutSelection.primaryId;
    if (!primaryId) {return undefined;}
    return layoutEdit.layoutShapes.find((s) => "nonVisual" in s && s.nonVisual.id === primaryId);
  }, [layoutEdit.layoutSelection.primaryId, layoutEdit.layoutShapes]);

  const handleShapeChange = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
      dispatch({ type: "UPDATE_LAYOUT_SHAPE", shapeId, updater });
    },
    [dispatch],
  );

  const layoutTabContent = useMemo(() => {
    if (!activeLayout) {
      return <div style={{ padding: "16px", textAlign: "center", color: "var(--text-tertiary, #999)", fontSize: "13px" }}>No layout selected</div>;
    }
    return (
      <>
        <LayoutAttributesSection
          layoutName={activeLayout.name}
          layoutType={activeLayout.type}
          matchingName={activeLayout.matchingName}
          showMasterShapes={activeLayout.showMasterShapes}
          preserve={activeLayout.preserve}
          userDrawn={activeLayout.userDrawn}
          onLayoutNameChange={handleLayoutNameChange}
          onLayoutTypeChange={handleLayoutTypeChange}
          onMatchingNameChange={handleMatchingNameChange}
        />
        <MasterBackgroundEditor
          background={activeLayout.overrides?.background ?? {}}
          onChange={handleLayoutBackgroundChange}
          title="Layout Background"
        />
        <ColorMapEditor
          colorMapping={getLayoutColorMapping(activeLayout, state.masterColorMapping)}
          onChange={handleLayoutColorMapOverrideChange}
        />
        <OptionalPropertySection title="Transition" defaultExpanded={false}>
          <TransitionEditor value={activeLayout.overrides?.transition} onChange={handleLayoutTransitionChange} />
        </OptionalPropertySection>
        {renderShapePanel(selectedShape, handleShapeChange)}
      </>
    );
  }, [activeLayout, state.masterColorMapping, handleLayoutNameChange, handleLayoutTypeChange, handleMatchingNameChange, handleLayoutBackgroundChange, handleLayoutColorMapOverrideChange, handleLayoutTransitionChange, selectedShape, handleShapeChange]);

  const inspectorTabs = useMemo<readonly InspectorTab[]>(() => [
    { id: "theme", label: "Theme", content: themeTabContent },
    { id: "presets", label: "Presets", content: presetsTabContent },
    { id: "layout", label: "Layout", content: layoutTabContent },
  ], [themeTabContent, presetsTabContent, layoutTabContent]);

  const rightPanel = useMemo(() => (
    <InspectorPanelWithTabs tabs={inspectorTabs} activeTabId={activeTab} onActiveTabChange={setActiveTab} />
  ), [inspectorTabs, activeTab]);

  // Left panel - ItemList with LayoutThumbnail + CRUD
  const handleDeleteLayouts = useCallback((ids: readonly string[]) => {
    for (const id of ids) {dispatch({ type: "DELETE_LAYOUT", layoutId: id });}
  }, [dispatch]);
  const handleDuplicateLayouts = useCallback((ids: readonly string[]) => {
    for (const id of ids) {dispatch({ type: "DUPLICATE_LAYOUT", layoutId: id });}
  }, [dispatch]);

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
      onAddItem={handleAddLayout}
      onDeleteItems={handleDeleteLayouts}
      onDuplicateItems={handleDuplicateLayouts}
    />
  ), [layoutItems, itemWidth, itemHeight, layoutEdit.activeLayoutPath, renderThumbnail, handleItemClick, handleAddLayout, handleDeleteLayouts, handleDuplicateLayouts]);

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
