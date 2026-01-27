/**
 * @file ShapePropertiesEditor - Editor for ShapeProperties type
 *
 * Returns all shape property fields: transform, geometry, fill, line, effects, scene3d, shape3d.
 * Consumer should use individual editors if grouping is needed.
 * @see ECMA-376 Part 1, Section 20.1.2.2.35 (spPr)
 */

import { Toggle } from "@oxen-ui/ui-components/primitives";
import { TransformEditor, createDefaultTransform } from "../primitives/TransformEditor";
import { FillEditor, createNoFill } from "../color/FillEditor";
import { LineEditor, createDefaultLine } from "../../ui/line";
import { GeometryEditor, createDefaultGeometry } from "./GeometryEditor";
import { EffectsEditor, createDefaultEffects } from "./EffectsEditor";
import { Scene3dEditor, createDefaultScene3d } from "./Scene3dEditor";
import { Shape3dEditor, createDefaultShape3d } from "./Shape3dEditor";
import type { ShapeProperties, Geometry } from "@oxen/pptx/domain/shape";
import type { Scene3d, Shape3d } from "@oxen/pptx/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import type { Transform, Effects } from "@oxen/pptx/domain/types";
import type { Fill, Line } from "@oxen/pptx/domain/color/types";

export type ShapePropertiesEditorProps = EditorProps<ShapeProperties> & {
  readonly showTransform?: boolean;
  readonly showGeometry?: boolean;
  readonly showFill?: boolean;
  readonly showLine?: boolean;
  readonly showEffects?: boolean;
  readonly showScene3d?: boolean;
  readonly showShape3d?: boolean;
};

/**
 * Returns all shape property fields flat.
 * Sub-editors are included directly (not wrapped).
 */
export function ShapePropertiesEditor({
  value,
  onChange,
  disabled,
  showTransform = true,
  showGeometry = true,
  showFill = true,
  showLine = true,
  showEffects = true,
  showScene3d = true,
  showShape3d = true,
}: ShapePropertiesEditorProps) {
  const handleTransformChange = (transform: Transform) => {
    onChange({ ...value, transform });
  };

  const handleGeometryChange = (geometry: Geometry) => {
    onChange({ ...value, geometry });
  };

  const handleFillChange = (fill: Fill) => {
    onChange({ ...value, fill });
  };

  const handleLineChange = (line: Line) => {
    onChange({ ...value, line });
  };

  const handleEffectsChange = (effects: Effects) => {
    onChange({ ...value, effects });
  };

  const handleScene3dToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, scene3d: createDefaultScene3d() });
    } else {
      const { scene3d: _scene3d, ...rest } = value;
      void _scene3d;
      onChange(rest);
    }
  };

  const handleScene3dChange = (scene3d: Scene3d) => {
    onChange({ ...value, scene3d });
  };

  const handleShape3dToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, shape3d: createDefaultShape3d() });
    } else {
      const { shape3d: _shape3d, ...rest } = value;
      void _shape3d;
      onChange(rest);
    }
  };

  const handleShape3dChange = (shape3d: Shape3d) => {
    onChange({ ...value, shape3d });
  };

  return (
    <>
      {showTransform && (
        <TransformEditor
          value={value.transform ?? createDefaultTransform()}
          onChange={handleTransformChange}
          disabled={disabled}
        />
      )}

      {showGeometry && (
        <GeometryEditor
          value={value.geometry ?? createDefaultGeometry()}
          onChange={handleGeometryChange}
          disabled={disabled}
        />
      )}

      {showFill && (
        <FillEditor
          value={value.fill ?? createNoFill()}
          onChange={handleFillChange}
          disabled={disabled}
        />
      )}

      {showLine && (
        <LineEditor
          value={value.line ?? createDefaultLine()}
          onChange={handleLineChange}
          disabled={disabled}
        />
      )}

      {showEffects && (
        <EffectsEditor
          value={value.effects ?? createDefaultEffects()}
          onChange={handleEffectsChange}
          disabled={disabled}
        />
      )}

      {showScene3d && (
        <>
          <Toggle
            checked={!!value.scene3d}
            onChange={handleScene3dToggle}
            label="3D Scene"
            disabled={disabled}
          />
          {value.scene3d && (
            <Scene3dEditor
              value={value.scene3d}
              onChange={handleScene3dChange}
              disabled={disabled}
            />
          )}
        </>
      )}

      {showShape3d && (
        <>
          <Toggle
            checked={!!value.shape3d}
            onChange={handleShape3dToggle}
            label="3D Shape"
            disabled={disabled}
          />
          {value.shape3d && (
            <Shape3dEditor
              value={value.shape3d}
              onChange={handleShape3dChange}
              disabled={disabled}
            />
          )}
        </>
      )}
    </>
  );
}

/**
 * Create default shape properties
 */
export function createDefaultShapeProperties(): ShapeProperties {
  return {
    transform: createDefaultTransform(),
    geometry: createDefaultGeometry(),
    fill: createNoFill(),
  };
}
