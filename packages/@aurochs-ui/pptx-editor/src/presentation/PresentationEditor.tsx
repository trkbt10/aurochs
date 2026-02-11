/**
 * @file Presentation editor main component
 *
 * Complete presentation editor with:
 * - Slide thumbnails (left, resizable)
 * - Slide canvas (center)
 * - Inspector panel (right, resizable with pivot tabs)
 * - Toolbar
 *
 * Uses react-panel-layout GridLayout for resizable panel layout.
 */

import { useRef, useMemo, useCallback, useState, useEffect, type CSSProperties, type ReactNode } from "react";
import type { PivotBehavior } from "react-panel-layout/pivot";
import type { Shape, RunProperties, ParagraphProperties, TextBody } from "@aurochs-office/pptx/domain";
import type { ZipFile } from "@aurochs-office/opc";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app";
import { PresentationEditorProvider, usePresentationEditor } from "../context/presentation/PresentationEditorContext";
import { EditorResourceProvider, useEditorResourceStore } from "../context/editor/EditorResourceContext";
import { SlideThumbnailPanel } from "../panels";
import { useSlideThumbnails } from "../thumbnail/use-slide-thumbnails";
import { SlideThumbnailPreview } from "../thumbnail/SlideThumbnailPreview";
import { CreationToolbar } from "../panels/CreationToolbar";
import { EditorModePivot } from "../panels/EditorModePivot";
import type { CreationMode, EditorMode } from "../context/presentation/editor/types";
import { createSelectMode } from "../context/presentation/editor/types";
import type { DrawingPath } from "@aurochs-ui/path-tools";
import { isCustomGeometry } from "../path-tools/adapters";
import {
  createShapeFromMode,
  getDefaultBoundsForMode,
  createCustomGeometryShape,
  generateShapeId,
  createPicShape,
} from "../shape/factory";
import { createOleGraphicFrame } from "../graphic-frame/factory";
import { getOleTypeFromFile } from "@aurochs-builder/pptx/patcher";
import type { ShapeBounds } from "../shape/creation-bounds";
import { drawingPathToCustomGeometry } from "../path-tools/adapters";
import {
  isTextEditActive,
  mergeTextIntoBody,
  extractDefaultRunProperties,
  getPlainText,
  createActiveStickyFormatting,
  createInitialStickyFormatting,
  type StickyFormattingState,
  type TextSelection,
  type TextCursorState,
  type SelectionChangeEvent,
} from "../slide/text-edit";
import { ShapeToolbar } from "../panels/ShapeToolbar";
import { buildSlideLayoutOptions } from "@aurochs-office/pptx/app";
import { createRenderContext, getLayoutNonPlaceholderShapes } from "@aurochs-renderer/pptx";
import { getSlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import { RELATIONSHIP_TYPES, createZipAdapter } from "@aurochs-office/pptx/domain";
import { CanvasControls } from "../slide-canvas/CanvasControls";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { SvgEditorCanvas, type AssetDropData } from "../slide-canvas/SvgEditorCanvas";
import type { ViewportTransform } from "@aurochs-renderer/pptx/svg-viewport";
import { TextEditContextProvider, useTextEditContextValue } from "../context/slide/TextEditContext";
import {
  PresentationPreviewProvider,
  usePresentationPreview,
} from "../context/presentation/PresentationPreviewContext";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import {
  type TextSelectionContext,
  getParagraphsInSelection,
  getSelectionForCursor,
} from "../editors/text/text-property-extractor";
import {
  applyRunPropertiesToSelection,
  applyParagraphPropertiesToSelection,
} from "../slide/text-edit/input-support/run-formatting";
import { EditorShell, CanvasArea, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { RIGHT_PANEL_TABS, usePivotTabs } from "../layout";
import { SelectedElementTab, SlideInfoTab, LayersTab } from "../panels/right-panel";
import { AssetPanel, LayoutInfoPanel, ThemeViewerPanel, InspectorPanelWithTabs } from "../panels/inspector";
import { ThemeEditorTabs, ThemeEditorCanvas, extractThemeFromPptx } from "../panels/theme-editor";
import type { ThemePreset } from "../panels/theme-editor/types";
import type { SchemeColorName } from "@aurochs-office/drawing-ml/domain/color";
import type { FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import { PresentationSlideshow, type SlideshowSlideContent } from "../viewer/PresentationSlideshow";
import {
  usePanelCallbacks,
  useContextMenuActions,
  useKeyboardShortcuts,
  useDragHandlers,
} from "./hooks";
import { PlayIcon } from "@aurochs-ui/ui-components/icons";
import { ExportButton } from "./components";
import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createCoreRenderContext } from "@aurochs-renderer/pptx";

// =============================================================================
// Local constants (PPTX-specific, not part of shared EditorShell)
// =============================================================================

const noSlideStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  color: "#666",
};

const RULER_THICKNESS = 24;

/**
 * Tab contents grouped into 3 categories.
 */
type TabContents = {
  readonly properties: ReactNode;
  readonly slide: ReactNode;
  readonly resources: ReactNode;
};

type TabLabelOverrides = {
  readonly properties?: string;
  readonly slide?: string;
  readonly resources?: string;
};

function buildPivotItems(tabContents: TabContents, labelOverrides?: TabLabelOverrides): PivotBehavior["items"] {
  return RIGHT_PANEL_TABS.map((tab) => ({
    id: tab.id,
    label: labelOverrides?.[tab.id] ?? tab.label,
    content: tabContents[tab.id] ?? null,
    cache: true,
  }));
}

// =============================================================================
// Types
// =============================================================================

export type PresentationEditorProps = {
  /** Initial presentation document */
  readonly initialDocument: PresentationDocument;
  /** Show property panel */
  readonly showPropertyPanel?: boolean;
  /** Show layer panel */
  readonly showLayerPanel?: boolean;
  /** Show toolbar */
  readonly showToolbar?: boolean;
  /** CSS class for the container */
  readonly className?: string;
  /** CSS style for the container */
  readonly style?: CSSProperties;
};

// =============================================================================
// Inner Editor Component
// =============================================================================

function EditorContent({ showInspector, showToolbar }: { showInspector: boolean; showToolbar: boolean }) {
  const { activeTab, handleTabChange } = usePivotTabs({
    defaultTab: "properties",
    autoSwitchOnSelection: false,
  });

  const {
    state,
    dispatch,
    document,
    activeSlide,
    selectedShapes,
    primaryShape,
    canUndo,
    canRedo,
    creationMode,
    textEdit,
    pathEdit,
    editorMode,
  } = usePresentationEditor();

  // Get the editor resource store for uploaded/created resources
  const editorResourceStore = useEditorResourceStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const { shapeSelection: selection, drag } = state;
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [displayZoom, setDisplayZoom] = useState(1);
  const [showRulers, setShowRulers] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapStep, setSnapStep] = useState(10);
  const [stickyFormatting, setStickyFormattingState] = useState<StickyFormattingState>(createInitialStickyFormatting);
  const [textEditSelectionContext, setTextEditSelectionContext] = useState<TextSelectionContext>({ type: "none" });
  const [textEditCursorState, setTextEditCursorState] = useState<TextCursorState | undefined>(undefined);
  const [textEditCurrentTextBody, setTextEditCurrentTextBody] = useState<TextBody | undefined>(undefined);
  const previousTextEditRef = useRef<typeof textEdit | null>(null);
  const lastCommittedTextBodyRef = useRef<TextBody | undefined>(undefined);
  const [viewport, setViewport] = useState<ViewportTransform | undefined>(undefined);
  const { isOpen: isPreviewOpen, startSlideIndex, openPreview, closePreview } = usePresentationPreview();

  const slide = activeSlide?.slide;
  const width = document.slideWidth;
  const height = document.slideHeight;

  // ==========================================================================
  // Callbacks from extracted hooks
  // ==========================================================================

  const { canvas, shape, slide: slideCallbacks } = usePanelCallbacks({ dispatch, document });

  const { contextMenuActions } = useContextMenuActions({
    dispatch,
    selection,
    slide,
    primaryShape,
    clipboard: state.clipboard,
  });

  useKeyboardShortcuts({ dispatch, selection, slide, primaryShape });

  useDragHandlers({
    drag,
    selection,
    slide,
    width,
    height,
    canvasRef,
    snapEnabled,
    snapStep,
    dispatch,
    viewport,
    rulerThickness: showRulers ? RULER_THICKNESS : 0,
  });

  // ==========================================================================
  // Creation mode handlers
  // ==========================================================================

  const handleCreationModeChange = useCallback(
    (mode: CreationMode) => {
      dispatch({ type: "SET_CREATION_MODE", mode });
    },
    [dispatch],
  );

  const handleEditorModeChange = useCallback(
    (mode: EditorMode) => {
      dispatch({ type: "SET_EDITOR_MODE", mode });
      // Auto-switch to properties tab when entering theme mode
      if (mode === "theme") {
        handleTabChange("properties");
      }
    },
    [dispatch, handleTabChange],
  );

  // ==========================================================================
  // Theme editing handlers
  // ==========================================================================

  const handleColorSchemeChange = useCallback(
    (name: SchemeColorName, color: string) => {
      dispatch({ type: "UPDATE_COLOR_SCHEME", name, color });
    },
    [dispatch],
  );

  const handleMajorFontChange = useCallback(
    (spec: Partial<FontSpec>) => {
      dispatch({ type: "UPDATE_FONT_SCHEME", target: "major", spec });
    },
    [dispatch],
  );

  const handleMinorFontChange = useCallback(
    (spec: Partial<FontSpec>) => {
      dispatch({ type: "UPDATE_FONT_SCHEME", target: "minor", spec });
    },
    [dispatch],
  );

  const handleThemePresetSelect = useCallback(
    (preset: ThemePreset) => {
      dispatch({ type: "APPLY_THEME_PRESET", preset });
    },
    [dispatch],
  );

  const handleThemeImport = useCallback(
    async (file: File) => {
      const result = await extractThemeFromPptx(file);
      if (result.success) {
        dispatch({ type: "APPLY_THEME_PRESET", preset: result.theme });
      } else {
        console.error("Theme import failed:", result.error);
      }
    },
    [dispatch],
  );

  const handleCanvasCreate = useCallback(
    (x: number, y: number) => {
      if (creationMode.type === "select") {
        return;
      }
      const bounds = getDefaultBoundsForMode(creationMode, px(x), px(y));
      const newShape = createShapeFromMode(creationMode, bounds);
      if (newShape) {
        dispatch({ type: "CREATE_SHAPE", shape: newShape });
      }
    },
    [creationMode, dispatch],
  );

  const handleCanvasCreateFromDrag = useCallback(
    (bounds: ShapeBounds) => {
      if (creationMode.type === "select") {
        return;
      }
      const newShape = createShapeFromMode(creationMode, bounds);
      if (newShape) {
        dispatch({ type: "CREATE_SHAPE", shape: newShape });
      }
    },
    [creationMode, dispatch],
  );

  const handleAssetDrop = useCallback(
    (x: number, y: number, assetData: AssetDropData) => {
      // Default size: 200x150 pixels
      const bounds: ShapeBounds = {
        x: px(x),
        y: px(y),
        width: px(200),
        height: px(150),
      };

      if (assetData.type === "image") {
        // Create a picture shape at the drop position
        const newShape = createPicShape(generateShapeId(), bounds, assetData.dataUrl);
        dispatch({ type: "CREATE_SHAPE", shape: newShape });
      } else if (assetData.type === "ole") {
        // Create an OLE object graphic frame
        const oleType = getOleTypeFromFile(assetData.name);
        if (oleType) {
          // Decode base64 back to ArrayBuffer
          const binaryString = atob(assetData.embedDataBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const embedData = bytes.buffer;

          const newFrame = createOleGraphicFrame({
            id: generateShapeId(),
            bounds,
            oleType,
            embedData,
            filename: assetData.name,
          });
          dispatch({ type: "CREATE_SHAPE", shape: newFrame });
        }
      }
    },
    [dispatch],
  );

  // ==========================================================================
  // Double-click handlers
  // ==========================================================================

  const handleDoubleClick = useCallback(
    (shapeId: ShapeId) => {
      const targetShape = activeSlide?.slide.shapes.find((s) => {
        if (s.type === "contentPart") {
          return false;
        }
        return s.nonVisual.id === shapeId;
      });

      if (targetShape?.type === "sp" && isCustomGeometry(targetShape.properties.geometry)) {
        dispatch({ type: "ENTER_PATH_EDIT", shapeId });
        return;
      }

      dispatch({ type: "ENTER_TEXT_EDIT", shapeId });
    },
    [dispatch, activeSlide],
  );

  const handleTextEditComplete = useCallback(
    (newText: string) => {
      if (isTextEditActive(textEdit)) {
        if (getPlainText(textEdit.initialTextBody) === newText) {
          dispatch({ type: "EXIT_TEXT_EDIT" });
          return;
        }
        const defaultRunProperties = extractDefaultRunProperties(textEdit.initialTextBody);
        const newTextBody = mergeTextIntoBody(textEdit.initialTextBody, newText, defaultRunProperties);
        dispatch({ type: "UPDATE_TEXT_BODY", shapeId: textEdit.shapeId, textBody: newTextBody });
      }
      dispatch({ type: "EXIT_TEXT_EDIT" });
    },
    [dispatch, textEdit],
  );

  const handleTextEditCancel = useCallback(() => {
    dispatch({ type: "EXIT_TEXT_EDIT" });
  }, [dispatch]);

  // ==========================================================================
  // Path tool handlers
  // ==========================================================================

  const handlePathCommit = useCallback(
    (path: DrawingPath) => {
      const { geometry, bounds } = drawingPathToCustomGeometry(path);
      const newShape = createCustomGeometryShape(generateShapeId(), geometry, bounds);
      dispatch({ type: "ADD_SHAPE", shape: newShape });
      dispatch({ type: "SET_CREATION_MODE", mode: createSelectMode() });
    },
    [dispatch],
  );

  const handlePathCancel = useCallback(() => {
    dispatch({ type: "SET_CREATION_MODE", mode: createSelectMode() });
  }, [dispatch]);

  const handlePathEditCommit = useCallback(
    (editedPath: DrawingPath, shapeId: ShapeId) => {
      const originalShape = activeSlide?.slide.shapes.find((s) => {
        if (s.type === "contentPart") {
          return false;
        }
        return s.nonVisual.id === shapeId;
      });

      if (originalShape?.type === "sp") {
        const { geometry, bounds } = drawingPathToCustomGeometry(editedPath);

        dispatch({
          type: "UPDATE_SHAPE",
          shapeId,
          updater: (s): Shape => {
            if (s.type !== "sp" || !s.properties.transform) {
              return s;
            }
            const currentTransform = s.properties.transform;
            return {
              ...s,
              properties: {
                ...s.properties,
                geometry,
                transform: {
                  x: bounds.x,
                  y: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                  rotation: currentTransform.rotation,
                  flipH: currentTransform.flipH,
                  flipV: currentTransform.flipV,
                },
              },
            };
          },
        });
      }

      dispatch({ type: "EXIT_PATH_EDIT", commit: true });
    },
    [dispatch, activeSlide],
  );

  const handlePathEditCancel = useCallback(() => {
    dispatch({ type: "EXIT_PATH_EDIT", commit: false });
  }, [dispatch]);

  // ==========================================================================
  // Text Edit Context
  // ==========================================================================

  useEffect(() => {
    const previous = previousTextEditRef.current;
    if (!isTextEditActive(textEdit)) {
      setTextEditSelectionContext({ type: "none" });
      setTextEditCursorState(undefined);
      setTextEditCurrentTextBody(undefined);
      lastCommittedTextBodyRef.current = undefined;
    } else if (!previous || previous.type !== "active" || previous.shapeId !== textEdit.shapeId) {
      setTextEditSelectionContext({ type: "shape" });
      setTextEditCursorState(undefined);
      setTextEditCurrentTextBody(textEdit.initialTextBody);
      lastCommittedTextBodyRef.current = textEdit.initialTextBody;
    }
    previousTextEditRef.current = textEdit;
  }, [textEdit]);

  const currentTextBody =
    textEditCurrentTextBody ?? (isTextEditActive(textEdit) ? textEdit.initialTextBody : undefined);
  const selectionContext = textEditSelectionContext;

  const handleTextEditSelectionChange = useCallback(
    (event: SelectionChangeEvent) => {
      setTextEditCurrentTextBody(event.textBody);
      if (isTextEditActive(textEdit)) {
        const lastCommitted = lastCommittedTextBodyRef.current;
        if (event.textBody !== textEdit.initialTextBody && event.textBody !== lastCommitted) {
          lastCommittedTextBodyRef.current = event.textBody;
          dispatch({
            type: "UPDATE_TEXT_BODY_IN_EDIT",
            shapeId: textEdit.shapeId,
            textBody: event.textBody,
          });
        }
      }
      if (event.selection) {
        setTextEditSelectionContext({ type: "selection", selection: event.selection });
        setTextEditCursorState({
          cursorPosition: event.selection.end,
          selection: event.selection,
        });
        return;
      }
      if (event.cursorPosition) {
        setTextEditSelectionContext({ type: "cursor", position: event.cursorPosition });
        setTextEditCursorState({
          cursorPosition: event.cursorPosition,
          selection: undefined,
        });
        return;
      }
      setTextEditSelectionContext({ type: "shape" });
      setTextEditCursorState(undefined);
    },
    [dispatch, textEdit],
  );

  const getFullTextSelection = useCallback((textBody: TextBody): TextSelection | undefined => {
    if (textBody.paragraphs.length === 0) {
      return undefined;
    }

    const lastParagraphIndex = textBody.paragraphs.length - 1;
    const lastParagraph = textBody.paragraphs[lastParagraphIndex];
    const lastOffset = lastParagraph.runs.reduce((acc, run) => {
      switch (run.type) {
        case "text":
          return acc + run.text.length;
        case "break":
          return acc + 1;
        case "field":
          return acc + run.text.length;
      }
    }, 0);

    return {
      start: { paragraphIndex: 0, charOffset: 0 },
      end: { paragraphIndex: lastParagraphIndex, charOffset: lastOffset },
    };
  }, []);

  const getSelectionForRunFormatting = useCallback(
    (textBody: TextBody, context: TextSelectionContext): TextSelection | undefined => {
      switch (context.type) {
        case "selection":
          return context.selection;
        case "cursor":
          return getSelectionForCursor(textBody, context.position);
        case "shape":
          return getFullTextSelection(textBody);
        case "none":
          return undefined;
      }
    },
    [getFullTextSelection],
  );

  const getParagraphIndicesForContext = useCallback(
    (textBody: TextBody, context: TextSelectionContext): readonly number[] => {
      switch (context.type) {
        case "selection":
          return getParagraphsInSelection(textBody, context.selection);
        case "cursor":
          if (context.position.paragraphIndex < textBody.paragraphs.length) {
            return [context.position.paragraphIndex];
          }
          return [];
        case "shape":
          return textBody.paragraphs.map((_, index) => index);
        case "none":
          return [];
      }
    },
    [],
  );

  const handleApplyRunProperties = useCallback(
    (props: Partial<RunProperties>) => {
      if (!isTextEditActive(textEdit)) {
        return;
      }

      const baseTextBody = currentTextBody ?? textEdit.initialTextBody;
      const selection = getSelectionForRunFormatting(baseTextBody, selectionContext);
      if (!selection) {
        return;
      }
      const updatedTextBody = applyRunPropertiesToSelection(baseTextBody, selection, props);
      if (updatedTextBody === baseTextBody) {
        return;
      }

      dispatch({
        type: "APPLY_RUN_FORMAT",
        shapeId: textEdit.shapeId,
        textBody: updatedTextBody,
      });
      setTextEditCurrentTextBody(updatedTextBody);
    },
    [dispatch, textEdit, currentTextBody, getSelectionForRunFormatting, selectionContext],
  );

  const handleApplyParagraphProperties = useCallback(
    (props: Partial<ParagraphProperties>) => {
      if (!isTextEditActive(textEdit)) {
        return;
      }

      const baseTextBody = currentTextBody ?? textEdit.initialTextBody;
      const paragraphIndices = getParagraphIndicesForContext(baseTextBody, selectionContext);
      if (paragraphIndices.length === 0) {
        return;
      }
      const updatedTextBody = applyParagraphPropertiesToSelection(baseTextBody, paragraphIndices, props);
      if (updatedTextBody === baseTextBody) {
        return;
      }

      dispatch({
        type: "APPLY_PARAGRAPH_FORMAT",
        shapeId: textEdit.shapeId,
        textBody: updatedTextBody,
      });
      setTextEditCurrentTextBody(updatedTextBody);
    },
    [dispatch, textEdit, currentTextBody, getParagraphIndicesForContext, selectionContext],
  );

  const handleToggleRunProperty = useCallback(
    (propertyKey: keyof RunProperties, currentValue: boolean | undefined) => {
      const newValue = !currentValue;
      handleApplyRunProperties({ [propertyKey]: newValue ? true : undefined } as Partial<RunProperties>);
    },
    [handleApplyRunProperties],
  );

  const handleSetStickyFormatting = useCallback((props: RunProperties) => {
    setStickyFormattingState(createActiveStickyFormatting(props));
  }, []);

  const handleClearStickyFormatting = useCallback(() => {
    setStickyFormattingState(createInitialStickyFormatting());
  }, []);

  const textEditContextValue = useTextEditContextValue({
    textEditState: textEdit,
    currentTextBody,
    selectionContext,
    cursorState: textEditCursorState,
    stickyFormatting,
    onApplyRunProperties: handleApplyRunProperties,
    onApplyParagraphProperties: handleApplyParagraphProperties,
    onToggleRunProperty: handleToggleRunProperty,
    onSetStickyFormatting: handleSetStickyFormatting,
    onClearStickyFormatting: handleClearStickyFormatting,
  });

  // ==========================================================================
  // Derived values
  // ==========================================================================

  const zipFile = useMemo<ZipFile>(() => {
    const presentationFile = document.presentationFile;
    if (presentationFile) {
      return createZipAdapter(presentationFile);
    }
    return { file: () => null };
  }, [document.presentationFile]);

  const previewSlideSize = useMemo(() => {
    return document.presentation.slideSize ?? { width: document.slideWidth, height: document.slideHeight };
  }, [document.presentation.slideSize, document.slideWidth, document.slideHeight]);

  const getPreviewSlideContent = useCallback(
    (slideIndex: number): SlideshowSlideContent => {
      const slideWithId = document.slides[slideIndex - 1];
      if (!slideWithId) {
        return { svg: "", timing: undefined, transition: undefined };
      }

      const slideTransition = slideWithId.apiSlide?.transition ?? slideWithId.slide.transition;
      const slideTiming = slideWithId.apiSlide?.timing;

      if (slideWithId.apiSlide && document.presentationFile) {
        const renderCtx = createRenderContext({
          apiSlide: slideWithId.apiSlide,
          zip: zipFile,
          slideSize: previewSlideSize,
        });
        const svg = renderSlideSvg(slideWithId.slide, renderCtx).svg;
        return { svg, timing: slideTiming, transition: slideTransition };
      }

      const renderCtx = createCoreRenderContext({
        slideSize: previewSlideSize,
        colorContext: document.colorContext,
        resources: document.resources,
        fontScheme: document.fontScheme,
      });
      const svg = renderSlideSvg(slideWithId.slide, renderCtx).svg;
      return { svg, timing: slideTiming, transition: slideTransition };
    },
    [
      document.slides,
      document.presentationFile,
      document.colorContext,
      document.resources,
      document.fontScheme,
      previewSlideSize,
      zipFile,
    ],
  );

  const { getThumbnailSvg } = useSlideThumbnails({
    slideWidth: width,
    slideHeight: height,
    slides: document.slides,
    zipFile,
  });

  const renderThumbnail = useCallback(
    (slideWithId: SlideWithId) => {
      const svg = getThumbnailSvg(slideWithId);
      return <SlideThumbnailPreview svg={svg} slideWidth={width as number} slideHeight={height as number} />;
    },
    [getThumbnailSvg, width, height],
  );

  const renderContext = useMemo(() => {
    const apiSlide = activeSlide?.apiSlide;
    if (apiSlide && zipFile) {
      return createRenderContext({ apiSlide, zip: zipFile, slideSize: { width, height } });
    }
    return undefined;
  }, [width, height, activeSlide?.apiSlide, zipFile]);

  const layoutOptions = useMemo(() => {
    const presentationFile = document.presentationFile;
    if (!presentationFile) {
      return [];
    }
    return buildSlideLayoutOptions(presentationFile);
  }, [document.presentationFile]);

  const layoutAttributes = useMemo(() => {
    const layoutDoc = activeSlide?.apiSlide?.layout ?? null;
    if (!layoutDoc) {
      return undefined;
    }
    return getSlideLayoutAttributes(layoutDoc);
  }, [activeSlide?.apiSlide?.layout]);

  const layoutPath = useMemo(() => {
    if (!activeSlide) {
      return undefined;
    }
    if (activeSlide.layoutPathOverride) {
      return activeSlide.layoutPathOverride;
    }
    return activeSlide.apiSlide?.relationships.getTargetByType(RELATIONSHIP_TYPES.SLIDE_LAYOUT);
  }, [activeSlide]);

  const layoutShapes = useMemo(() => {
    const apiSlide = activeSlide?.apiSlide;
    if (apiSlide === undefined) {
      return undefined;
    }
    return getLayoutNonPlaceholderShapes(apiSlide);
  }, [activeSlide?.apiSlide]);

  const getEditorSlideIndex = useCallback(() => {
    if (!activeSlide) {
      return 1;
    }
    const index = document.slides.findIndex((slideItem) => slideItem.id === activeSlide.id);
    return index === -1 ? 1 : index + 1;
  }, [activeSlide, document.slides]);

  const editingShapeId = isTextEditActive(textEdit) ? textEdit.shapeId : undefined;
  const rulerThickness = showRulers ? RULER_THICKNESS : 0;
  const colorContext = renderContext?.colorContext ?? document.colorContext;
  const fontScheme = renderContext?.fontScheme ?? document.fontScheme;

  // ==========================================================================
  // Memoized Tab Content Components (3 combined tabs)
  // ==========================================================================

  // プロパティタブ: 選択要素 + レイヤー
  const propertiesTabContent = useMemo(() => {
    if (!activeSlide || !slide) {
      return <div style={noSlideStyle}>No slide selected</div>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
        <SelectedElementTab
          selectedShapes={selectedShapes}
          primaryShape={primaryShape}
          onShapeChange={shape.handleShapeChange}
          onUngroup={shape.handleUngroup}
          onSelect={canvas.handleSelect}
        />
        <LayersTab
          slide={slide}
          selection={selection}
          primaryShape={primaryShape}
          onSelect={canvas.handleSelect}
          onSelectMultiple={canvas.handleSelectMultiple}
          onGroup={shape.handleGroup}
          onUngroup={shape.handleUngroup}
          onMoveShape={shape.handleMoveShape}
          onUpdateShapes={shape.handleUpdateShapes}
          onClearSelection={canvas.handleClearSelection}
        />
      </div>
    );
  }, [
    activeSlide,
    slide,
    selectedShapes,
    primaryShape,
    selection,
    shape.handleShapeChange,
    shape.handleUngroup,
    shape.handleGroup,
    shape.handleMoveShape,
    shape.handleUpdateShapes,
    canvas.handleSelect,
    canvas.handleSelectMultiple,
    canvas.handleClearSelection,
  ]);

  // スライドタブ: スライド情報 + レイアウト情報
  const slideTabContent = useMemo(() => {
    if (!activeSlide || !slide) {
      return <div style={noSlideStyle}>No slide selected</div>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
        <SlideInfoTab
          background={slide.background}
          onBackgroundChange={slideCallbacks.handleBackgroundChange}
          layoutAttributes={layoutAttributes}
          layoutPath={layoutPath}
          layoutOptions={layoutOptions}
          onLayoutAttributesChange={slideCallbacks.handleLayoutAttributesChange}
          onLayoutChange={slideCallbacks.handleLayoutChange}
          slideSize={{ width, height }}
          onSlideSizeChange={slideCallbacks.handleSlideSizeChange}
          presentationFile={document.presentationFile}
        />
        <LayoutInfoPanel
          layoutOptions={layoutOptions}
          currentLayoutPath={layoutPath}
          layoutAttributes={layoutAttributes}
          slideSize={{ width, height }}
          presentationFile={document.presentationFile}
        />
      </div>
    );
  }, [
    activeSlide,
    slide,
    slideCallbacks.handleBackgroundChange,
    layoutAttributes,
    layoutPath,
    layoutOptions,
    slideCallbacks.handleLayoutAttributesChange,
    slideCallbacks.handleLayoutChange,
    slideCallbacks.handleSlideSizeChange,
    width,
    height,
    document.presentationFile,
  ]);

  // リソースタブ: アセット + テーマ
  const resourcesTabContent = useMemo(
    () => (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
        <AssetPanel presentationFile={document.presentationFile} />
        <ThemeViewerPanel colorContext={colorContext} fontScheme={fontScheme} />
      </div>
    ),
    [document.presentationFile, colorContext, fontScheme],
  );

  // テーマモード用タブコンテンツ
  const themeEditorTabContent = useMemo(
    () => (
      <ThemeEditorTabs
        colorScheme={colorContext.colorScheme}
        fontScheme={fontScheme}
        onColorChange={handleColorSchemeChange}
        onMajorFontChange={handleMajorFontChange}
        onMinorFontChange={handleMinorFontChange}
        onPresetSelect={handleThemePresetSelect}
      />
    ),
    [
      colorContext.colorScheme,
      fontScheme,
      handleColorSchemeChange,
      handleMajorFontChange,
      handleMinorFontChange,
      handleThemePresetSelect,
    ],
  );

  // モードに応じたタブコンテンツを選択
  const tabContents = useMemo<TabContents>(() => {
    if (editorMode === "theme") {
      // テーマモード: propertiesタブにテーマエディターを表示
      return {
        properties: themeEditorTabContent,
        slide: slideTabContent,
        resources: resourcesTabContent,
      };
    }
    // スライドモード: 通常のタブコンテンツ
    return {
      properties: propertiesTabContent,
      slide: slideTabContent,
      resources: resourcesTabContent,
    };
  }, [editorMode, propertiesTabContent, slideTabContent, resourcesTabContent, themeEditorTabContent]);

  // モードに応じたタブラベルのオーバーライド
  const tabLabelOverrides = useMemo(() => {
    if (editorMode === "theme") {
      return { properties: "テーマ" };
    }
    return undefined;
  }, [editorMode]);

  // ==========================================================================
  // Memoized Panel Components
  // ==========================================================================

  const thumbnailComponent = useMemo(
    () => (
      <SlideThumbnailPanel
        slideWidth={width as number}
        slideHeight={height as number}
        renderThumbnail={renderThumbnail}
      />
    ),
    [width, height, renderThumbnail],
  );

  const pivotItems = useMemo(() => buildPivotItems(tabContents, tabLabelOverrides), [tabContents, tabLabelOverrides]);

  const pivotConfig = useMemo<PivotBehavior | undefined>(() => {
    if (!showInspector) {
      return undefined;
    }
    return {
      items: pivotItems,
      activeId: activeTab,
      onActiveChange: handleTabChange,
    };
  }, [showInspector, pivotItems, activeTab, handleTabChange]);

  const inspectorComponent = useMemo(() => {
    if (!pivotConfig) {
      return null;
    }
    return <InspectorPanelWithTabs pivot={pivotConfig} />;
  }, [pivotConfig]);

  const floatingToolbar = useMemo(() => {
    if (!showToolbar) {
      return undefined;
    }
    return <CreationToolbar mode={creationMode} onModeChange={handleCreationModeChange} appearance="floating" />;
  }, [showToolbar, creationMode, handleCreationModeChange]);

  // Slide editor canvas for slide mode
  const slideEditorCanvasComponent = useMemo(() => {
    if (!activeSlide || !slide) {
      return (
        <div style={noSlideStyle}>
          <span>No slide selected</span>
        </div>
      );
    }

    return (
      <CanvasArea floatingToolbar={floatingToolbar}>
        <SvgEditorCanvas
          ref={canvasRef}
          slide={slide}
          slideId={activeSlide.id}
          selection={selection}
          drag={drag}
          width={width}
          height={height}
          primaryShape={primaryShape}
          selectedShapes={selectedShapes}
          contextMenuActions={contextMenuActions}
          colorContext={colorContext}
          resources={renderContext?.resources ?? document.resources}
          resourceStore={editorResourceStore}
          fontScheme={fontScheme}
          resolvedBackground={renderContext?.resolvedBackground ?? activeSlide?.resolvedBackground}
          editingShapeId={editingShapeId}
          layoutShapes={layoutShapes}
          embeddedFontCss={document.embeddedFontCss}
          creationMode={creationMode}
          textEdit={textEdit}
          onSelect={canvas.handleSelect}
          onSelectMultiple={canvas.handleSelectMultiple}
          onClearSelection={canvas.handleClearSelection}
          onStartMove={canvas.handleStartMove}
          onStartPendingMove={canvas.handleStartPendingMove}
          onStartResize={canvas.handleStartResize}
          onStartPendingResize={canvas.handleStartPendingResize}
          onStartRotate={canvas.handleStartRotate}
          onStartPendingRotate={canvas.handleStartPendingRotate}
          onDoubleClick={handleDoubleClick}
          onCreate={handleCanvasCreate}
          onCreateFromDrag={handleCanvasCreateFromDrag}
          onTextEditComplete={handleTextEditComplete}
          onTextEditCancel={handleTextEditCancel}
          onTextEditSelectionChange={handleTextEditSelectionChange}
          onPathCommit={handlePathCommit}
          onPathCancel={handlePathCancel}
          pathEdit={pathEdit}
          onPathEditCommit={handlePathEditCommit}
          onPathEditCancel={handlePathEditCancel}
          zoomMode={zoomMode}
          onZoomModeChange={setZoomMode}
          onDisplayZoomChange={setDisplayZoom}
          showRulers={showRulers}
          rulerThickness={rulerThickness}
          onViewportChange={setViewport}
          onAssetDrop={handleAssetDrop}
        />
      </CanvasArea>
    );
  }, [
    activeSlide,
    slide,
    floatingToolbar,
    selection,
    drag,
    width,
    height,
    primaryShape,
    selectedShapes,
    contextMenuActions,
    colorContext,
    renderContext,
    document.resources,
    document.embeddedFontCss,
    editorResourceStore,
    fontScheme,
    editingShapeId,
    layoutShapes,
    creationMode,
    textEdit,
    canvas,
    handleDoubleClick,
    handleCanvasCreate,
    handleCanvasCreateFromDrag,
    handleAssetDrop,
    handleTextEditComplete,
    handleTextEditCancel,
    handleTextEditSelectionChange,
    handlePathCommit,
    handlePathCancel,
    pathEdit,
    handlePathEditCommit,
    handlePathEditCancel,
    zoomMode,
    showRulers,
    rulerThickness,
  ]);

  // ==========================================================================
  // Toolbar content
  // ==========================================================================

  const toolbarContent = useMemo(() => {
    if (!showToolbar) {
      return undefined;
    }
    return (
      <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%" }}>
        <EditorModePivot mode={editorMode} onModeChange={handleEditorModeChange} />
        {editorMode === "slide" && (
          <>
            <ShapeToolbar
              canUndo={canUndo}
              canRedo={canRedo}
              selectedIds={selection.selectedIds}
              primaryShape={primaryShape}
              onUndo={() => dispatch({ type: "UNDO" })}
              onRedo={() => dispatch({ type: "REDO" })}
              onDelete={shape.handleDelete}
              onDuplicate={shape.handleDuplicate}
              onReorder={shape.handleReorder}
              onShapeChange={shape.handleShapeChange}
              direction="horizontal"
            />
            <CanvasControls
              zoomMode={zoomMode}
              onZoomModeChange={setZoomMode}
              displayZoom={displayZoom}
              showRulers={showRulers}
              onShowRulersChange={setShowRulers}
              snapEnabled={snapEnabled}
              onSnapEnabledChange={setSnapEnabled}
              snapStep={snapStep}
              onSnapStepChange={setSnapStep}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openPreview(getEditorSlideIndex())}
              title="Preview slideshow"
              style={{ marginLeft: "auto" }}
            >
              <PlayIcon size={16} />
              <span style={{ marginLeft: "6px" }}>Preview</span>
            </Button>
            <ExportButton fileName="presentation.pptx" />
          </>
        )}
      </div>
    );
  }, [
    showToolbar,
    editorMode,
    handleEditorModeChange,
    canUndo,
    canRedo,
    selection.selectedIds,
    primaryShape,
    dispatch,
    shape,
    zoomMode,
    displayZoom,
    showRulers,
    snapEnabled,
    snapStep,
    openPreview,
    getEditorSlideIndex,
  ]);

  // ==========================================================================
  // Render
  // ==========================================================================

  function renderEditorBody() {
    function buildPanels(): EditorPanel[] {
      if (editorMode === "theme") {
        return [];
      }

      const result: EditorPanel[] = [];

      // Left panel: thumbnails
      result.push({
        id: "thumbnails",
        position: "left",
        content: thumbnailComponent,
        drawerLabel: "Slides",
        scrollable: true,
      });

      // Right panel: inspector
      if (showInspector && inspectorComponent) {
        result.push({
          id: "inspector",
          position: "right",
          content: inspectorComponent,
          drawerLabel: "Inspector",
        });
      }

      return result;
    }

    function buildCenterContent() {
      if (editorMode === "theme") {
        return (
          <ThemeEditorCanvas
            colorScheme={colorContext.colorScheme}
            fontScheme={fontScheme}
            onColorChange={handleColorSchemeChange}
            onMajorFontChange={handleMajorFontChange}
            onMinorFontChange={handleMinorFontChange}
            onPresetSelect={handleThemePresetSelect}
            onThemeImport={handleThemeImport}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => dispatch({ type: "UNDO" })}
            onRedo={() => dispatch({ type: "REDO" })}
            presentationFile={document.presentationFile}
            layoutOptions={layoutOptions}
            currentLayoutPath={layoutPath}
            slideSize={{ width, height }}
            onLayoutSelect={slideCallbacks.handleLayoutChange}
          />
        );
      }
      return slideEditorCanvasComponent;
    }

    return (
      <EditorShell
        toolbar={toolbarContent}
        panels={buildPanels()}
      >
        {buildCenterContent()}
      </EditorShell>
    );
  }

  return (
    <TextEditContextProvider value={textEditContextValue}>
      {isPreviewOpen && (
        <PresentationSlideshow
          slideCount={document.slides.length}
          slideSize={previewSlideSize}
          startSlideIndex={startSlideIndex}
          getSlideContent={getPreviewSlideContent}
          onExit={closePreview}
        />
      )}
      {renderEditorBody()}
    </TextEditContextProvider>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Complete presentation editor
 */
export function PresentationEditor({
  initialDocument,
  showPropertyPanel = true,
  showLayerPanel = true,
  showToolbar = true,
  className,
  style,
}: PresentationEditorProps) {
  const showInspector = showPropertyPanel || showLayerPanel;

  const containerStyles = useMemo<CSSProperties>(
    () => ({
      width: "100%",
      height: "100%",
      ...style,
    }),
    [style],
  );

  return (
    <PresentationPreviewProvider>
      <EditorResourceProvider>
        <PresentationEditorProvider initialDocument={initialDocument}>
          <div className={className} style={containerStyles}>
            <EditorContent showInspector={showInspector} showToolbar={showToolbar} />
          </div>
        </PresentationEditorProvider>
      </EditorResourceProvider>
    </PresentationPreviewProvider>
  );
}
