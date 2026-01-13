/**
 * @file Selected element tab component for right panel
 *
 * Displays property editors for the currently selected shapes.
 * This tab shows shape-specific properties based on selection state.
 */

import { useCallback, type CSSProperties } from "react";
import type { Shape } from "../../../pptx/domain/index";
import type { ShapeId } from "../../../pptx/domain/types";
import { MultiSelectPanel } from "../property/MultiSelectPanel";
import { SpShapePanel } from "../property/SpShapePanel";
import { PicShapePanel } from "../property/PicShapePanel";
import { CxnShapePanel } from "../property/CxnShapePanel";
import { GrpShapePanel } from "../property/GrpShapePanel";
import { TableFramePanel } from "../property/TableFramePanel";
import { ChartFramePanel } from "../property/ChartFramePanel";
import { DiagramFramePanel } from "../property/DiagramFramePanel";
import { OleFramePanel } from "../property/OleFramePanel";
import { UnknownShapePanel } from "../property/UnknownShapePanel";
import { TextPropertyPanel } from "../property/TextPropertyPanel";
import { InspectorSection } from "../../ui/layout";
import { useTextEditContext } from "../../context/slide/TextEditContext";
import { isTextEditActive } from "../../slide/text-edit";

export type SelectedElementTabProps = {
  /** Selected shapes */
  readonly selectedShapes: readonly Shape[];
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Callback when a shape is updated */
  readonly onShapeChange: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
  /** Callback to ungroup a shape */
  readonly onUngroup: (shapeId: ShapeId) => void;
  /** Callback to select a shape */
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
};

type ShapePanelContext = {
  readonly onShapeChange: (shape: Shape) => void;
  readonly onUngroup: (shapeId: ShapeId) => void;
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
};

const emptyStateStyle: CSSProperties = {
  padding: "24px 16px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "13px",
};

/**
 * Render the appropriate panel for a shape.
 */
function renderShapePanel(shape: Shape, ctx: ShapePanelContext): React.ReactNode {
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
          onSelectChild={(childId, addToSelection) => ctx.onSelect(childId, addToSelection)}
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
  onShapeChange: (shape: Shape) => void,
): React.ReactNode {
  switch (shape.content.type) {
    case "table":
      return <TableFramePanel shape={shape} table={shape.content.data.table} onChange={onShapeChange} />;
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

/**
 * Selected element tab component.
 *
 * Displays property editors for selected shapes within the right panel pivot tabs:
 * - Text edit mode: Shows TextPropertyPanel
 * - Multi-selection: Shows MultiSelectPanel
 * - Single selection: Shows shape-specific panel
 * - No selection: Shows empty state
 */
export function SelectedElementTab({
  selectedShapes,
  primaryShape,
  onShapeChange,
  onUngroup,
  onSelect,
}: SelectedElementTabProps) {
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
    [onShapeChange],
  );

  const shapePanelCtx: ShapePanelContext = {
    onShapeChange: handleShapeChange,
    onUngroup,
    onSelect,
  };

  // Text edit mode - show text property panel
  if (isInTextEditMode) {
    return (
      <div style={containerStyle}>
        <InspectorSection title="Text Properties">
          <TextPropertyPanel />
        </InspectorSection>
      </div>
    );
  }

  // No selection - show empty state
  if (selectedShapes.length === 0) {
    return (
      <div style={containerStyle}>
        <InspectorSection title="Selection">
          <div style={emptyStateStyle}>
            <p>No element selected</p>
            <p style={{ fontSize: "12px", marginTop: "8px", opacity: 0.7 }}>
              Click on a shape in the canvas or layer panel to see its properties
            </p>
          </div>
        </InspectorSection>
      </div>
    );
  }

  // Multiple selection - show common property editors
  if (selectedShapes.length > 1) {
    return (
      <div style={containerStyle}>
        <InspectorSection title={`Selection (${selectedShapes.length})`}>
          <MultiSelectPanel shapes={selectedShapes} onShapeChange={onShapeChange} />
        </InspectorSection>
      </div>
    );
  }

  // Single selection
  const shape = primaryShape;
  if (!shape) {
    return (
      <div style={containerStyle}>
        <InspectorSection title="Selection">
          <div style={emptyStateStyle}>Shape not found</div>
        </InspectorSection>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <InspectorSection title={getShapeTypeLabel(shape)}>{renderShapePanel(shape, shapePanelCtx)}</InspectorSection>
    </div>
  );
}

/**
 * Get a human-readable label for a shape type.
 */
function getShapeTypeLabel(shape: Shape): string {
  switch (shape.type) {
    case "sp":
      return "Shape";
    case "pic":
      return "Picture";
    case "cxnSp":
      return "Connector";
    case "grpSp":
      return "Group";
    case "graphicFrame":
      switch (shape.content.type) {
        case "table":
          return "Table";
        case "chart":
          return "Chart";
        case "diagram":
          return "Diagram";
        case "oleObject":
          return "OLE Object";
        default:
          return "Graphic Frame";
      }
    case "contentPart":
      return "Content Part";
    default:
      return "Element";
  }
}
