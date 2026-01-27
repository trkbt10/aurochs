/**
 * @file Backdrop3dEditor - Editor for Backdrop3d type
 *
 * Returns 3 labeled point groups: Anchor, Normal, Up Vector.
 * @see ECMA-376 Part 1, Section 20.1.5.1 (backdrop)
 */

import { FieldGroup } from "@oxen-ui/ui-components/layout";
import { px } from "@oxen/ooxml/domain/units";
import type { Backdrop3d } from "@oxen/pptx/domain";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import { PointEditor, createDefaultPoint } from "./PointEditor";

export type Backdrop3dEditorProps = EditorProps<Backdrop3d>;

/**
 * Returns 3 labeled FieldGroups, each containing PointEditor.
 */
export function Backdrop3dEditor({
  value,
  onChange,
  disabled,
}: Backdrop3dEditorProps) {
  return (
    <>
      <FieldGroup label="Anchor">
        <PointEditor
          value={value.anchor}
          onChange={(anchor) => onChange({ ...value, anchor })}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Normal">
        <PointEditor
          value={value.normal}
          onChange={(normal) => onChange({ ...value, normal })}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Up Vector">
        <PointEditor
          value={value.up}
          onChange={(up) => onChange({ ...value, up })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Create default Backdrop3d
 */
export function createDefaultBackdrop3d(): Backdrop3d {
  return {
    anchor: createDefaultPoint(),
    normal: createDefaultPoint(),
    up: { x: px(0), y: px(1) },
  };
}
