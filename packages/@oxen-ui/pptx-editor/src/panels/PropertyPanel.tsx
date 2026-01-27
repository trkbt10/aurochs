/**
 * @file Property panel component
 *
 * Displays property editors for selected shapes.
 * Props-based component that can be used with any state management.
 *
 * When in text edit mode, shows TextPropertyPanel with Mixed value support.
 */

import { useCallback, type CSSProperties } from "react";
import type { Slide, Shape } from "@oxen/pptx/domain/index";
import type { Background } from "@oxen/pptx/domain/slide/types";
import type { SlideLayoutAttributes } from "@oxen/pptx/parser/slide/layout-parser";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { SlideLayoutOption } from "@oxen/pptx/app";
import { SlidePropertiesPanel } from "./property/SlidePropertiesPanel";
import { MultiSelectPanel } from "./property/MultiSelectPanel";
import { SpShapePanel } from "./property/SpShapePanel";
import { PicShapePanel } from "./property/PicShapePanel";
import { CxnShapePanel } from "./property/CxnShapePanel";
import { GrpShapePanel } from "./property/GrpShapePanel";
import { TableFramePanel } from "./property/TableFramePanel";
import { ChartFramePanel } from "./property/ChartFramePanel";
import { DiagramFramePanel } from "./property/DiagramFramePanel";
import { OleFramePanel } from "./property/OleFramePanel";
import { UnknownShapePanel } from "./property/UnknownShapePanel";
import { TextPropertyPanel } from "./property/TextPropertyPanel";
import { useTextEditContext } from "../context/slide/TextEditContext";
import { isTextEditActive } from "../slide/text-edit";

// =============================================================================
// Types
// =============================================================================

export type PropertyPanelProps = {
  /** Current slide */
  readonly slide: Slide;
  /** Layout attributes for slide layout editor */
  readonly layoutAttributes?: SlideLayoutAttributes;
  /** Current layout path */
  readonly layoutPath?: string;
  /** Available layout options */
  readonly layoutOptions: readonly SlideLayoutOption[];
  /** Selected shapes */
  readonly selectedShapes: readonly Shape[];
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Callback when a shape is updated */
  readonly onShapeChange: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
  /** Callback when slide properties are updated */
  readonly onSlideChange: (updater: (slide: Slide) => Slide) => void;
  /** Callback to ungroup a shape */
  readonly onUngroup: (shapeId: ShapeId) => void;
  /** Callback to select a shape */
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  /** Callback when layout attributes change */
  readonly onLayoutAttributesChange: (attrs: SlideLayoutAttributes) => void;
  /** Callback when layout selection changes */
  readonly onLayoutChange: (layoutPath: string) => void;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Helpers
// =============================================================================

type ShapePanelContext = {
  readonly onShapeChange: (shape: Shape) => void;
  readonly onUngroup: (shapeId: ShapeId) => void;
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
};

/**
 * Render the appropriate panel for a shape.
 */
function renderShapePanel(
  shape: Shape,
  ctx: ShapePanelContext
): React.ReactNode {
  switch (shape.type) {
    case "sp":
      return <SpShapePanel shape={shape} onChange={ctx.onShapeChange} />;
    case "pic":
      return <PicShapePanel shape={shape} onChange={ctx.onShapeChange} />;
    case "cxnSp":
      return <CxnShapePanel shape={shape} onChange={ctx.onShapeChange} />;
    case "grpSp":
      return (
        <GrpShapePanel
          shape={shape}
          onChange={ctx.onShapeChange}
          onUngroup={() => ctx.onUngroup(shape.nonVisual.id)}
          onSelectChild={(childId, addToSelection) =>
            ctx.onSelect(childId, addToSelection)
          }
        />
      );
    case "graphicFrame":
      return renderGraphicFramePanel(shape, ctx.onShapeChange);
    case "contentPart":
      return (
        <div
          style={{
            padding: "16px",
            color: "var(--editor-text-secondary, #888)",
            fontSize: "12px",
          }}
        >
          Content Part (external content reference)
        </div>
      );
    default:
      return <UnknownShapePanel shape={shape} />;
  }
}

/**
 * Render the appropriate panel for a GraphicFrame shape.
 */
function renderGraphicFramePanel(
  shape: Shape & { type: "graphicFrame" },
  onShapeChange: (shape: Shape) => void
): React.ReactNode {
  switch (shape.content.type) {
    case "table":
      return (
        <TableFramePanel
          shape={shape}
          table={shape.content.data.table}
          onChange={onShapeChange}
        />
      );
    case "chart":
      // TODO: Get chart data from ResourceStore
      // Chart data is now stored in ResourceStore, not on the shape
      return (
        <div
          style={{
            padding: "16px",
            color: "var(--editor-text-secondary, #888)",
            fontSize: "12px",
          }}
        >
          Chart editing requires ResourceStore integration
        </div>
      );
    case "diagram":
      return <DiagramFramePanel shape={shape} onChange={onShapeChange} />;
    case "oleObject":
      return <OleFramePanel shape={shape} onChange={onShapeChange} />;
    case "unknown":
      return <UnknownShapePanel shape={shape} />;
    default:
      return <UnknownShapePanel shape={shape} />;
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Property panel for editing selected shape properties.
 *
 * Props-based component that receives all state and callbacks as props.
 * Can be used with SlideEditor context or with PresentationEditor directly.
 *
 * When in text edit mode (TextEditContext is active), shows TextPropertyPanel
 * for editing character and paragraph properties with Mixed value support.
 */
export function PropertyPanel({
  slide,
  layoutAttributes,
  layoutPath,
  layoutOptions,
  selectedShapes,
  primaryShape,
  onShapeChange,
  onSlideChange,
  onUngroup,
  onSelect,
  onLayoutAttributesChange,
  onLayoutChange,
  className,
  style,
}: PropertyPanelProps) {
  // Check for text edit mode
  const textEditContext = useTextEditContext();
  const isInTextEditMode = textEditContext && isTextEditActive(textEditContext.textEditState);

  const handleShapeChange = useCallback(
    (newShape: Shape) => {
      const id = "nonVisual" in newShape ? newShape.nonVisual.id : undefined;
      if (id) {
        onShapeChange(id, () => newShape);
      }
    },
    [onShapeChange]
  );

  const handleBackgroundChange = useCallback(
    (background: Background | undefined) => {
      onSlideChange((s) => ({ ...s, background }));
    },
    [onSlideChange]
  );

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    overflow: "auto",
    ...style,
  };

  const shapePanelCtx: ShapePanelContext = {
    onShapeChange: handleShapeChange,
    onUngroup,
    onSelect,
  };

  // Text edit mode - show text property panel
  if (isInTextEditMode) {
    return (
      <div className={className} style={containerStyle}>
        <TextPropertyPanel />
      </div>
    );
  }

  // No selection - show slide properties
  if (selectedShapes.length === 0) {
    return (
      <div className={className} style={containerStyle}>
        <SlidePropertiesPanel
          background={slide.background}
          onBackgroundChange={handleBackgroundChange}
          layoutAttributes={layoutAttributes}
          layoutPath={layoutPath}
          layoutOptions={layoutOptions}
          onLayoutAttributesChange={onLayoutAttributesChange}
          onLayoutChange={onLayoutChange}
        />
      </div>
    );
  }

  // Multiple selection - show common property editors
  if (selectedShapes.length > 1) {
    return (
      <div className={className} style={containerStyle}>
        <MultiSelectPanel
          shapes={selectedShapes}
          onShapeChange={onShapeChange}
        />
      </div>
    );
  }

  // Single selection
  const shape = primaryShape;
  if (!shape) {
    // Fallback to slide properties if shape not found
    return (
      <div className={className} style={containerStyle}>
        <SlidePropertiesPanel
          background={slide.background}
          onBackgroundChange={handleBackgroundChange}
          layoutAttributes={layoutAttributes}
          layoutPath={layoutPath}
          layoutOptions={layoutOptions}
          onLayoutAttributesChange={onLayoutAttributesChange}
          onLayoutChange={onLayoutChange}
        />
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {renderShapePanel(shape, shapePanelCtx)}
    </div>
  );
}
