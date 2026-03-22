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
import type { Shape, Slide as DomainSlide, RunProperties, ParagraphProperties, TextBody } from "@aurochs-office/pptx/domain";
import type { ZipFile } from "@aurochs-office/opc";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app";
import { PresentationEditorProvider, usePresentationEditor } from "../context/presentation/PresentationEditorContext";
import { EditorResourceProvider, useEditorResourceStore } from "@aurochs-ui/ooxml-components/drawing-ml/EditorResourceContext";
import { SlideThumbnailPanel } from "../panels";
import { useSlideThumbnails } from "../thumbnail/use-slide-thumbnails";
import { SlideThumbnailPreview } from "../thumbnail/SlideThumbnailPreview";
import { CreationToolbar, createSelectMode } from "@aurochs-ui/ooxml-components";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import type { DrawingPath } from "@aurochs-ui/path-tools";
import { isCustomGeometry } from "@aurochs-ui/pptx-slide-canvas/path-tools/adapters";
import {
  createShapeFromMode,
  createCustomGeometryShape,
} from "@aurochs-ui/pptx-slide-canvas/shape/factory";
import {
  getDefaultBoundsForMode,
  generateShapeId,
  createPicShape,
} from "@aurochs-ui/ooxml-components";
import { createOleGraphicFrame } from "@aurochs-ui/pptx-slide-canvas/graphic-frame/factory";
import { getOleTypeFromFile } from "@aurochs-builder/pptx/patcher";
import type { ShapeBounds } from "@aurochs-ui/ooxml-components";
import { drawingPathToCustomGeometry } from "@aurochs-ui/pptx-slide-canvas/path-tools/adapters";
import {
  isTextEditActive,
  useTextEditHandlers,
  createActiveStickyFormatting,
  createInitialStickyFormatting,
  type StickyFormattingState,
  type TextSelection,
  type TextCursorState,
  type SelectionChangeEvent,
} from "@aurochs-ui/ooxml-components/text-edit";
import { ShapeToolbar } from "../panels/ShapeToolbar";
import { buildSlideLayoutOptions } from "@aurochs-office/pptx/app";
import { createRenderContext, getLayoutNonPlaceholderShapes } from "@aurochs-renderer/pptx";
import { getSlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import { RELATIONSHIP_TYPES, createZipAdapter } from "@aurochs-office/pptx/domain";
import { CanvasControls } from "@aurochs-ui/editor-controls/shape-editor";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { SvgEditorCanvas, type AssetDropData } from "@aurochs-ui/pptx-slide-canvas/slide-canvas/SvgEditorCanvas";
import type { ViewportTransform } from "@aurochs-renderer/pptx/svg-viewport";
import { TextEditContextProvider, useTextEditContextValue } from "@aurochs-ui/pptx-slide-canvas/context/slide/TextEditContext";
import {
  PresentationPreviewProvider,
  usePresentationPreview,
} from "../context/presentation/PresentationPreviewContext";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import {
  type TextSelectionContext,
  getParagraphsInSelection,
  getSelectionForCursor,
} from "@aurochs-ui/ooxml-components/drawing-ml/text/text-property-extractor";
import {
  applyRunPropertiesToSelection,
  applyParagraphPropertiesToSelection,
} from "@aurochs-ui/pptx-slide-canvas/slide/text-edit/input-support/run-formatting";
import { EditorShell, CanvasArea, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { RIGHT_PANEL_TABS, usePivotTabs } from "../layout";
import { SelectedElementTab, SlideInfoTab, LayersTab } from "../panels/right-panel";
import { InspectorPanelWithTabs } from "../panels/inspector";
import { AssetPanel } from "@aurochs-ui/ooxml-components/opc-embedded-assets";
import { ThemeSchemeEditorsSection, type ThemePreset } from "@aurochs-ui/ooxml-components/presentation-theme-layout";
import { PresentationSlideshow, type SlideshowSlideContent } from "@aurochs-ui/pptx-viewer/PresentationSlideshow";
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
import { ThemeImportExportSection } from "@aurochs-ui/ooxml-components/theme-io";
import { extractThemeFromBuffer } from "@aurochs-office/pptx/app";
import { buildThemeXml, exportThemeAsPotx, getThemeFileName } from "@aurochs-builder/pptx/builders";
import { downloadPresentation } from "@aurochs-office/opc";
import type { SchemeColorName } from "@aurochs-office/drawing-ml/domain/color";
import type { Theme } from "@aurochs-office/pptx/domain/theme/types";
import type { FontSpec } from "@aurochs-office/ooxml/domain/font-scheme";
import { resolveEditingTheme } from "./resolve-editing-theme";
import { slideColorMappingForEditor } from "@aurochs-ui/pptx-slide-canvas/slide/color-mapping-for-editor";

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

/** Empty slide for fallback */
const emptySlide: DomainSlide = {
  shapes: [],
};

/**
 * Tab contents grouped into 3 categories.
 */
type TabContents = {
  readonly properties: ReactNode;
  readonly slide: ReactNode;
  readonly resources: ReactNode;
};

function buildPivotItems(tabContents: TabContents): PivotBehavior["items"] {
  return RIGHT_PANEL_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
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
  } = usePresentationEditor();

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
      const bounds: ShapeBounds = {
        x: px(x),
        y: px(y),
        width: px(200),
        height: px(150),
      };

      if (assetData.type === "image") {
        const newShape = createPicShape(generateShapeId(), bounds, assetData.dataUrl);
        dispatch({ type: "CREATE_SHAPE", shape: newShape });
      } else if (assetData.type === "ole") {
        const oleType = getOleTypeFromFile(assetData.name);
        if (oleType) {
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

  // Text edit commit/cancel — shared SoT hook (same as potx-editor)
  const { handleTextEditComplete, handleTextEditCancel, editingShapeId: textEditShapeId } = useTextEditHandlers({
    textEditState: textEdit,
    onCommit: useCallback((shapeId: ShapeId, textBody: TextBody) => {
      dispatch({ type: "UPDATE_TEXT_BODY", shapeId, textBody });
    }, [dispatch]),
    onExit: useCallback(() => {
      dispatch({ type: "EXIT_TEXT_EDIT" });
    }, [dispatch]),
  });

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

  const editingShapeId = textEditShapeId;
  const rulerThickness = showRulers ? RULER_THICKNESS : 0;
  const colorContext = renderContext?.colorContext ?? document.colorContext;
  const fontScheme = renderContext?.fontScheme ?? document.fontScheme;

  const [themeXmlDisplayName, setThemeXmlDisplayName] = useState("Theme");
  const editingTheme = useMemo(() => resolveEditingTheme(document), [document]);

  const applyFullTheme = useCallback(
    (next: Theme, xmlName?: string) => {
      const name = xmlName ?? themeXmlDisplayName;
      const themeXml = buildThemeXml({ name, theme: next, fontSchemeName: name });
      dispatch({
        type: "APPLY_THEME",
        themeName: name,
        theme: next,
        themeXml,
        colorContext: { ...document.colorContext, colorScheme: next.colorScheme },
      });
    },
    [dispatch, document.colorContext, themeXmlDisplayName],
  );

  const handleEditableColorChange = useCallback(
    (name: string, color: string) => {
      applyFullTheme({ ...editingTheme, colorScheme: { ...editingTheme.colorScheme, [name]: color } });
    },
    [editingTheme, applyFullTheme],
  );

  const handleEditableColorAdd = useCallback(
    (name: string, color: string) => {
      applyFullTheme({ ...editingTheme, colorScheme: { ...editingTheme.colorScheme, [name]: color } });
    },
    [editingTheme, applyFullTheme],
  );

  const handleEditableColorRemove = useCallback(
    (name: string) => {
      const nextScheme = { ...editingTheme.colorScheme } as Record<string, string>;
      delete nextScheme[name];
      applyFullTheme({ ...editingTheme, colorScheme: nextScheme });
    },
    [editingTheme, applyFullTheme],
  );

  const handleEditableColorRename = useCallback(
    (oldName: string, newName: string) => {
      const cs = editingTheme.colorScheme as Record<string, string>;
      const value = cs[oldName];
      if (value === undefined) {
        return;
      }
      const nextScheme = { ...cs };
      delete nextScheme[oldName];
      nextScheme[newName] = value;
      applyFullTheme({ ...editingTheme, colorScheme: nextScheme });
    },
    [editingTheme, applyFullTheme],
  );

  const handleEditableMajorFontChange = useCallback(
    (spec: Partial<FontSpec>) => {
      applyFullTheme({
        ...editingTheme,
        fontScheme: {
          ...editingTheme.fontScheme,
          majorFont: { ...editingTheme.fontScheme.majorFont, ...spec },
        },
      });
    },
    [editingTheme, applyFullTheme],
  );

  const handleEditableMinorFontChange = useCallback(
    (spec: Partial<FontSpec>) => {
      applyFullTheme({
        ...editingTheme,
        fontScheme: {
          ...editingTheme.fontScheme,
          minorFont: { ...editingTheme.fontScheme.minorFont, ...spec },
        },
      });
    },
    [editingTheme, applyFullTheme],
  );

  const handleEditableFontSchemeNameChange = useCallback(
    (name: string) => {
      setThemeXmlDisplayName(name);
      applyFullTheme(editingTheme, name);
    },
    [editingTheme, applyFullTheme],
  );

  const handleEditablePresetSelect = useCallback(
    (preset: ThemePreset) => {
      setThemeXmlDisplayName(preset.name);
      applyFullTheme(
        {
          ...editingTheme,
          colorScheme: { ...editingTheme.colorScheme, ...preset.colorScheme },
          fontScheme: preset.fontScheme,
        },
        preset.name,
      );
    },
    [editingTheme, applyFullTheme],
  );

  // ==========================================================================
  // Memoized Tab Content Components (3 combined tabs)
  // ==========================================================================

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
  ]);

  const slideTabContent = useMemo(() => {
    if (!activeSlide || !slide) {
      return <div style={noSlideStyle}>No slide selected</div>;
    }
    const slideColorMapping = slideColorMappingForEditor(slide, document.colorContext.colorMap);
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
          colorMapping={slideColorMapping}
          onColorMapChange={slideCallbacks.handleSlideColorMapChange}
          slideTransition={slide.transition}
          onSlideTransitionChange={slideCallbacks.handleSlideTransitionChange}
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
    slideCallbacks.handleSlideColorMapChange,
    slideCallbacks.handleSlideTransitionChange,
    width,
    height,
    document.presentationFile,
    document.colorContext.colorMap,
  ]);

  // Theme import/export callbacks
  const handleThemeExport = useCallback(async () => {
    if (!document.theme) { return; }
    const blob = await exportThemeAsPotx({
      name: "Theme",
      colorScheme: document.colorContext.colorScheme as Readonly<Record<SchemeColorName, string>>,
      fontScheme: document.theme.fontScheme,
      formatScheme: document.theme.formatScheme,
      customColors: document.theme.customColors,
      extraColorSchemes: document.theme.extraColorSchemes,
      objectDefaults: document.theme.objectDefaults,
    });
    await downloadPresentation(blob, getThemeFileName("Theme"));
  }, [document.theme, document.colorContext]);

  const handleThemeImport = useCallback(async (buffer: ArrayBuffer) => {
    const result = await extractThemeFromBuffer(buffer);
    if (!result.success) { throw new Error(result.error); }
    const { data } = result;
    setThemeXmlDisplayName(data.themeName);
    const themeXml = buildThemeXml({ name: data.themeName, theme: data.theme });
    const newColorContext = { colorScheme: data.theme.colorScheme, colorMap: data.colorMap };
    dispatch({ type: "APPLY_THEME", themeName: data.themeName, theme: data.theme, themeXml, colorContext: newColorContext });
  }, [dispatch]);

  const resourcesTabContent = useMemo(
    () => (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
        <AssetPanel packageFile={document.presentationFile} />
        <ThemeSchemeEditorsSection
          presetSelector={{ onPresetSelect: handleEditablePresetSelect }}
          colorScheme={{
            colorScheme: editingTheme.colorScheme,
            onColorChange: handleEditableColorChange,
            onColorAdd: handleEditableColorAdd,
            onColorRemove: handleEditableColorRemove,
            onColorRename: handleEditableColorRename,
          }}
          fontScheme={{
            fontScheme: editingTheme.fontScheme,
            fontSchemeName: themeXmlDisplayName,
            onMajorFontChange: handleEditableMajorFontChange,
            onMinorFontChange: handleEditableMinorFontChange,
            onFontSchemeNameChange: handleEditableFontSchemeNameChange,
          }}
        />
        <ThemeImportExportSection onExport={handleThemeExport} onImport={handleThemeImport} />
      </div>
    ),
    [
      document.presentationFile,
      editingTheme.colorScheme,
      editingTheme.fontScheme,
      themeXmlDisplayName,
      handleEditablePresetSelect,
      handleEditableColorChange,
      handleEditableColorAdd,
      handleEditableColorRemove,
      handleEditableColorRename,
      handleEditableMajorFontChange,
      handleEditableMinorFontChange,
      handleEditableFontSchemeNameChange,
      handleThemeExport,
      handleThemeImport,
    ],
  );

  const tabContents = useMemo<TabContents>(() => ({
    properties: propertiesTabContent,
    slide: slideTabContent,
    resources: resourcesTabContent,
  }), [propertiesTabContent, slideTabContent, resourcesTabContent]);

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

  const pivotItems = useMemo(() => buildPivotItems(tabContents), [tabContents]);

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
          slide={slide ?? emptySlide}
          slideId={activeSlide?.id ?? ""}
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
    selection,
    drag,
    textEdit,
    floatingToolbar,
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
      </div>
    );
  }, [
    showToolbar,
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
      const result: EditorPanel[] = [];

      result.push({
        id: "thumbnails",
        position: "left",
        content: thumbnailComponent,
        drawerLabel: "Slides",
        scrollable: true,
      });

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

    return (
      <EditorShell
        toolbar={toolbarContent}
        panels={buildPanels()}
      >
        {slideEditorCanvasComponent}
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
