/**
 * @file Bevel3dEditor - Editor for Bevel3d type
 *
 * Returns 3 fields: Preset, Width, Height.
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */

import { Select } from "@oxen-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { PixelsEditor } from "../primitives/PixelsEditor";
import { px } from "@oxen/ooxml/domain/units";
import type { Bevel3d, BevelPresetType } from "@oxen/pptx/domain";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";

export type Bevel3dEditorProps = EditorProps<Bevel3d>;

const fieldStyle = { flex: 1 };

const bevelPresetOptions: SelectOption<BevelPresetType>[] = [
  { value: "angle", label: "Angle" },
  { value: "artDeco", label: "Art Deco" },
  { value: "circle", label: "Circle" },
  { value: "convex", label: "Convex" },
  { value: "coolSlant", label: "Cool Slant" },
  { value: "cross", label: "Cross" },
  { value: "divot", label: "Divot" },
  { value: "hardEdge", label: "Hard Edge" },
  { value: "relaxedInset", label: "Relaxed Inset" },
  { value: "riblet", label: "Riblet" },
  { value: "slope", label: "Slope" },
  { value: "softRound", label: "Soft Round" },
];

/**
 * Returns Preset select + Width/Height row.
 */
export function Bevel3dEditor({
  value,
  onChange,
  disabled,
}: Bevel3dEditorProps) {
  return (
    <>
      <FieldGroup label="Preset">
        <Select
          value={value.preset}
          onChange={(preset) => onChange({ ...value, preset })}
          options={bevelPresetOptions}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldRow>
        <FieldGroup label="Width" style={fieldStyle}>
          <PixelsEditor
            value={value.width}
            onChange={(width) => onChange({ ...value, width })}
            disabled={disabled}
            min={0}
          />
        </FieldGroup>
        <FieldGroup label="Height" style={fieldStyle}>
          <PixelsEditor
            value={value.height}
            onChange={(height) => onChange({ ...value, height })}
            disabled={disabled}
            min={0}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Create default Bevel3d
 */
export function createDefaultBevel3d(): Bevel3d {
  return {
    width: px(6),
    height: px(6),
    preset: "circle",
  };
}
