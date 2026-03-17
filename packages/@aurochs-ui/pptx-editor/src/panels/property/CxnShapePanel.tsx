/**
 * @file CxnShape property panel component
 *
 * Displays property editors for CxnShape (connector) elements.
 * When a property is undefined, shows an "Add" button to initialize it with defaults.
 */

import type { CxnShape } from "@aurochs-office/pptx/domain/index";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { LineEditor, createDefaultLine } from "../../ui/line";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  EffectsEditor,
  GeometryEditor,
  createDefaultTransform,
  createDefaultGeometry,
  createDefaultEffects,
} from "../../editors/index";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";

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
  /** Update shape properties immutably. */
  function updateProperties(update: Partial<CxnShape["properties"]>) {
    onChange({ ...shape, properties: { ...shape.properties, ...update } });
  }

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
      <OptionalPropertySection title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </OptionalPropertySection>

      <OptionalPropertySection title="Connections" defaultExpanded={false}>
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
      </OptionalPropertySection>

      <OptionalPropertySection
        title="Transform"
        value={shape.properties.transform}
        createDefault={createDefaultTransform}
        onChange={(transform) => updateProperties({ transform })}
        renderEditor={(v, set) => <TransformEditor value={v} onChange={set} />}
        defaultExpanded
      />

      <OptionalPropertySection
        title="Geometry"
        value={shape.properties.geometry}
        createDefault={createDefaultGeometry}
        onChange={(geometry) => updateProperties({ geometry })}
        renderEditor={(v, set) => <GeometryEditor value={v} onChange={set} />}
      />

      <OptionalPropertySection
        title="Line Style"
        value={shape.properties.line}
        createDefault={createDefaultLine}
        onChange={(line) => updateProperties({ line })}
        renderEditor={(v, set) => <LineEditor value={v} onChange={set} />}
        defaultExpanded
      />

      <OptionalPropertySection
        title="Effects"
        value={shape.properties.effects}
        createDefault={createDefaultEffects}
        onChange={(effects) => updateProperties({ effects })}
        renderEditor={(v, set) => <EffectsEditor value={v} onChange={set} />}
      />
    </>
  );
}
