/**
 * @file DiagramEditor - Editor for DiagramDataModel
 *
 * Edits full diagram: points (nodes), connections, and structure.
 */

import { useCallback, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { DiagramDataModel, DiagramPoint, DiagramConnection } from "@oxen-office/diagram/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import { Accordion } from "@oxen-ui/ui-components/layout";
import { Button } from "@oxen-ui/ui-components/primitives";
import type { DiagramEditorAdapters } from "./types";
import { extractPlainTextFromTextBody } from "./text-body";
import { DiagramPointEditor, createDefaultDiagramPoint } from "./DiagramPointEditor";
import { DiagramConnectionEditor, createDefaultDiagramConnection } from "./DiagramConnectionEditor";

export type DiagramEditorProps<TTextBody, TShapeProperties> = EditorProps<DiagramDataModel> & {
  readonly style?: CSSProperties;
  readonly adapters?: DiagramEditorAdapters<TTextBody, TShapeProperties>;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const listContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const itemContainerStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const pointGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: "8px",
};

const pointCardStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  transition: "all 150ms ease",
  textAlign: "center",
  fontSize: "12px",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  color: "var(--text-secondary, #a1a1a1)",
  border: "1px solid transparent",
};

const pointCardSelectedStyle: CSSProperties = {
  ...pointCardStyle,
  backgroundColor: "var(--accent-blue, #0070f3)",
  color: "var(--text-primary, #fafafa)",
};

const emptyStyle: CSSProperties = {
  padding: "20px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "13px",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "8px",
};

// =============================================================================
// Sub-Components
// =============================================================================

type PointGridProps = {
  readonly points: readonly DiagramPoint[];
  readonly selectedIndex: number | null;
  readonly disabled?: boolean;
  readonly onSelect: (index: number) => void;
};

function PointGrid({ points, selectedIndex, disabled, onSelect }: PointGridProps) {
  if (points.length === 0) {
    return <div style={emptyStyle}>No points in diagram</div>;
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelect(index);
    }
  };

  return (
    <div style={pointGridStyle}>
      {points.map((point, index) => {
        const isSelected = selectedIndex === index;
        const cardStyle = isSelected ? pointCardSelectedStyle : pointCardStyle;
        const displayText = getPointDisplayText(point);
        const tabIndexValue = disabled ? -1 : 0;

        return (
          <div
            key={point.modelId}
            style={cardStyle}
            onClick={() => !disabled && onSelect(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            role="button"
            tabIndex={tabIndexValue}
            aria-selected={isSelected}
            title={point.modelId}
          >
            <div style={{ fontWeight: 500 }}>{displayText}</div>
            <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "4px" }}>
              {point.type ?? "node"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================


























/**
 * Editor for DiagramDataModel (points and connections).
 */
export function DiagramEditor<TTextBody, TShapeProperties>({
  value,
  onChange,
  disabled,
  className,
  style,
  adapters,
}: DiagramEditorProps<TTextBody, TShapeProperties>) {
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    value.points.length > 0 ? 0 : null,
  );

  const handlePointChange = useCallback(
    (point: DiagramPoint) => {
      if (selectedPointIndex === null) {
        return;
      }

      const newPoints = value.points.map((p, i) => (i === selectedPointIndex ? point : p));
      onChange({ ...value, points: newPoints });
    },
    [value, onChange, selectedPointIndex],
  );

  const handleAddPoint = useCallback(() => {
    const newPoint = createDefaultDiagramPoint();
    const newPoints = [...value.points, newPoint];
    onChange({ ...value, points: newPoints });
    setSelectedPointIndex(newPoints.length - 1);
  }, [value, onChange]);

  const handleDeletePoint = useCallback(() => {
    if (selectedPointIndex === null) {
      return;
    }

    const deletedPoint = value.points[selectedPointIndex];
    const newPoints = value.points.filter((_, i) => i !== selectedPointIndex);

    const newConnections = value.connections.filter(
      (c) => c.sourceId !== deletedPoint.modelId && c.destinationId !== deletedPoint.modelId,
    );

    onChange({ points: newPoints, connections: newConnections });

    if (newPoints.length === 0) {
      setSelectedPointIndex(null);
      return;
    }
    setSelectedPointIndex(Math.min(selectedPointIndex, newPoints.length - 1));
  }, [value, onChange, selectedPointIndex]);

  // ==========================================================================
  // Connection handlers
  // ==========================================================================

  const handleConnectionChange = useCallback(
    (index: number, connection: DiagramConnection) => {
      const newConnections = value.connections.map((c, i) => (i === index ? connection : c));
      onChange({ ...value, connections: newConnections });
    },
    [value, onChange],
  );

  const handleAddConnection = useCallback(() => {
    const newConnection = createDefaultDiagramConnection();
    onChange({ ...value, connections: [...value.connections, newConnection] });
  }, [value, onChange]);

  const handleDeleteConnection = useCallback(
    (index: number) => {
      const newConnections = value.connections.filter((_, i) => i !== index);
      onChange({ ...value, connections: newConnections });
    },
    [value, onChange],
  );

  const selectedPoint = selectedPointIndex !== null ? value.points[selectedPointIndex] : undefined;
  const connectionsContent = renderConnectionsContent({
    connections: value.connections,
    points: value.points,
    disabled,
    onChangeConnection: handleConnectionChange,
    onDeleteConnection: handleDeleteConnection,
  });

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <Accordion title="Points" defaultExpanded>
        <PointGrid
          points={value.points}
          selectedIndex={selectedPointIndex}
          disabled={disabled}
          onSelect={setSelectedPointIndex}
        />

        <div style={buttonRowStyle}>
          <Button onClick={handleAddPoint} disabled={disabled}>
            Add Point
          </Button>
          <Button
            onClick={handleDeletePoint}
            disabled={disabled || selectedPointIndex === null}
            variant="ghost"
          >
            Delete Point
          </Button>
        </div>
      </Accordion>

      {selectedPoint && (
        <Accordion title="Selected Point" defaultExpanded>
          <DiagramPointEditor
            value={selectedPoint}
            onChange={handlePointChange}
            disabled={disabled}
            adapters={adapters}
          />
        </Accordion>
      )}

      <Accordion title="Connections" defaultExpanded={false}>
        {connectionsContent}

        <div style={buttonRowStyle}>
          <Button onClick={handleAddConnection} disabled={disabled}>
            Add Connection
          </Button>
        </div>
      </Accordion>
    </div>
  );
}

function getPointDisplayText(point: DiagramPoint): string {
  const text = extractPlainTextFromTextBody(point.textBody);
  if (text) {
    return text.length > 15 ? text.substring(0, 15) + "..." : text;
  }
  return point.type ?? "node";
}


























/**
 * Create an empty default DiagramDataModel.
 */
export function createDefaultDiagramDataModel(): DiagramDataModel {
  return {
    points: [],
    connections: [],
  };
}

function renderConnectionsContent(params: {
  readonly connections: readonly DiagramConnection[];
  readonly points: readonly DiagramPoint[];
  readonly disabled: boolean | undefined;
  readonly onChangeConnection: (index: number, connection: DiagramConnection) => void;
  readonly onDeleteConnection: (index: number) => void;
}): ReactNode {
  const { connections, points, disabled, onChangeConnection, onDeleteConnection } = params;
  if (connections.length === 0) {
    return <div style={emptyStyle}>No connections in diagram</div>;
  }

  return (
    <div style={listContainerStyle}>
      {connections.map((connection, index) => (
        <div key={connection.modelId} style={itemContainerStyle}>
          <DiagramConnectionEditor
            value={connection}
            onChange={(c) => onChangeConnection(index, c)}
            disabled={disabled}
            availablePoints={points}
            index={index}
            onDelete={() => onDeleteConnection(index)}
          />
        </div>
      ))}
    </div>
  );
}
