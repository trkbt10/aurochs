/**
 * @file PotxEditor - PowerPoint Template Editor
 *
 * Main component for editing POTX (PowerPoint template) files.
 * Uses shared components: ItemList, LayoutThumbnail, EditorCanvas, SlideRenderer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Shape, Placeholder } from "@aurochs-office/pptx/domain";
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
import { EditorShell, type EditorPanel, CanvasArea } from "@aurochs-ui/editor-controls/editor-shell";
import { OptionalPropertySection, InspectorPanelWithTabs, type InspectorTab } from "@aurochs-ui/editor-controls/ui";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import { ContextMenu, type MenuEntry } from "@aurochs-ui/ui-components";
import { TextEditController, mergeTextIntoBody, extractDefaultRunProperties } from "@aurochs-ui/ooxml-components/text-edit";
import { getPlainText } from "@aurochs-ui/editor-core/text-edit";
import {
  EditorCanvas,
  type EditorCanvasHandle,
  type EditorCanvasItemBounds,
} from "@aurochs-ui/editor-controls/canvas";
import { ItemList, type ListItem } from "@aurochs-ui/editor-controls/item-list";
import {
  useCanvasHandlers,
  useCreationDrag,
  CreationToolbar,
  createSelectMode,
  createShapeFromMode,
  LayoutThumbnail,
  useLayoutThumbnails,
  loadLayoutWithContext,
  TransitionEditor,
  getCursorForCreationMode,
} from "@aurochs-ui/ooxml-components";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import { collectPptxShapeRenderData } from "@aurochs-ui/ooxml-components/pptx-render-resolver";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import type { ViewportTransform } from "@aurochs-ui/editor-core/viewport";
import { INITIAL_VIEWPORT } from "@aurochs-ui/editor-core/viewport";
import { isInputTarget, isPlatformMac, getModKey } from "@aurochs-ui/editor-core/keyboard";
import { ShapeInfoOverlay } from "./panels/ShapeInfoOverlay";

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
// Constants
// =============================================================================

const POTX_VISIBLE_TOOLS: ReadonlySet<string> = new Set([
  "select", "rect", "roundRect", "ellipse", "triangle",
  "rightArrow", "textbox", "connector",
]);

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
// Context Menu Items
// =============================================================================

function buildContextMenuItems(hasSelection: boolean): readonly MenuEntry[] {
  if (!hasSelection) {return [];}
  return [
    { id: "delete", label: "Delete", shortcut: "⌫", danger: true },
  ];
}

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
  const { themeName, colorScheme, fontScheme, fontSchemeName, layoutEdit, creationMode } = state;
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const [viewport, setViewport] = useState<ViewportTransform>(INITIAL_VIEWPORT);

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
    return collectPptxShapeRenderData(layoutEdit.layoutShapes as readonly Shape[]);
  }, [layoutEdit.layoutShapes]);

  // Creation mode
  const handleCreationModeChange = useCallback((mode: CreationMode) => {
    dispatch({ type: "SET_CREATION_MODE", mode });
  }, [dispatch]);

  const handleCanvasCreateFromDrag = useCallback((bounds: Parameters<typeof createShapeFromMode>[1]) => {
    const shape = createShapeFromMode(creationMode, bounds);
    if (shape) {
      dispatch({ type: "ADD_LAYOUT_SHAPE", shape });
    }
  }, [creationMode, dispatch]);

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_LAYOUT_SHAPE_SELECTION" });
  }, [dispatch]);

  // Creation drag hook
  const { creationRect, handleBackgroundPointerDown, handleBackgroundClick } = useCreationDrag({
    creationMode,
    canvasRef,
    onCreateFromDrag: handleCanvasCreateFromDrag,
    onClearSelection: handleClearSelection,
  });

  // Canvas handlers (shared via ooxml-components)
  const handlers = useCanvasHandlers({
    selectedIds: layoutEdit.layoutSelection.selectedIds,
    onSelect: (id, addToSelection, toggle) => dispatch({ type: "SELECT_LAYOUT_SHAPE", shapeId: id as ShapeId, addToSelection, toggle }),
    onSelectMultiple: (ids) => dispatch({ type: "SELECT_MULTIPLE_LAYOUT_SHAPES", shapeIds: ids as readonly ShapeId[] }),
    onClearSelection: handleClearSelection,
    onStartMove: (startX, startY) => dispatch({ type: "START_LAYOUT_MOVE", startX: px(startX), startY: px(startY) }),
    onStartResize: ({ handle, startX, startY, aspectLocked }) => dispatch({ type: "START_LAYOUT_RESIZE", handle, startX: px(startX), startY: px(startY), aspectLocked }),
    onStartRotate: (startX, startY) => dispatch({ type: "START_LAYOUT_ROTATE", startX: px(startX), startY: px(startY) }),
    onDoubleClick: (id) => dispatch({ type: "ENTER_LAYOUT_TEXT_EDIT", shapeId: id as ShapeId }),
    onBackgroundPointerDown: handleBackgroundPointerDown,
    onBackgroundClick: handleBackgroundClick,
  });

  // --- Marquee selection (tracks source as "marquee") ---
  const handleMarqueeSelect = useCallback(
    (result: { readonly itemIds: readonly string[] }, additive: boolean) => {
      dispatch({ type: "MARQUEE_SELECT_LAYOUT_SHAPES", shapeIds: result.itemIds as readonly ShapeId[], additive });
    },
    [dispatch],
  );

  // --- Placeholder change ---
  const handlePlaceholderChange = useCallback((shapeId: ShapeId, placeholder: Placeholder | undefined) => {
    dispatch({ type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER", shapeId, placeholder });
  }, [dispatch]);

  // --- Text editing ---
  const isTextEditing = layoutEdit.textEdit.type === "active";
  const textEditState = layoutEdit.textEdit;

  const handleTextEditCommit = useCallback((newText: string) => {
    if (textEditState.type !== "active") {return;}
    if (getPlainText(textEditState.initialTextBody) === newText) {
      dispatch({ type: "EXIT_LAYOUT_TEXT_EDIT" });
      return;
    }
    const defaultProps = extractDefaultRunProperties(textEditState.initialTextBody);
    const newBody = mergeTextIntoBody(textEditState.initialTextBody, newText, defaultProps);
    dispatch({ type: "COMMIT_LAYOUT_TEXT_EDIT", shapeId: textEditState.shapeId, textBody: newBody });
  }, [dispatch, textEditState]);

  const handleTextEditCancel = useCallback(() => {
    dispatch({ type: "EXIT_LAYOUT_TEXT_EDIT" });
  }, [dispatch]);

  const handleShapeDoubleClickFromOverlay = useCallback((shapeId: ShapeId) => {
    dispatch({ type: "ENTER_LAYOUT_TEXT_EDIT", shapeId });
  }, [dispatch]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const isMac = isPlatformMac();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) {return;}
      const mod = getModKey(e, isMac);

      // Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (layoutEdit.layoutSelection.selectedIds.length > 0) {
          e.preventDefault();
          dispatch({ type: "DELETE_LAYOUT_SHAPES", shapeIds: layoutEdit.layoutSelection.selectedIds });
        }
        return;
      }

      // Escape → exit text edit / return to select mode / clear selection
      if (e.key === "Escape") {
        if (isTextEditing) {
          e.preventDefault();
          dispatch({ type: "EXIT_LAYOUT_TEXT_EDIT" });
        } else if (creationMode.type !== "select") {
          e.preventDefault();
          dispatch({ type: "SET_CREATION_MODE", mode: createSelectMode() });
        } else if (layoutEdit.layoutSelection.selectedIds.length > 0) {
          e.preventDefault();
          dispatch({ type: "CLEAR_LAYOUT_SHAPE_SELECTION" });
        }
        return;
      }

      // Undo / Redo
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      // Select All
      if (mod && e.key === "a") {
        e.preventDefault();
        const allIds = layoutEdit.layoutShapes
          .filter((s): s is Shape & { nonVisual: { id: ShapeId } } => "nonVisual" in s)
          .map((s) => s.nonVisual.id);
        if (allIds.length > 0) {
          dispatch({ type: "SELECT_MULTIPLE_LAYOUT_SHAPES", shapeIds: allIds });
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, creationMode, layoutEdit.layoutSelection.selectedIds, layoutEdit.layoutShapes, isTextEditing]);

  // --- Context menu ---
  const handleContextMenuAction = useCallback((actionId: string) => {
    if (actionId === "delete") {
      dispatch({ type: "DELETE_LAYOUT_SHAPES", shapeIds: layoutEdit.layoutSelection.selectedIds });
    }
    handlers.closeContextMenu();
  }, [dispatch, layoutEdit.layoutSelection.selectedIds, handlers]);

  const contextMenuItems = useMemo(
    () => buildContextMenuItems(layoutEdit.layoutSelection.selectedIds.length > 0),
    [layoutEdit.layoutSelection.selectedIds.length],
  );

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

  // Theme tab: brand identity (palette + fonts) + presets as a starting-point action
  const themeTabContent = useMemo(() => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <ThemeNameSection themeName={themeName} onThemeNameChange={handleThemeNameChange} />
      <ThemePresetSelector onPresetSelect={handlePresetSelect} />
      <ColorSchemeEditor colorScheme={colorScheme} onColorChange={handleColorChange} onColorAdd={handleColorAdd} onColorRemove={handleColorRemove} onColorRename={handleColorRename} />
      <FontSchemeEditor fontScheme={fontScheme} fontSchemeName={fontSchemeName} onMajorFontChange={handleMajorFontChange} onMinorFontChange={handleMinorFontChange} onFontSchemeNameChange={handleFontSchemeNameChange} />
    </div>
  ), [themeName, colorScheme, fontScheme, fontSchemeName, handleThemeNameChange, handlePresetSelect, handleColorChange, handleColorAdd, handleColorRemove, handleColorRename, handleMajorFontChange, handleMinorFontChange, handleFontSchemeNameChange]);

  // Master tab: master-level configuration (background, color mapping, default styles)
  const masterTabContent = useMemo(() => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <MasterBackgroundEditor background={state.masterBackground} onChange={handleMasterBackgroundChange} title="Master Background" />
      <ColorMapEditor colorMapping={state.masterColorMapping} onChange={handleMasterColorMappingChange} />
      <MasterTextStylesEditor masterTextStyles={state.masterTextStyles} onChange={(mts) => dispatch({ type: "UPDATE_MASTER_TEXT_STYLES", masterTextStyles: mts })} />
      <ObjectDefaultsEditor objectDefaults={state.objectDefaults} onChange={(od) => dispatch({ type: "UPDATE_OBJECT_DEFAULTS", objectDefaults: od })} />
      {state.formatScheme && (
        <FormatSchemeEditor formatScheme={state.formatScheme} onChange={handleFormatSchemeChange} />
      )}
      <CustomColorsEditor customColors={state.customColors} onAdd={handleAddCustomColor} onRemove={handleRemoveCustomColor} onUpdate={handleUpdateCustomColor} />
      <ExtraColorSchemesEditor extraColorSchemes={state.extraColorSchemes} onAdd={handleAddExtraScheme} onRemove={handleRemoveExtraScheme} onUpdate={handleUpdateExtraScheme} />
    </div>
  ), [state.masterBackground, state.masterColorMapping, state.masterTextStyles, state.objectDefaults, state.formatScheme, state.customColors, state.extraColorSchemes, dispatch, handleMasterBackgroundChange, handleMasterColorMappingChange, handleFormatSchemeChange, handleAddCustomColor, handleRemoveCustomColor, handleUpdateCustomColor, handleAddExtraScheme, handleRemoveExtraScheme, handleUpdateExtraScheme]);

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
          title="Color Map Override"
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
    { id: "master", label: "Master", content: masterTabContent },
    { id: "layout", label: "Layout", content: layoutTabContent },
  ], [themeTabContent, masterTabContent, layoutTabContent]);

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

  // Build color context and font scheme from edited state so the preview reflects changes
  const editedColorContext = useMemo(() => {
    return { colorScheme, colorMap: state.masterColorMapping as Record<string, string> };
  }, [colorScheme, state.masterColorMapping]);

  const editedFontScheme = useMemo(() => {
    return fontScheme;
  }, [fontScheme]);

  const handleViewportChange = useCallback((vp: ViewportTransform) => {
    setViewport(vp);
  }, []);

  const enableMarquee = creationMode.type === "select" && !isTextEditing;
  const isInteracting = layoutEdit.layoutDrag.type !== "idle";
  const canvasCursor = getCursorForCreationMode(creationMode, isInteracting);

  // Floating toolbar (matches pptx-editor placement via CanvasArea)
  const floatingToolbar = useMemo(() => {
    if (!activeLayoutData) {return undefined;}
    return <CreationToolbar mode={creationMode} onModeChange={handleCreationModeChange} appearance="floating" visibleTools={POTX_VISIBLE_TOOLS} />;
  }, [activeLayoutData, creationMode, handleCreationModeChange]);

  // Shape info overlay (badge on primary shape only + text edit)
  // Marquee selection = group context, badge suppressed until user clicks to focus a specific shape.
  // Multi-click selection (shift+click) = each shape was individually chosen, show badge on primary.
  const isMultiSelection = layoutEdit.layoutSelection.selectedIds.length > 1 && layoutEdit.selectionSource === "marquee";
  const shapeInfoOverlay = useMemo(() => {
    if (layoutEdit.layoutShapes.length === 0) {return undefined;}
    return (
      <>
        <ShapeInfoOverlay
          shapes={layoutEdit.layoutShapes as Shape[]}
          primaryId={layoutEdit.layoutSelection.primaryId}
          isMultiSelection={isMultiSelection}
          onPlaceholderChange={handlePlaceholderChange}
          onDoubleClick={handleShapeDoubleClickFromOverlay}
        />
        {textEditState.type === "active" && (
          <div style={{ position: "absolute", inset: 0 }}>
            <TextEditController
              bounds={textEditState.bounds}
              textBody={textEditState.initialTextBody}
              colorContext={editedColorContext}
              fontScheme={editedFontScheme}
              slideWidth={widthNum}
              slideHeight={heightNum}
              onComplete={handleTextEditCommit}
              onCancel={handleTextEditCancel}
              showSelectionOverlay={true}
              showFrameOutline={false}
            />
          </div>
        )}
      </>
    );
  }, [layoutEdit.layoutShapes, layoutEdit.layoutSelection.primaryId, isMultiSelection, handlePlaceholderChange, handleShapeDoubleClickFromOverlay, textEditState, handleTextEditCommit, handleTextEditCancel]);

  const centerContent = useMemo(() => {
    if (!activeLayoutData) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
          Select a layout
        </div>
      );
    }

    return (
      <CanvasArea floatingToolbar={floatingToolbar}>
        <EditorCanvas
          ref={canvasRef}
          canvasWidth={widthNum}
          canvasHeight={heightNum}
          zoomMode={"fit" as ZoomMode}
          onZoomModeChange={() => {}}
          onViewportChange={handleViewportChange}
          cursor={canvasCursor}
          itemBounds={shapeRenderData as readonly EditorCanvasItemBounds[]}
          selectedIds={layoutEdit.layoutSelection.selectedIds}
          primaryId={layoutEdit.layoutSelection.primaryId}
          drag={layoutEdit.layoutDrag}
          isInteracting={isInteracting}
          isTextEditing={isTextEditing}
          showRotateHandle={!isTextEditing}
          onItemPointerDown={handlers.handleItemPointerDown}
          onItemClick={handlers.handleItemClick}
          onItemDoubleClick={handlers.handleItemDoubleClick}
          onItemContextMenu={handlers.handleItemContextMenu}
          onCanvasPointerDown={handlers.handleCanvasPointerDown}
          onCanvasClick={handlers.handleCanvasClick}
          onResizeStart={handlers.handleResizeStart}
          onRotateStart={handlers.handleRotateStart}
          enableMarquee={enableMarquee}
          onMarqueeSelect={handleMarqueeSelect}
          viewportOverlay={shapeInfoOverlay}
        >
          <SlideRenderer
            slide={activeLayoutData.pseudoSlide}
            slideSize={slideSizeForRenderer}
            colorContext={editedColorContext}
            resources={activeLayoutData.resources}
            fontScheme={editedFontScheme}
          />

          {creationRect && (
            <rect
              x={creationRect.x}
              y={creationRect.y}
              width={creationRect.width}
              height={creationRect.height}
              fill={colorTokens.selection.primary}
              fillOpacity={0.08}
              stroke={colorTokens.selection.primary}
              strokeWidth={1 / viewport.scale}
              strokeDasharray={`${4 / viewport.scale} ${3 / viewport.scale}`}
              pointerEvents="none"
            />
          )}
        </EditorCanvas>

        {handlers.contextMenu && contextMenuItems.length > 0 && (
          <ContextMenu
            x={handlers.contextMenu.x}
            y={handlers.contextMenu.y}
            items={contextMenuItems}
            onAction={handleContextMenuAction}
            onClose={handlers.closeContextMenu}
          />
        )}
      </CanvasArea>
    );
  }, [activeLayoutData, floatingToolbar, widthNum, heightNum, shapeRenderData, layoutEdit.layoutSelection, layoutEdit.layoutDrag, handlers, slideSizeForRenderer, editedColorContext, editedFontScheme, enableMarquee, isInteracting, isTextEditing, canvasCursor, creationRect, viewport.scale, handleViewportChange, contextMenuItems, handleContextMenuAction, shapeInfoOverlay]);

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
