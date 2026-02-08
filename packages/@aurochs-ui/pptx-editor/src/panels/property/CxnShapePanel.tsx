/**
 * @file CxnShape property panel component
 *
 * Displays property editors for CxnShape (connector) elements.
 */

import type { CxnShape } from "@aurochs-office/pptx/domain/index";
import { Accordion } from "@aurochs-ui/ui-components/layout";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { LineEditor } from "../../ui/line";
import { NonVisualPropertiesEditor, TransformEditor, EffectsEditor, GeometryEditor } from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

export type CxnShapePanelProps = {
  readonly shape: CxnShape;
  readonly onChange: (shape: CxnShape) => void;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format connection point display text.
 */
function formatConnection(connection: { shapeId: string; siteIndex: number } | undefined): string {
  if (!connection) {
    return "None";
  }
  return `Shape ${connection.shapeId}, Site ${connection.siteIndex}`;
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Connection point row with clear button.
 */
function ConnectionRow({
  label,
  connection,
  onClear,
}: {
  readonly label: string;
  readonly connection: { shapeId: string; siteIndex: number } | undefined;
  readonly onClear: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>
        {label}: {formatConnection(connection)}
      </span>
      {connection && (
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: "2px 6px",
            fontSize: "10px",
            backgroundColor: "transparent",
            border: "1px solid var(--border-subtle)",
            borderRadius: "4px",
            color: "var(--text-tertiary)",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * CxnShape editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Connections (start/end connection points)
 * - Transform
 * - Geometry
 * - Line style
 * - Effects
 */
export function CxnShapePanel({ shape, onChange }: CxnShapePanelProps) {
  const handleClearStartConnection = () => {
    onChange({
      ...shape,
      nonVisual: { ...shape.nonVisual, startConnection: undefined },
    });
  };

  const handleClearEndConnection = () => {
    onChange({
      ...shape,
      nonVisual: { ...shape.nonVisual, endConnection: undefined },
    });
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </Accordion>

      <Accordion title="Connections" defaultExpanded={false}>
        <FieldGroup label="Connection Points">
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <ConnectionRow
              label="Start"
              connection={shape.nonVisual.startConnection}
              onClear={handleClearStartConnection}
            />
            <ConnectionRow label="End" connection={shape.nonVisual.endConnection} onClear={handleClearEndConnection} />
          </div>
        </FieldGroup>
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.properties.transform && (
          <TransformEditor
            value={shape.properties.transform}
            onChange={(transform) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, transform },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Geometry" defaultExpanded={false}>
        {shape.properties.geometry && (
          <GeometryEditor
            value={shape.properties.geometry}
            onChange={(geometry) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, geometry },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Line Style" defaultExpanded>
        {shape.properties.line && (
          <LineEditor
            value={shape.properties.line}
            onChange={(line) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, line },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Effects" defaultExpanded={false}>
        {shape.properties.effects && (
          <EffectsEditor
            value={shape.properties.effects}
            onChange={(effects) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, effects },
              })
            }
          />
        )}
      </Accordion>
    </>
  );
}
