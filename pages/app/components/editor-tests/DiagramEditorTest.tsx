/**
 * @file Diagram Editors Test
 *
 * Test component for diagram-related editors (DiagramPoint, DiagramConnection, Diagram).
 */

import { useState, type CSSProperties } from "react";
import {
  DiagramEditor,
  DiagramPointEditor,
  DiagramConnectionEditor,
  createDefaultDiagramDataModel,
  createDefaultDiagramPoint,
  createDefaultDiagramConnection,
} from "@oxen-ui/pptx-editor";
import type { DiagramDataModel, DiagramPoint, DiagramConnection } from "@oxen/pptx/domain/diagram";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border-subtle)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueDisplayStyle: CSSProperties = {
  marginTop: "16px",
  padding: "12px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-tertiary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "200px",
  overflow: "auto",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "24px",
};

/**
 * Diagram editors test component
 */
export function DiagramEditorTest() {
  const [diagramPoint, setDiagramPoint] = useState<DiagramPoint>(() => ({
    ...createDefaultDiagramPoint(),
    textBody: {
      paragraphs: [{ runs: [{ text: "Sample Node" }] }],
    },
  }));

  const [diagramConnection, setDiagramConnection] = useState<DiagramConnection>(() => ({
    ...createDefaultDiagramConnection(),
    sourceId: "1",
    destinationId: "2",
  }));

  const [diagramDataModel, setDiagramDataModel] = useState<DiagramDataModel>(() => {
    const defaultModel = createDefaultDiagramDataModel();
    return {
      ...defaultModel,
      points: [
        { modelId: "1", type: "node", textBody: { paragraphs: [{ runs: [{ text: "Root" }] }] } },
        { modelId: "2", type: "node", textBody: { paragraphs: [{ runs: [{ text: "Child 1" }] }] } },
        { modelId: "3", type: "asst", textBody: { paragraphs: [{ runs: [{ text: "Assistant" }] }] } },
      ],
      connections: [
        { modelId: "c1", type: "parOf", sourceId: "1", destinationId: "2" },
        { modelId: "c2", type: "parOf", sourceId: "1", destinationId: "3" },
      ],
    };
  });

  // Sample points for connection editor
  const availablePoints: DiagramPoint[] = [
    { modelId: "1", type: "node" },
    { modelId: "2", type: "node" },
    { modelId: "3", type: "asst" },
  ];

  return (
    <div style={gridStyle}>
      {/* DiagramPoint Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Diagram Point Editor</h2>
        <DiagramPointEditor
          value={diagramPoint}
          onChange={setDiagramPoint}
          index={0}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(diagramPoint, null, 2)}</div>
      </div>

      {/* DiagramConnection Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Diagram Connection Editor</h2>
        <DiagramConnectionEditor
          value={diagramConnection}
          onChange={setDiagramConnection}
          availablePoints={availablePoints}
          index={0}
        />
        <div style={valueDisplayStyle}>{JSON.stringify(diagramConnection, null, 2)}</div>
      </div>

      {/* DiagramDataModel Editor (full) */}
      <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
        <h2 style={cardTitleStyle}>Diagram Editor (Full Data Model)</h2>
        <DiagramEditor value={diagramDataModel} onChange={setDiagramDataModel} />
        <div style={valueDisplayStyle}>{JSON.stringify(diagramDataModel, null, 2)}</div>
      </div>
    </div>
  );
}
