/**
 * @file Diagram GraphicFrame property panel component
 *
 * Displays property editors for GraphicFrame elements containing diagrams (SmartArt).
 */

import type { GraphicFrame } from "@oxen-office/pptx/domain/index";
import type { DiagramDataModel } from "@oxen-office/diagram/domain";
import type { Shape } from "@oxen-office/pptx/domain/index";
import { Accordion } from "@oxen-ui/ui-components/layout";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  DiagramEditor,
} from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

/**
 * Diagram data passed from ResourceStore
 */
export type DiagramParsedData = {
  readonly shapes?: readonly Shape[];
  readonly dataModel?: DiagramDataModel;
};

export type DiagramFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly onChange: (shape: GraphicFrame) => void;
  /**
   * Parsed diagram data from ResourceStore
   */
  readonly diagramData?: DiagramParsedData;
  /**
   * Callback for diagram data model changes.
   * Diagram data is stored in ResourceStore, not on the shape.
   */
  readonly onDiagramChange?: (dataModel: DiagramDataModel) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * GraphicFrame (diagram/SmartArt) editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Transform
 * - Diagram content
 */
export function DiagramFramePanel({
  shape,
  onChange,
  diagramData,
  onDiagramChange,
}: DiagramFramePanelProps) {
  const handleDataModelChange = (dataModel: DiagramDataModel) => {
    // Diagram data is stored in ResourceStore, notify parent
    onDiagramChange?.(dataModel);
  };

  const renderDiagramContent = () => {
    if (diagramData?.dataModel) {
      return (
        <DiagramEditor
          value={diagramData.dataModel}
          onChange={handleDataModelChange}
        />
      );
    }

    if (diagramData?.shapes && diagramData.shapes.length > 0) {
      return (
        <div
          style={{
            padding: "12px",
            textAlign: "center",
            color: "var(--text-tertiary, #737373)",
            fontSize: "12px",
          }}
        >
          Diagram with {diagramData.shapes.length} shapes (data model not
          available)
        </div>
      );
    }

    return (
      <div
        style={{
          padding: "12px",
          textAlign: "center",
          color: "var(--text-tertiary, #737373)",
          fontSize: "12px",
        }}
      >
        Diagram content not loaded
      </div>
    );
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="Diagram" defaultExpanded>
        {renderDiagramContent()}
      </Accordion>
    </>
  );
}
