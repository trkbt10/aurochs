/**
 * @file LightRigEditor - Editor for LightRig type
 *
 * Returns light rig fields: rig type, direction, rotation toggle + rotation fields.
 * @see ECMA-376 Part 1, Section 20.1.5.3 (lightRig)
 */

import { Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Rotation3dEditor, createDefaultRotation3d } from "./Rotation3dEditor";
import type { LightRigType, LightRigDirection, LightRig } from "@aurochs-office/pptx/domain";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";

export type LightRigEditorProps = EditorProps<LightRig>;

const fieldStyle = { flex: 1 };

const lightRigTypeOptions: SelectOption<LightRigType>[] = [
  { value: "balanced", label: "Balanced" },
  { value: "brightRoom", label: "Bright Room" },
  { value: "chilly", label: "Chilly" },
  { value: "contrasting", label: "Contrasting" },
  { value: "flat", label: "Flat" },
  { value: "flood", label: "Flood" },
  { value: "freezing", label: "Freezing" },
  { value: "glow", label: "Glow" },
  { value: "harsh", label: "Harsh" },
  { value: "morning", label: "Morning" },
  { value: "soft", label: "Soft" },
  { value: "sunrise", label: "Sunrise" },
  { value: "sunset", label: "Sunset" },
  { value: "threePt", label: "Three Point" },
  { value: "twoPt", label: "Two Point" },
];

const lightRigDirectionOptions: SelectOption<LightRigDirection>[] = [
  { value: "tl", label: "Top Left" },
  { value: "t", label: "Top" },
  { value: "tr", label: "Top Right" },
  { value: "l", label: "Left" },
  { value: "r", label: "Right" },
  { value: "bl", label: "Bottom Left" },
  { value: "b", label: "Bottom" },
  { value: "br", label: "Bottom Right" },
];

/**
 * Returns rig type/direction + rotation toggle + rotation fields.
 * Rotation3dEditor is included directly (not wrapped in FieldGroup).
 */
export function LightRigEditor({ value, onChange, disabled }: LightRigEditorProps) {
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
      <FieldRow>
        <FieldGroup label="Rig Type" style={fieldStyle}>
          <Select
            value={value.rig}
            onChange={(rig) => onChange({ ...value, rig })}
            options={lightRigTypeOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Direction" style={fieldStyle}>
          <Select
            value={value.direction}
            onChange={(direction) => onChange({ ...value, direction })}
            options={lightRigDirectionOptions}
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
 * Create default LightRig
 */
export function createDefaultLightRig(): LightRig {
  return {
    rig: "threePt",
    direction: "t",
  };
}
