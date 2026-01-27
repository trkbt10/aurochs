/**
 * @file SpShape property panel component
 *
 * Displays property editors for SpShape (general shape) elements.
 */

import type { SpShape } from "@oxen/pptx/domain/index";
import { Accordion } from "@oxen-ui/ui-components/layout";
import { LineEditor } from "../../ui/line";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  MixedTextBodyEditor,
  FillEditor,
  EffectsEditor,
  GeometryEditor,
} from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

export type SpShapePanelProps = {
  readonly shape: SpShape;
  readonly onChange: (shape: SpShape) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * SpShape editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Transform
 * - Geometry
 * - Fill
 * - Line
 * - Effects
 * - Text (if present)
 */
export function SpShapePanel({ shape, onChange }: SpShapePanelProps) {
  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
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

      <Accordion title="Fill" defaultExpanded={false}>
        {shape.properties.fill && (
          <FillEditor
            value={shape.properties.fill}
            onChange={(fill) =>
              onChange({
                ...shape,
                properties: { ...shape.properties, fill },
              })
            }
          />
        )}
      </Accordion>

      <Accordion title="Line" defaultExpanded={false}>
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

      {shape.textBody && (
        <Accordion title="Text" defaultExpanded={false}>
          <MixedTextBodyEditor
            value={shape.textBody}
            onChange={(textBody) => onChange({ ...shape, textBody })}
          />
        </Accordion>
      )}
    </>
  );
}
