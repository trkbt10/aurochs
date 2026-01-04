/**
 * @file DiagramConnectionEditor - Editor for diagram connections
 *
 * Edits connections between diagram points.
 */

import type { CSSProperties } from "react";
import type { DiagramConnection, DiagramCxnType, DiagramPoint } from "../../../pptx/domain/diagram";
import type { EditorProps } from "../../types";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { Select, Button } from "../../ui/primitives";
import type { SelectOption } from "../../types";

export type DiagramConnectionEditorProps = EditorProps<DiagramConnection> & {
  readonly style?: CSSProperties;
  /** Available points for source/destination selection */
  readonly availablePoints: readonly DiagramPoint[];
  /** Index for display purposes */
  readonly index?: number;
  /** Callback when delete is requested */
  readonly onDelete?: () => void;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const infoStyle: CSSProperties = {
  padding: "8px 12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "6px",
  fontSize: "11px",
  color: "var(--text-tertiary, #737373)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const titleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-secondary, #a1a1a1)",
};

// =============================================================================
// Constants
// =============================================================================

const CONNECTION_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "parOf", label: "Parent Of" },
  { value: "presOf", label: "Presentation Of" },
  { value: "presParOf", label: "Presentation Parent Of" },
  { value: "unknownRelationship", label: "Unknown Relationship" },
];

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for DiagramConnection type.
 *
 * Features:
 * - Select source point from available points
 * - Select destination point from available points
 * - Select connection type
 * - Delete connection
 */
export function DiagramConnectionEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  availablePoints,
  index,
  onDelete,
}: DiagramConnectionEditorProps) {
  // Build point options from available points
  const pointOptions: SelectOption[] = [
    { value: "", label: "(None)" },
    ...availablePoints.map((pt) => ({
      value: pt.modelId,
      label: getPointLabel(pt),
    })),
  ];

  const handleSourceChange = (sourceId: string) => {
    onChange({ ...value, sourceId: sourceId || undefined });
  };

  const handleDestinationChange = (destinationId: string) => {
    onChange({ ...value, destinationId: destinationId || undefined });
  };

  const handleTypeChange = (type: string) => {
    onChange({ ...value, type: (type || undefined) as DiagramCxnType | undefined });
  };

  const connectionLabel = index !== undefined ? `Connection ${index + 1}` : "Connection";

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <div style={headerStyle}>
        <span style={titleStyle}>{connectionLabel}</span>
        {onDelete && (
          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={disabled}
            style={{ padding: "4px 8px", fontSize: "12px" }}
          >
            Delete
          </Button>
        )}
      </div>

      {/* Model ID (readonly) */}
      <div style={infoStyle}>
        Model ID: <code>{value.modelId}</code>
      </div>

      <FieldRow>
        <FieldGroup label="Source">
          <Select
            value={value.sourceId ?? ""}
            onChange={handleSourceChange}
            options={pointOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Destination">
          <Select
            value={value.destinationId ?? ""}
            onChange={handleDestinationChange}
            options={pointOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Connection Type">
        <Select
          value={value.type ?? ""}
          onChange={handleTypeChange}
          options={[{ value: "", label: "(Default)" }, ...CONNECTION_TYPE_OPTIONS]}
          disabled={disabled}
        />
      </FieldGroup>
    </div>
  );
}

/**
 * Get display label for a point
 */
function getPointLabel(point: DiagramPoint): string {
  // Try to extract text from textBody
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
      return text.length > 20 ? text.substring(0, 20) + "..." : text;
    }
  }

  // Fallback to modelId
  const shortId = truncateText(point.modelId, 15);
  return `[${point.type ?? "node"}] ${shortId}`;
}

/**
 * Truncate a string and add ellipsis when needed.
 */
function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength) + "...";
}

/**
 * Create a default DiagramConnection
 */
export function createDefaultDiagramConnection(
  modelId?: string,
  sourceId?: string,
  destinationId?: string
): DiagramConnection {
  return {
    modelId: modelId ?? `cxn-${Date.now()}`,
    type: "parOf",
    sourceId,
    destinationId,
  };
}
