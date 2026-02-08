/**
 * @file Camera3dEditor - Editor for Camera3d type
 *
 * Returns camera fields: preset, fov, zoom, rotation toggle + rotation fields.
 * @see ECMA-376 Part 1, Section 20.1.5.2 (camera)
 */

import { Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { DegreesEditor } from "../primitives/DegreesEditor";
import { PercentEditor } from "../primitives/PercentEditor";
import { Rotation3dEditor, createDefaultRotation3d } from "./Rotation3dEditor";
import { deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import type { PresetCameraType } from "@aurochs-office/pptx/domain/types";
import type { Camera3d } from "@aurochs-office/pptx/domain";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";

export type Camera3dEditorProps = EditorProps<Camera3d>;

const fieldStyle = { flex: 1 };

const cameraPresetOptions: SelectOption<PresetCameraType>[] = [
  { value: "orthographicFront", label: "Orthographic Front" },
  { value: "perspectiveFront", label: "Perspective Front" },
  { value: "perspectiveAbove", label: "Perspective Above" },
  { value: "perspectiveBelow", label: "Perspective Below" },
  { value: "perspectiveLeft", label: "Perspective Left" },
  { value: "perspectiveRight", label: "Perspective Right" },
  { value: "isometricTopUp", label: "Isometric Top Up" },
  { value: "isometricTopDown", label: "Isometric Top Down" },
  { value: "isometricLeftUp", label: "Isometric Left Up" },
  { value: "isometricLeftDown", label: "Isometric Left Down" },
  { value: "isometricRightUp", label: "Isometric Right Up" },
  { value: "isometricRightDown", label: "Isometric Right Down" },
  { value: "obliqueTopLeft", label: "Oblique Top Left" },
  { value: "obliqueTop", label: "Oblique Top" },
  { value: "obliqueTopRight", label: "Oblique Top Right" },
];

/**
 * Returns preset + fov/zoom + rotation toggle + rotation fields.
 * Rotation3dEditor is included directly (not wrapped in FieldGroup).
 */
export function Camera3dEditor({ value, onChange, disabled }: Camera3dEditorProps) {
  const handleRotationToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, rotation: createDefaultRotation3d() });
    } else {
      const { rotation: _rotation, ...rest } = value;
      void _rotation;
      onChange(rest);
    }
  };

  return (
    <>
      <FieldGroup label="Preset">
        <Select
          value={value.preset}
          onChange={(preset) => onChange({ ...value, preset })}
          options={cameraPresetOptions}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldRow>
        <FieldGroup label="FOV" style={fieldStyle}>
          <DegreesEditor
            value={value.fov ?? deg(0)}
            onChange={(fov) => onChange({ ...value, fov })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Zoom" style={fieldStyle}>
          <PercentEditor
            value={value.zoom ?? pct(100)}
            onChange={(zoom) => onChange({ ...value, zoom })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
      <Toggle checked={!!value.rotation} onChange={handleRotationToggle} label="Rotation" disabled={disabled} />
      {value.rotation && (
        <Rotation3dEditor
          value={value.rotation}
          onChange={(rotation) => onChange({ ...value, rotation })}
          disabled={disabled}
        />
      )}
    </>
  );
}

/**
 * Create default Camera3d
 */
export function createDefaultCamera3d(): Camera3d {
  return {
    preset: "orthographicFront",
  };
}
