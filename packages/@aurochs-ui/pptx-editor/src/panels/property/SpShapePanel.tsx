/**
 * @file SpShape property panel component
 *
 * Displays property editors for SpShape (general shape) elements.
 */

import type { SpShape } from "@aurochs-office/pptx/domain/index";
import { Accordion } from "@aurochs-ui/ui-components/layout";
import { LineEditor, createDefaultLine } from "../../ui/line";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  MixedTextBodyEditor,
  FillEditor,
  EffectsEditor,
  GeometryEditor,
  createDefaultTransform,
  createDefaultGeometry,
  createDefaultEffects,
  createDefaultSolidFill,
} from "../../editors/index";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";

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

/** SpShape editor panel. */
export function SpShapePanel({ shape, onChange }: SpShapePanelProps) {
  function updateProps(update: Partial<SpShape["properties"]>) {
    onChange({ ...shape, properties: { ...shape.properties, ...update } });
  }

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </Accordion>

      <OptionalPropertySection
        title="Transform"
        value={shape.properties.transform}
        createDefault={createDefaultTransform}
        onChange={(transform) => updateProps({ transform })}
        renderEditor={(v, set) => <TransformEditor value={v} onChange={set} />}
        defaultExpanded
      />

      <OptionalPropertySection
        title="Geometry"
        value={shape.properties.geometry}
        createDefault={createDefaultGeometry}
        onChange={(geometry) => updateProps({ geometry })}
        renderEditor={(v, set) => <GeometryEditor value={v} onChange={set} />}
      />

      <OptionalPropertySection
        title="Fill"
        value={shape.properties.fill}
        createDefault={createDefaultSolidFill}
        onChange={(fill) => updateProps({ fill })}
        renderEditor={(v, set) => <FillEditor value={v} onChange={set} />}
      />

      <OptionalPropertySection
        title="Line"
        value={shape.properties.line}
        createDefault={createDefaultLine}
        onChange={(line) => updateProps({ line })}
        renderEditor={(v, set) => <LineEditor value={v} onChange={set} />}
      />

      <OptionalPropertySection
        title="Effects"
        value={shape.properties.effects}
        createDefault={createDefaultEffects}
        onChange={(effects) => updateProps({ effects })}
        renderEditor={(v, set) => <EffectsEditor value={v} onChange={set} />}
      />

      {shape.textBody && (
        <Accordion title="Text" defaultExpanded={false}>
          <MixedTextBodyEditor value={shape.textBody} onChange={(textBody) => onChange({ ...shape, textBody })} />
        </Accordion>
      )}
    </>
  );
}
