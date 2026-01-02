/**
 * @file Scene3dEditor - Editor for Scene3d type
 *
 * Returns all scene3d fields: camera + lightRig + backdrop toggle + flatTextZ.
 * Consumer should use Camera3dEditor, LightRigEditor separately if grouping is needed.
 * @see ECMA-376 Part 1, Section 20.1.5.8 (scene3d)
 */

import { Toggle } from "../../ui/primitives";
import { FieldGroup } from "../../ui/layout";
import { PixelsEditor } from "../primitives/PixelsEditor";
import { Camera3dEditor, createDefaultCamera3d } from "./Camera3dEditor";
import { LightRigEditor, createDefaultLightRig } from "./LightRigEditor";
import { Backdrop3dEditor, createDefaultBackdrop3d } from "./Backdrop3dEditor";
import { px } from "../../../pptx/domain/types";
import type { Scene3d } from "../../../pptx/domain/shape";
import type { EditorProps } from "../../types";

export type Scene3dEditorProps = EditorProps<Scene3d>;

/**
 * Returns all scene3d fields flat.
 * Sub-editors are included directly (not wrapped).
 */
export function Scene3dEditor({
  value,
  onChange,
  disabled,
}: Scene3dEditorProps) {
  const handleBackdropToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, backdrop: createDefaultBackdrop3d() });
    } else {
      const { backdrop: _backdrop, ...rest } = value;
      void _backdrop;
      onChange(rest);
    }
  };

  return (
    <>
      {/* Camera fields directly included */}
      <Camera3dEditor
        value={value.camera}
        onChange={(camera) => onChange({ ...value, camera })}
        disabled={disabled}
      />

      {/* LightRig fields directly included */}
      <LightRigEditor
        value={value.lightRig}
        onChange={(lightRig) => onChange({ ...value, lightRig })}
        disabled={disabled}
      />

      {/* Backdrop toggle + fields */}
      <Toggle
        checked={!!value.backdrop}
        onChange={handleBackdropToggle}
        label="Backdrop"
        disabled={disabled}
      />
      {value.backdrop && (
        <Backdrop3dEditor
          value={value.backdrop}
          onChange={(backdrop) => onChange({ ...value, backdrop })}
          disabled={disabled}
        />
      )}

      {/* FlatTextZ */}
      <FieldGroup label="Flat Text Z">
        <PixelsEditor
          value={value.flatTextZ ?? px(0)}
          onChange={(flatTextZ) => onChange({ ...value, flatTextZ })}
          disabled={disabled}
        />
      </FieldGroup>
    </>
  );
}

/**
 * Create default Scene3d
 */
export function createDefaultScene3d(): Scene3d {
  return {
    camera: createDefaultCamera3d(),
    lightRig: createDefaultLightRig(),
  };
}
