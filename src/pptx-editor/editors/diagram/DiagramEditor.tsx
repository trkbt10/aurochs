/**
 * @file DiagramEditor - Editor for DiagramDataModel
 *
 * Edits full diagram: points (nodes), connections, and structure.
 */

import { useCallback, useState, type CSSProperties, type KeyboardEvent } from "react";
import type {
  DiagramDataModel,
  DiagramPoint,
  DiagramConnection,
} from "../../../pptx/domain/diagram";
import type { EditorProps } from "../../types";
import { Accordion } from "../../ui/layout";
import { Button } from "../../ui/primitives";
import { DiagramPointEditor, createDefaultDiagramPoint } from "./DiagramPointEditor";
import { DiagramConnectionEditor, createDefaultDiagramConnection } from "./DiagramConnectionEditor";

export type DiagramEditorProps = EditorProps<DiagramDataModel> & {
  readonly style?: CSSProperties;
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
// Helpers
// =============================================================================

/**
 * Get display text for a point
 */
function getPointDisplayText(point: DiagramPoint): string {
  if (point.textBody?.paragraphs) {
    const texts: string[] = [];
    for (const para of point.textBody.paragraphs) {
      for (const run of para.runs) {
        if (run.type === "text") {
          texts.push(run.text);
        }
      }
    }
    const text = texts.join(" ").trim();
    if (text) {
      return text.length > 15 ? text.substring(0, 15) + "..." : text;
    }
  }
  return point.type ?? "node";
}

// =============================================================================
// Sub-Components
// =============================================================================

type PointGridProps = {
  readonly points: readonly DiagramPoint[];
  readonly selectedIndex: number | null;
  readonly disabled?: boolean;
  readonly onSelect: (index: number) => void;
};

/**
 * Grid of point cards for selection
 */
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
 * Editor for DiagramDataModel type.
 *
 * Features:
 * - Display and select points (nodes)
 * - Edit selected point via DiagramPointEditor
 * - Add/remove points
 * - Display and edit connections
 * - Add/remove connections
 */
export function DiagramEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: DiagramEditorProps) {
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    value.points.length > 0 ? 0 : null
  );

  // ==========================================================================
  // Point handlers
  // ==========================================================================

  const handlePointChange = useCallback(
    (point: DiagramPoint) => {
      if (selectedPointIndex === null) {
        return;
      }

      const newPoints = value.points.map((p, i) =>
        i === selectedPointIndex ? point : p
      );
      onChange({ ...value, points: newPoints });
    },
    [value, onChange, selectedPointIndex]
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

    // Also remove connections referencing this point
    const newConnections = value.connections.filter(
      (c) => c.sourceId !== deletedPoint.modelId && c.destinationId !== deletedPoint.modelId
    );

    onChange({ ...value, points: newPoints, connections: newConnections });

    // Adjust selection
    if (newPoints.length === 0) {
      setSelectedPointIndex(null);
    } else if (selectedPointIndex >= newPoints.length) {
      setSelectedPointIndex(newPoints.length - 1);
    }
  }, [value, onChange, selectedPointIndex]);

  // ==========================================================================
  // Connection handlers
  // ==========================================================================

  const handleConnectionChange = useCallback(
    (index: number, connection: DiagramConnection) => {
      const newConnections = value.connections.map((c, i) =>
        i === index ? connection : c
      );
      onChange({ ...value, connections: newConnections });
    },
    [value, onChange]
  );

  const handleAddConnection = useCallback(() => {
    const newConnection = createDefaultDiagramConnection();
    const newConnections = [...value.connections, newConnection];
    onChange({ ...value, connections: newConnections });
  }, [value, onChange]);

  const handleDeleteConnection = useCallback(
    (index: number) => {
      const newConnections = value.connections.filter((_, i) => i !== index);
      onChange({ ...value, connections: newConnections });
    },
    [value, onChange]
  );

  const renderConnections = () => {
    if (value.connections.length === 0) {
      return <div style={emptyStyle}>No connections</div>;
    }

    return value.connections.map((connection, index) => (
      <div key={connection.modelId} style={itemContainerStyle}>
        <DiagramConnectionEditor
          value={connection}
          onChange={(c) => handleConnectionChange(index, c)}
          disabled={disabled}
          availablePoints={value.points}
          index={index}
          onDelete={() => handleDeleteConnection(index)}
        />
      </div>
    ));
  };

  // ==========================================================================
  // Derived state
  // ==========================================================================

  const selectedPoint =
    selectedPointIndex !== null ? value.points[selectedPointIndex] : null;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Points Section */}
      <Accordion title={`Points (${value.points.length})`} defaultExpanded>
        <div style={listContainerStyle}>
          <PointGrid
            points={value.points}
            selectedIndex={selectedPointIndex}
            disabled={disabled}
            onSelect={setSelectedPointIndex}
          />

          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              onClick={handleAddPoint}
              disabled={disabled}
              style={{ padding: "4px 10px", fontSize: "12px" }}
            >
              Add Point
            </Button>
            <Button
              variant="ghost"
              onClick={handleDeletePoint}
              disabled={disabled || selectedPointIndex === null}
              style={{ padding: "4px 10px", fontSize: "12px" }}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      </Accordion>

      {/* Selected Point Editor */}
      {selectedPoint && (
        <Accordion title="Selected Point" defaultExpanded>
          <DiagramPointEditor
            value={selectedPoint}
            onChange={handlePointChange}
            disabled={disabled}
          />
        </Accordion>
      )}

      {/* Connections Section */}
      <Accordion title={`Connections (${value.connections.length})`} defaultExpanded={false}>
        <div style={listContainerStyle}>
          {renderConnections()}

          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              onClick={handleAddConnection}
              disabled={disabled}
              style={{ padding: "4px 10px", fontSize: "12px" }}
            >
              Add Connection
            </Button>
          </div>
        </div>
      </Accordion>
    </div>
  );
}

/**
 * Create a default DiagramDataModel
 */
export function createDefaultDiagramDataModel(): DiagramDataModel {
  return {
    points: [],
    connections: [],
  };
}
