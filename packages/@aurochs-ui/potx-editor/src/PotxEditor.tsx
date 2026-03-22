/**
 * @file PotxEditor - PowerPoint Template Editor
 *
 * Main component for editing POTX (PowerPoint template) files.
 * Uses PresentationEditorProvider from pptx-editor for canvas interaction
 * (selection, drag, text editing, undo/redo, creation mode).
 * Theme-level state (colors, fonts, backgrounds) managed by ThemeEditorContext.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Shape, Placeholder, Slide } from "@aurochs-office/pptx/domain";
import type { FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import type { SlideSize, SlideLayoutType } from "@aurochs-office/pptx/domain";
import type { PackageFile } from "@aurochs-office/opc";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { buildSlideLayoutOptions, buildSlideLayoutEntries, loadSlideLayoutBundle } from "@aurochs-office/pptx/app";
import type { SlideLayoutEntry } from "@aurochs-office/pptx/app";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";
import type { ThemePreset } from "./panels/types";
import type { LayoutListEntry, ImportedThemeData, ThemeEditorState } from "./context/types";
import type { SchemeColorName } from "@aurochs-office/drawing-ml/domain/color";
import { ThemeImportExportSection } from "@aurochs-ui/ooxml-components/theme-io";
import { exportThemeAsPotx, getThemeFileName, type ThemeExportOptions, type LayoutExportEntry } from "@aurochs-builder/pptx/builders";
import { extractThemeFromBuffer } from "@aurochs-office/pptx/app";
import { downloadPresentation } from "@aurochs-office/opc";
import { useThemeEditor } from "./context/ThemeEditorContext";
import { ColorSchemeEditor } from "./panels/ColorSchemeEditor";
import { FontSchemeEditor } from "./panels/FontSchemeEditor";
import { ThemePresetSelector } from "./panels/ThemePresetSelector";
import { LayoutAttributesSection } from "./panels/LayoutAttributesSection";
import { LayoutShapePanel, NoShapeSelected } from "./panels/LayoutShapePanel";
import { MasterBackgroundEditor, type BackgroundState } from "./panels/MasterBackgroundEditor";
import { getChild, createElement } from "@aurochs/xml";
import type { XmlElement } from "@aurochs/xml";
import { parseBaseFillFromParent } from "@aurochs-office/drawing-ml/parser";
import { serializeFill } from "@aurochs-builder/pptx/patcher";
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
import { TextEditController, useTextEditHandlers } from "@aurochs-ui/ooxml-components/text-edit";
import { isPointInBounds } from "@aurochs-ui/editor-core/geometry";
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
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import { collectPptxShapeRenderData } from "@aurochs-ui/ooxml-components/pptx-render-resolver";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import type { ViewportTransform } from "@aurochs-ui/editor-core/viewport";
import { INITIAL_VIEWPORT } from "@aurochs-ui/editor-core/viewport";
import { ShapeInfoOverlay } from "./panels/ShapeInfoOverlay";
import {
  PresentationEditorProvider,
  usePresentationEditor,
} from "@aurochs-ui/pptx-editor";
import type { PresentationEditorAction } from "@aurochs-ui/pptx-editor";
import { createVirtualDocument, type VirtualDocumentInput } from "./adapter/layout-document-adapter";
import { useThemeDocumentSync } from "./adapter/use-theme-document-sync";
import type { ResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";

// =============================================================================
// Types
// =============================================================================

export type PotxEditorProps = {
  readonly presentationFile?: PackageFile;
  readonly slideSize?: SlideSize;
  readonly className?: string;
  readonly onPackageFileChange?: (file: PackageFile, slideSize: SlideSize) => void;
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

const EMPTY_RESOURCE_RESOLVER: ResourceResolver = {
  resolve: () => undefined,
  getMimeType: () => undefined,
  getTarget: () => undefined,
  readFile: () => undefined,
  getFilePath: () => undefined,
} as unknown as ResourceResolver;

// =============================================================================
// Helpers
// =============================================================================

function bgXmlToBackgroundState(bgElement: XmlElement | undefined): BackgroundState {
  if (!bgElement) { return {}; }
  const bgPr = getChild(bgElement, "p:bgPr");
  if (!bgPr) { return {}; }
  const fill = parseBaseFillFromParent(bgPr);
  return fill ? { fill } : {};
}

function backgroundStateToXml(bg: BackgroundState): XmlElement | undefined {
  if (!bg.fill || bg.fill.type === "noFill") { return undefined; }
  const fillXml = serializeFill(bg.fill);
  const bgPr = createElement("p:bgPr", {}, [fillXml]);
  return createElement("p:bg", {}, [bgPr]);
}

function layoutOverridesToBackground(overrides: LayoutListEntry["overrides"]) {
  const fill = overrides?.background?.fill;
  if (!fill) { return undefined; }
  return { fill, shadeToTitle: overrides?.background?.shadeToTitle };
}

function buildThemeExportOptions(s: ThemeEditorState, slideSize?: SlideSize): ThemeExportOptions {
  const layouts: LayoutExportEntry[] = s.layoutEdit.layouts.map((l) => ({
    name: l.name, type: l.type, matchingName: l.matchingName,
    showMasterShapes: l.showMasterShapes, preserve: l.preserve, userDrawn: l.userDrawn,
    background: layoutOverridesToBackground(l.overrides),
    colorMapOverride: l.overrides?.colorMapOverride, transition: l.overrides?.transition,
  }));
  return {
    name: s.themeName,
    colorScheme: s.colorScheme as Readonly<Record<SchemeColorName, string>>,
    fontScheme: s.fontScheme, fontSchemeName: s.fontSchemeName,
    colorMapping: s.masterColorMapping, formatSchemeElements: s.formatScheme,
    customColors: s.customColors, extraColorSchemes: s.extraColorSchemes,
    objectDefaults: s.objectDefaults, masterTextStyles: s.masterTextStyles,
    masterBackground: s.masterBackground,
    layouts: layouts.length > 0 ? layouts : undefined,
    slideSize: slideSize ? { width: slideSize.width as number, height: slideSize.height as number } : undefined,
  };
}

function buildOverridesFromEntry(entry: SlideLayoutEntry): LayoutListEntry["overrides"] {
  const bg = entry.background;
  const clr = entry.colorMapOverride;
  const trans = entry.transition;
  if (!bg && !clr && !trans) { return undefined; }
  return {
    background: bg ? { fill: bg.fill, shadeToTitle: bg.shadeToTitle } : undefined,
    colorMapOverride: clr, transition: trans,
  };
}

function getLayoutColorMapping(layout: LayoutListEntry, fallback: ColorMapping): ColorMapping {
  const override = layout.overrides?.colorMapOverride;
  if (override?.type === "override") { return override.mappings; }
  return fallback;
}

function renderShapePanel(shape: Shape | undefined, onShapeChange: (id: ShapeId, updater: (s: Shape) => Shape) => void) {
  if (shape) { return <LayoutShapePanel shape={shape} onShapeChange={onShapeChange} />; }
  return <NoShapeSelected />;
}

function buildContextMenuItems(hasSelection: boolean): readonly MenuEntry[] {
  if (!hasSelection) { return []; }
  return [{ id: "delete", label: "Delete", shortcut: "⌫", danger: true }];
}

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
// Outer Component — wraps PresentationEditorProvider
// =============================================================================

export function PotxEditor({ presentationFile, slideSize, className, onPackageFileChange }: PotxEditorProps) {
  const { state, dispatch: themeDispatch } = useThemeEditor();
  const { colorScheme, fontScheme, layoutEdit } = state;

  // Init layout list from file
  useEffect(() => {
    if (!presentationFile) { return; }
    const entries = buildSlideLayoutEntries(presentationFile);
    const layouts: LayoutListEntry[] = entries.map((entry) => ({
      id: entry.value, name: entry.label, type: entry.type,
      matchingName: entry.matchingName, showMasterShapes: entry.showMasterShapes,
      preserve: entry.preserve, userDrawn: entry.userDrawn,
      overrides: buildOverridesFromEntry(entry),
    }));
    themeDispatch({ type: "INIT_LAYOUT_LIST", layouts });
    if (layouts.length > 0) {
      themeDispatch({ type: "SELECT_LAYOUT", layoutPath: layouts[0].id });
    }
  }, [presentationFile, themeDispatch]);

  // Master-level color context
  const masterColorContext = useMemo(() =>
    ({ colorScheme, colorMap: state.masterColorMapping as Record<string, string> }),
    [colorScheme, state.masterColorMapping],
  );

  // Load all layouts for virtual document
  const allLayoutData = useMemo(() => {
    if (!presentationFile || !slideSize) { return []; }
    return layoutEdit.layouts.map((layout) => {
      const data = loadLayoutWithContext({
        file: presentationFile, layoutPath: layout.id, slideSize,
        colorContext: masterColorContext, fontScheme, masterBackground: state.masterBackground,
      });
      return data ? { id: layout.id, data } : undefined;
    }).filter((x): x is NonNullable<typeof x> => x !== undefined);
  }, [presentationFile, slideSize, layoutEdit.layouts, masterColorContext, fontScheme, state.masterBackground]);

  // Build virtual PresentationDocument
  const virtualDocument = useMemo(() => {
    const effectiveSlideSize = slideSize ?? { width: px(960), height: px(540) };
    const resources = allLayoutData[0]?.data.resources ?? EMPTY_RESOURCE_RESOLVER;
    return createVirtualDocument({
      layouts: allLayoutData, slideSize: effectiveSlideSize,
      colorContext: masterColorContext, fontScheme, resources, presentationFile,
    });
  }, [allLayoutData, slideSize, masterColorContext, fontScheme, presentationFile]);

  return (
    <PresentationEditorProvider initialDocument={virtualDocument}>
      <PotxEditorContent
        state={state}
        themeDispatch={themeDispatch}
        presentationFile={presentationFile}
        slideSize={slideSize}
        className={className}
        onPackageFileChange={onPackageFileChange}
        masterColorContext={masterColorContext}
        virtualDocument={virtualDocument}
        allLayoutData={allLayoutData}
      />
    </PresentationEditorProvider>
  );
}

// =============================================================================
// Inner Component — consumes both contexts
// =============================================================================

type PotxEditorContentProps = {
  readonly state: ThemeEditorState;
  readonly themeDispatch: (action: import("./context/types").ThemeEditorAction) => void;
  readonly presentationFile?: PackageFile;
  readonly slideSize?: SlideSize;
  readonly className?: string;
  readonly onPackageFileChange?: (file: PackageFile, slideSize: SlideSize) => void;
  readonly masterColorContext: { colorScheme: Record<string, string>; colorMap: Record<string, string> };
  readonly virtualDocument: import("@aurochs-office/pptx/app").PresentationDocument;
  readonly allLayoutData: readonly { id: string; data: import("@aurochs-ui/ooxml-components").LoadedLayoutData }[];
};

function PotxEditorContent({
  state, themeDispatch, presentationFile, slideSize, className, onPackageFileChange,
  masterColorContext, virtualDocument, allLayoutData,
}: PotxEditorContentProps) {
  const { themeName, colorScheme, fontScheme, fontSchemeName, layoutEdit } = state;

  // pptx-editor context for canvas state
  const {
    state: presState,
    dispatch: presDispatch,
    document: presDocument,
    activeSlide,
    selectedShapes,
    primaryShape,
    creationMode,
    textEdit: textEditState,
  } = usePresentationEditor();

  const canvasRef = useRef<EditorCanvasHandle>(null);
  const [viewport, setViewport] = useState<ViewportTransform>(INITIAL_VIEWPORT);

  // Sync theme changes → PresentationEditorContext
  const handleLayoutShapesChange = useCallback((layoutId: string, shapes: readonly Shape[]) => {
    themeDispatch({ type: "SYNC_LAYOUT_SHAPES", layoutId, shapes });
  }, [themeDispatch]);

  useThemeDocumentSync({
    virtualDocument,
    presentationDispatch: presDispatch,
    currentDocument: presDocument,
    onLayoutShapesChange: handleLayoutShapesChange,
    activeSlideId: presState.activeSlideId,
  });

  // Sync layout selection to PresentationEditorContext
  useEffect(() => {
    if (layoutEdit.activeLayoutPath && layoutEdit.activeLayoutPath !== presState.activeSlideId) {
      presDispatch({ type: "SELECT_SLIDE", slideId: layoutEdit.activeLayoutPath });
    }
  }, [layoutEdit.activeLayoutPath, presState.activeSlideId, presDispatch]);

  // Load shapes into theme state when layout changes
  const activeLayoutData = useMemo(
    () => allLayoutData.find((d) => d.id === layoutEdit.activeLayoutPath)?.data,
    [allLayoutData, layoutEdit.activeLayoutPath],
  );

  useEffect(() => {
    if (!activeLayoutData || !layoutEdit.activeLayoutPath) { return; }
    if (layoutEdit.layoutShapes.length > 0) { return; }
    const bundle = presentationFile ? loadSlideLayoutBundle(presentationFile, layoutEdit.activeLayoutPath) : undefined;
    if (bundle) {
      themeDispatch({ type: "LOAD_LAYOUT_SHAPES", layoutPath: layoutEdit.activeLayoutPath, shapes: activeLayoutData.shapes, bundle });
    }
  }, [activeLayoutData, layoutEdit.activeLayoutPath, layoutEdit.layoutShapes.length, presentationFile, themeDispatch]);

  // Rendered slide from PresentationEditorContext (SoT for canvas)
  const renderedSlide = useMemo((): Slide => {
    if (activeSlide) { return activeSlide.slide; }
    return { shapes: [] };
  }, [activeSlide]);

  // Shape render data for EditorCanvas hit testing
  const shapeRenderData = useMemo(() => {
    return collectPptxShapeRenderData(renderedSlide.shapes as readonly Shape[]);
  }, [renderedSlide.shapes]);

  // --- Creation mode ---
  const handleCreationModeChange = useCallback((mode: import("@aurochs-ui/ooxml-components").CreationMode) => {
    presDispatch({ type: "SET_CREATION_MODE", mode });
  }, [presDispatch]);

  const handleCanvasCreateFromDrag = useCallback((bounds: Parameters<typeof createShapeFromMode>[1]) => {
    const shape = createShapeFromMode(creationMode, bounds);
    if (shape) {
      presDispatch({ type: "CREATE_SHAPE", shape });
    }
  }, [creationMode, presDispatch]);

  const handleClearSelection = useCallback(() => {
    presDispatch({ type: "CLEAR_SHAPE_SELECTION" });
  }, [presDispatch]);

  const { creationRect, handleBackgroundPointerDown, handleBackgroundClick } = useCreationDrag({
    creationMode,
    canvasRef,
    onCreateFromDrag: handleCanvasCreateFromDrag,
    onClearSelection: handleClearSelection,
  });

  // --- Canvas handlers (dispatch to PresentationEditorContext) ---
  const handlers = useCanvasHandlers({
    selectedIds: presState.shapeSelection.selectedIds,
    onSelect: (id, addToSelection, toggle) => presDispatch({ type: "SELECT_SHAPE", shapeId: id as ShapeId, addToSelection, toggle }),
    onSelectMultiple: (ids) => presDispatch({ type: "SELECT_MULTIPLE_SHAPES", shapeIds: ids as readonly ShapeId[] }),
    onClearSelection: handleClearSelection,
    onStartMove: (startX, startY) => presDispatch({ type: "START_MOVE", startX: px(startX), startY: px(startY) }),
    onStartResize: ({ handle, startX, startY, aspectLocked }) => presDispatch({ type: "START_RESIZE", handle, startX: px(startX), startY: px(startY), aspectLocked }),
    onStartRotate: (startX, startY) => presDispatch({ type: "START_ROTATE", startX: px(startX), startY: px(startY) }),
    onDoubleClick: (id) => presDispatch({ type: "ENTER_TEXT_EDIT", shapeId: id as ShapeId }),
    onBackgroundPointerDown: handleBackgroundPointerDown,
    onBackgroundClick: handleBackgroundClick,
  });

  const handleMarqueeSelect = useCallback(
    (result: { readonly itemIds: readonly string[] }, additive: boolean) => {
      presDispatch({ type: "SELECT_MULTIPLE_SHAPES", shapeIds: result.itemIds as readonly ShapeId[] });
    },
    [presDispatch],
  );

  // --- Placeholder change (potx-specific, dispatched to theme context) ---
  const handlePlaceholderChange = useCallback((shapeId: ShapeId, placeholder: Placeholder | undefined) => {
    themeDispatch({ type: "UPDATE_LAYOUT_SHAPE_PLACEHOLDER", shapeId, placeholder });
  }, [themeDispatch]);

  // --- Text editing (from PresentationEditorContext) ---
  const { handleTextEditComplete, handleTextEditCancel, editingShapeId } = useTextEditHandlers({
    textEditState,
    onCommit: useCallback((shapeId: ShapeId, textBody) => {
      presDispatch({ type: "UPDATE_SHAPE", shapeId, updater: (s) => s.type === "sp" && s.textBody ? { ...s, textBody } : s });
      presDispatch({ type: "EXIT_TEXT_EDIT" } as PresentationEditorAction);
    }, [presDispatch]),
    onExit: useCallback(() => {
      presDispatch({ type: "EXIT_TEXT_EDIT" } as PresentationEditorAction);
    }, [presDispatch]),
  });
  const isTextEditing = editingShapeId !== undefined;

  const handleShapeDoubleClickFromOverlay = useCallback((shapeId: ShapeId) => {
    presDispatch({ type: "ENTER_TEXT_EDIT", shapeId });
  }, [presDispatch]);

  // --- Click-outside text edit ---
  const handleTextEditOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isTextEditing) { return; }
      const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!page || textEditState.type !== "active") { return; }
      const bounds = textEditState.bounds;
      const isInside = isPointInBounds(page.pageX, page.pageY, {
        x: bounds.x as number, y: bounds.y as number,
        width: bounds.width as number, height: bounds.height as number, rotation: bounds.rotation,
      });
      if (!isInside) { handleTextEditCancel(); }
    },
    [isTextEditing, textEditState, handleTextEditCancel],
  );

  // --- Context menu ---
  const handleContextMenuAction = useCallback((actionId: string) => {
    if (actionId === "delete") {
      presDispatch({ type: "DELETE_SHAPES", shapeIds: presState.shapeSelection.selectedIds });
    }
    handlers.closeContextMenu();
  }, [presDispatch, presState.shapeSelection.selectedIds, handlers]);

  const contextMenuItems = useMemo(
    () => buildContextMenuItems(presState.shapeSelection.selectedIds.length > 0),
    [presState.shapeSelection.selectedIds.length],
  );

  // === Theme callbacks (dispatch to ThemeEditorContext) ===
  const handleColorChange = useCallback((name: string, color: string) => themeDispatch({ type: "UPDATE_COLOR_SCHEME", name, color }), [themeDispatch]);
  const handleColorAdd = useCallback((name: string, color: string) => themeDispatch({ type: "ADD_SCHEME_COLOR", name, color }), [themeDispatch]);
  const handleColorRemove = useCallback((name: string) => themeDispatch({ type: "REMOVE_SCHEME_COLOR", name }), [themeDispatch]);
  const handleColorRename = useCallback((oldName: string, newName: string) => themeDispatch({ type: "RENAME_SCHEME_COLOR", oldName, newName }), [themeDispatch]);
  const handleMajorFontChange = useCallback((spec: Partial<FontSpec>) => themeDispatch({ type: "UPDATE_FONT_SCHEME", target: "major", spec }), [themeDispatch]);
  const handleMinorFontChange = useCallback((spec: Partial<FontSpec>) => themeDispatch({ type: "UPDATE_FONT_SCHEME", target: "minor", spec }), [themeDispatch]);
  const handlePresetSelect = useCallback((preset: ThemePreset) => themeDispatch({ type: "APPLY_THEME_PRESET", preset }), [themeDispatch]);
  const handleThemeNameChange = useCallback((name: string) => themeDispatch({ type: "UPDATE_THEME_NAME", name }), [themeDispatch]);
  const handleFontSchemeNameChange = useCallback((name: string) => themeDispatch({ type: "UPDATE_FONT_SCHEME_NAME", name }), [themeDispatch]);

  const handleThemeExport = useCallback(async () => {
    const blob = await exportThemeAsPotx(buildThemeExportOptions(state, slideSize));
    await downloadPresentation(blob, getThemeFileName(state.themeName));
  }, [state, slideSize]);

  const handleThemeImport = useCallback(async (buffer: ArrayBuffer) => {
    const result = await extractThemeFromBuffer(buffer);
    if (!result.success) { throw new Error(result.error); }
    const { data } = result;
    const imported: ImportedThemeData = {
      themeName: data.themeName, colorScheme: data.theme.colorScheme, fontScheme: data.theme.fontScheme,
      colorMapping: data.colorMap as ImportedThemeData["colorMapping"], formatScheme: data.theme.formatScheme,
      customColors: data.theme.customColors, extraColorSchemes: data.theme.extraColorSchemes,
      objectDefaults: data.theme.objectDefaults, masterTextStyles: data.masterTextStyles, masterBackground: data.masterBackground,
    };
    themeDispatch({ type: "IMPORT_THEME", theme: imported });
    onPackageFileChange?.(result.presentationFile, result.slideSize);
  }, [themeDispatch, onPackageFileChange]);

  // === Layout metadata callbacks ===
  const activeLayout = useMemo(() => layoutEdit.layouts.find((l) => l.id === layoutEdit.activeLayoutPath), [layoutEdit.layouts, layoutEdit.activeLayoutPath]);
  const handleLayoutNameChange = useCallback((name: string) => {
    if (!layoutEdit.activeLayoutPath) { return; }
    themeDispatch({ type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: layoutEdit.activeLayoutPath, updates: { name } });
  }, [themeDispatch, layoutEdit.activeLayoutPath]);
  const handleLayoutTypeChange = useCallback((type: string) => {
    if (!layoutEdit.activeLayoutPath) { return; }
    themeDispatch({ type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: layoutEdit.activeLayoutPath, updates: { type: type as SlideLayoutType } });
  }, [themeDispatch, layoutEdit.activeLayoutPath]);
  const handleMatchingNameChange = useCallback((matchingName: string) => {
    if (!layoutEdit.activeLayoutPath) { return; }
    themeDispatch({ type: "UPDATE_LAYOUT_ATTRIBUTES", layoutId: layoutEdit.activeLayoutPath, updates: { matchingName } });
  }, [themeDispatch, layoutEdit.activeLayoutPath]);
  const handleMasterBackgroundChange = useCallback((background: BackgroundState) => {
    themeDispatch({ type: "UPDATE_MASTER_BACKGROUND", background: backgroundStateToXml(background) });
  }, [themeDispatch]);
  const handleMasterColorMappingChange = useCallback((mapping: ColorMapping) => {
    themeDispatch({ type: "UPDATE_MASTER_COLOR_MAPPING", mapping });
  }, [themeDispatch]);
  const handleAddCustomColor = useCallback((color: CustomColor) => themeDispatch({ type: "ADD_CUSTOM_COLOR", color }), [themeDispatch]);
  const handleRemoveCustomColor = useCallback((index: number) => themeDispatch({ type: "REMOVE_CUSTOM_COLOR", index }), [themeDispatch]);
  const handleUpdateCustomColor = useCallback((index: number, color: CustomColor) => themeDispatch({ type: "UPDATE_CUSTOM_COLOR", index, color }), [themeDispatch]);
  const handleAddExtraScheme = useCallback((scheme: ExtraColorScheme) => themeDispatch({ type: "ADD_EXTRA_COLOR_SCHEME", scheme }), [themeDispatch]);
  const handleRemoveExtraScheme = useCallback((index: number) => themeDispatch({ type: "REMOVE_EXTRA_COLOR_SCHEME", index }), [themeDispatch]);
  const handleUpdateExtraScheme = useCallback((index: number, scheme: ExtraColorScheme) => themeDispatch({ type: "UPDATE_EXTRA_COLOR_SCHEME", index, scheme }), [themeDispatch]);
  const handleFormatSchemeChange = useCallback((formatScheme: FormatScheme) => themeDispatch({ type: "UPDATE_FORMAT_SCHEME", formatScheme }), [themeDispatch]);
  const handleLayoutBackgroundChange = useCallback((background: BackgroundState) => {
    if (!layoutEdit.activeLayoutPath) { return; }
    themeDispatch({ type: "UPDATE_LAYOUT_BACKGROUND", layoutId: layoutEdit.activeLayoutPath, background });
  }, [themeDispatch, layoutEdit.activeLayoutPath]);
  const handleLayoutColorMapOverrideChange = useCallback((mapping: ColorMapping) => {
    if (!layoutEdit.activeLayoutPath) { return; }
    themeDispatch({ type: "UPDATE_LAYOUT_COLOR_MAP_OVERRIDE", layoutId: layoutEdit.activeLayoutPath, override: { type: "override", mappings: mapping } });
  }, [themeDispatch, layoutEdit.activeLayoutPath]);
  const handleLayoutTransitionChange = useCallback((transition: SlideTransition | undefined) => {
    if (!layoutEdit.activeLayoutPath) { return; }
    themeDispatch({ type: "UPDATE_LAYOUT_TRANSITION", layoutId: layoutEdit.activeLayoutPath, transition });
  }, [themeDispatch, layoutEdit.activeLayoutPath]);

  // === Layout CRUD ===
  const handleAddLayout = useCallback(() => {
    const newId = `ppt/slideLayouts/slideLayout${Date.now()}.xml`;
    themeDispatch({ type: "ADD_LAYOUT", layout: { id: newId, name: "New Layout", type: "blank" } });
  }, [themeDispatch]);

  // === Thumbnails ===
  const layoutOptions = useMemo(() => {
    if (!presentationFile) { return []; }
    return buildSlideLayoutOptions(presentationFile);
  }, [presentationFile]);

  const thumbnailData = useLayoutThumbnails({
    presentationFile, layoutOptions,
    slideSize: slideSize ?? { width: px(960), height: px(540) },
    colorContext: masterColorContext, fontScheme, masterBackground: state.masterBackground,
  });

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
    themeDispatch({ type: "SELECT_LAYOUT", layoutPath });
  }, [themeDispatch]);

  // === Shape property panel ===
  const handleShapeChange = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
      presDispatch({ type: "UPDATE_SHAPE", shapeId, updater });
    },
    [presDispatch],
  );

  // === Right panel tabs ===
  const [activeTab, setActiveTab] = useState("theme");

  const themeTabContent = useMemo(() => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <ThemeNameSection themeName={themeName} onThemeNameChange={handleThemeNameChange} />
      <ThemeImportExportSection onExport={handleThemeExport} onImport={handleThemeImport} />
      <ThemePresetSelector onPresetSelect={handlePresetSelect} />
      <ColorSchemeEditor colorScheme={colorScheme} onColorChange={handleColorChange} onColorAdd={handleColorAdd} onColorRemove={handleColorRemove} onColorRename={handleColorRename} />
      <FontSchemeEditor fontScheme={fontScheme} fontSchemeName={fontSchemeName} onMajorFontChange={handleMajorFontChange} onMinorFontChange={handleMinorFontChange} onFontSchemeNameChange={handleFontSchemeNameChange} />
    </div>
  ), [themeName, colorScheme, fontScheme, fontSchemeName, handleThemeNameChange, handleThemeExport, handleThemeImport, handlePresetSelect, handleColorChange, handleColorAdd, handleColorRemove, handleColorRename, handleMajorFontChange, handleMinorFontChange, handleFontSchemeNameChange]);

  const masterBgState = useMemo(() => bgXmlToBackgroundState(state.masterBackground), [state.masterBackground]);

  const masterTabContent = useMemo(() => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      <MasterBackgroundEditor background={masterBgState} onChange={handleMasterBackgroundChange} title="Master Background" />
      <ColorMapEditor colorMapping={state.masterColorMapping} onChange={handleMasterColorMappingChange} />
      <MasterTextStylesEditor masterTextStyles={state.masterTextStyles} onChange={(mts) => themeDispatch({ type: "UPDATE_MASTER_TEXT_STYLES", masterTextStyles: mts })} />
      <ObjectDefaultsEditor objectDefaults={state.objectDefaults} onChange={(od) => themeDispatch({ type: "UPDATE_OBJECT_DEFAULTS", objectDefaults: od })} />
      {state.formatScheme && <FormatSchemeEditor formatScheme={state.formatScheme} onChange={handleFormatSchemeChange} />}
      <CustomColorsEditor customColors={state.customColors} onAdd={handleAddCustomColor} onRemove={handleRemoveCustomColor} onUpdate={handleUpdateCustomColor} />
      <ExtraColorSchemesEditor extraColorSchemes={state.extraColorSchemes} onAdd={handleAddExtraScheme} onRemove={handleRemoveExtraScheme} onUpdate={handleUpdateExtraScheme} />
    </div>
  ), [masterBgState, state.masterColorMapping, state.masterTextStyles, state.objectDefaults, state.formatScheme, state.customColors, state.extraColorSchemes, themeDispatch, handleMasterBackgroundChange, handleMasterColorMappingChange, handleFormatSchemeChange, handleAddCustomColor, handleRemoveCustomColor, handleUpdateCustomColor, handleAddExtraScheme, handleRemoveExtraScheme, handleUpdateExtraScheme]);

  const layoutTabContent = useMemo(() => {
    if (!activeLayout) {
      return <div style={{ padding: "16px", textAlign: "center", color: "var(--text-tertiary, #999)", fontSize: "13px" }}>No layout selected</div>;
    }
    return (
      <>
        <LayoutAttributesSection layoutName={activeLayout.name} layoutType={activeLayout.type} matchingName={activeLayout.matchingName}
          showMasterShapes={activeLayout.showMasterShapes} preserve={activeLayout.preserve} userDrawn={activeLayout.userDrawn}
          onLayoutNameChange={handleLayoutNameChange} onLayoutTypeChange={handleLayoutTypeChange} onMatchingNameChange={handleMatchingNameChange}
        />
        <MasterBackgroundEditor background={activeLayout.overrides?.background ?? {}} onChange={handleLayoutBackgroundChange} title="Layout Background" />
        <ColorMapEditor colorMapping={getLayoutColorMapping(activeLayout, state.masterColorMapping)} onChange={handleLayoutColorMapOverrideChange} title="Color Map Override" />
        <OptionalPropertySection title="Transition" defaultExpanded={false}>
          <TransitionEditor value={activeLayout.overrides?.transition} onChange={handleLayoutTransitionChange} />
        </OptionalPropertySection>
        {renderShapePanel(primaryShape, handleShapeChange)}
      </>
    );
  }, [activeLayout, state.masterColorMapping, handleLayoutNameChange, handleLayoutTypeChange, handleMatchingNameChange, handleLayoutBackgroundChange, handleLayoutColorMapOverrideChange, handleLayoutTransitionChange, primaryShape, handleShapeChange]);

  const inspectorTabs = useMemo<readonly InspectorTab[]>(() => [
    { id: "theme", label: "Theme", content: themeTabContent },
    { id: "master", label: "Master", content: masterTabContent },
    { id: "layout", label: "Layout", content: layoutTabContent },
  ], [themeTabContent, masterTabContent, layoutTabContent]);

  const rightPanel = useMemo(() => (
    <InspectorPanelWithTabs tabs={inspectorTabs} activeTabId={activeTab} onActiveTabChange={setActiveTab} />
  ), [inspectorTabs, activeTab]);

  // === Left panel ===
  const handleDeleteLayouts = useCallback((ids: readonly string[]) => {
    for (const id of ids) { themeDispatch({ type: "DELETE_LAYOUT", layoutId: id }); }
  }, [themeDispatch]);
  const handleDuplicateLayouts = useCallback((ids: readonly string[]) => {
    for (const id of ids) { themeDispatch({ type: "DUPLICATE_LAYOUT", layoutId: id }); }
  }, [themeDispatch]);

  const leftPanel = useMemo(() => (
    <ItemList<LayoutListItem, string>
      items={layoutItems} itemWidth={itemWidth} itemHeight={itemHeight}
      orientation="vertical" mode="editable"
      activeItemId={layoutEdit.activeLayoutPath} itemLabel="Layout"
      renderThumbnail={renderThumbnail} onItemClick={handleItemClick}
      onAddItem={handleAddLayout} onDeleteItems={handleDeleteLayouts} onDuplicateItems={handleDuplicateLayouts}
    />
  ), [layoutItems, itemWidth, itemHeight, layoutEdit.activeLayoutPath, renderThumbnail, handleItemClick, handleAddLayout, handleDeleteLayouts, handleDuplicateLayouts]);

  // === Center canvas ===
  const widthNum = slideSize ? (slideSize.width as number) : 960;
  const heightNum = slideSize ? (slideSize.height as number) : 540;
  const slideSizeForRenderer = useMemo(() => slideSize ?? { width: px(960), height: px(540) }, [slideSize]);

  const editedColorContext = useMemo(() => {
    const currentLayout = layoutEdit.layouts.find((l) => l.id === layoutEdit.activeLayoutPath);
    const effectiveColorMap = getLayoutColorMapping(currentLayout ?? { id: "", name: "", type: "blank" }, state.masterColorMapping);
    return { colorScheme, colorMap: effectiveColorMap as Record<string, string> };
  }, [colorScheme, state.masterColorMapping, layoutEdit.layouts, layoutEdit.activeLayoutPath]);

  const handleViewportChange = useCallback((vp: ViewportTransform) => setViewport(vp), []);
  const enableMarquee = creationMode.type === "select" && !isTextEditing;
  const isInteracting = presState.drag.type !== "idle";
  const canvasCursor = getCursorForCreationMode(creationMode, isInteracting);

  const floatingToolbar = useMemo(() => {
    if (!activeLayoutData) { return undefined; }
    return <CreationToolbar mode={creationMode} onModeChange={handleCreationModeChange} appearance="floating" visibleTools={POTX_VISIBLE_TOOLS} />;
  }, [activeLayoutData, creationMode, handleCreationModeChange]);

  // Shape info overlay (potx-specific: placeholder badge)
  const shapeInfoOverlay = useMemo(() => {
    if (renderedSlide.shapes.length === 0) { return undefined; }
    return (
      <>
        <ShapeInfoOverlay
          shapes={renderedSlide.shapes as Shape[]}
          primaryId={presState.shapeSelection.primaryId}
          isMultiSelection={presState.shapeSelection.selectedIds.length > 1}
          onPlaceholderChange={handlePlaceholderChange}
          onDoubleClick={handleShapeDoubleClickFromOverlay}
        />
        {textEditState.type === "active" && (
          <div style={{ position: "absolute", inset: 0 }} onPointerDown={handleTextEditOverlayPointerDown}>
            <TextEditController
              bounds={textEditState.bounds} textBody={textEditState.initialTextBody}
              colorContext={editedColorContext} fontScheme={fontScheme}
              slideWidth={widthNum} slideHeight={heightNum}
              onComplete={handleTextEditComplete} onCancel={handleTextEditCancel}
              showSelectionOverlay={true} showFrameOutline={false}
            />
          </div>
        )}
      </>
    );
  }, [renderedSlide.shapes, presState.shapeSelection, handlePlaceholderChange, handleShapeDoubleClickFromOverlay, textEditState, handleTextEditComplete, handleTextEditCancel, handleTextEditOverlayPointerDown, editedColorContext, fontScheme, widthNum, heightNum]);

  const centerContent = useMemo(() => {
    if (!activeLayoutData) {
      return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>Select a layout</div>;
    }
    return (
      <CanvasArea floatingToolbar={floatingToolbar}>
        <EditorCanvas
          ref={canvasRef} canvasWidth={widthNum} canvasHeight={heightNum}
          zoomMode={"fit" as ZoomMode} onZoomModeChange={() => {}} onViewportChange={handleViewportChange}
          cursor={canvasCursor}
          itemBounds={shapeRenderData as readonly EditorCanvasItemBounds[]}
          selectedIds={presState.shapeSelection.selectedIds}
          primaryId={presState.shapeSelection.primaryId}
          drag={presState.drag}
          isInteracting={isInteracting} isTextEditing={isTextEditing}
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
            slide={renderedSlide} slideSize={slideSizeForRenderer}
            colorContext={editedColorContext} resources={activeLayoutData.resources}
            fontScheme={fontScheme} editingShapeId={editingShapeId}
          />
          {creationRect && (
            <rect
              x={creationRect.x} y={creationRect.y}
              width={creationRect.width} height={creationRect.height}
              fill={colorTokens.selection.primary} fillOpacity={0.08}
              stroke={colorTokens.selection.primary}
              strokeWidth={1 / viewport.scale}
              strokeDasharray={`${4 / viewport.scale} ${3 / viewport.scale}`}
              pointerEvents="none"
            />
          )}
        </EditorCanvas>
        {handlers.contextMenu && contextMenuItems.length > 0 && (
          <ContextMenu x={handlers.contextMenu.x} y={handlers.contextMenu.y}
            items={contextMenuItems} onAction={handleContextMenuAction} onClose={handlers.closeContextMenu} />
        )}
      </CanvasArea>
    );
  }, [activeLayoutData, floatingToolbar, widthNum, heightNum, shapeRenderData, presState.shapeSelection, presState.drag, handlers, slideSizeForRenderer, editedColorContext, fontScheme, enableMarquee, isInteracting, isTextEditing, canvasCursor, creationRect, viewport.scale, handleViewportChange, contextMenuItems, handleContextMenuAction, shapeInfoOverlay, renderedSlide, editingShapeId]);

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
