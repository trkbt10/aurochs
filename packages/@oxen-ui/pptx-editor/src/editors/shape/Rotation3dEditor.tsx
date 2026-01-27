/**
 * @file Rotation3dEditor - Editor for Rotation3d type
 *
 * Returns 3 labeled fields: Latitude, Longitude, Revolution.
 * @see ECMA-376 Part 1, Section 20.1.5.7 (rot)
 */

import { FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { DegreesEditor } from "../primitives/DegreesEditor";
import { deg } from "@oxen/ooxml/domain/units";
import type { Rotation3d } from "@oxen/pptx/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";

export type Rotation3dEditorProps = EditorProps<Rotation3d>;

const fieldStyle = { flex: 1 };

/**
 * Returns 3 FieldGroups for latitude, longitude, revolution.
 */
export function Rotation3dEditor({
  value,
  onChange,
  disabled,
}: Rotation3dEditorProps) {
  return (
    <>
      <FieldRow>
        <FieldGroup label="Latitude" style={fieldStyle}>
          <DegreesEditor
            value={value.latitude}
            onChange={(latitude) => onChange({ ...value, latitude })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Longitude" style={fieldStyle}>
          <DegreesEditor
            value={value.longitude}
            onChange={(longitude) => onChange({ ...value, longitude })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Revolution" style={fieldStyle}>
          <DegreesEditor
            value={value.revolution}
            onChange={(revolution) => onChange({ ...value, revolution })}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Create default Rotation3d
 */
export function createDefaultRotation3d(): Rotation3d {
  return {
    latitude: deg(0),
    longitude: deg(0),
    revolution: deg(0),
  };
}
