/**
 * @file Shape3dEditor - Editor for Shape3d type
 *
 * Edits 3D shape properties including z, extrusion, contour, material, and bevel.
 * Pure content - no container styling. Consumer wraps in Section/Accordion.
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */

import { Select, Toggle } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PixelsEditor } from "../primitives/PixelsEditor";
import { FillEditor, createNoFill } from "../color/FillEditor";
import { Bevel3dEditor, createDefaultBevel3d } from "./Bevel3dEditor";
import { px, type PresetMaterialType } from "../../../pptx/domain/types";
import type { Shape3d } from "../../../pptx/domain";
import type { Fill } from "../../../pptx/domain/color/types";
import type { EditorProps, SelectOption } from "../../types";

export type Shape3dEditorProps = EditorProps<Shape3d>;

const fieldStyle = { flex: 1 };

// Material preset options
const materialPresetOptions: SelectOption<PresetMaterialType>[] = [
  { value: "clear", label: "Clear" },
  { value: "dkEdge", label: "Dark Edge" },
  { value: "flat", label: "Flat" },
  { value: "legacyMatte", label: "Legacy Matte" },
  { value: "legacyMetal", label: "Legacy Metal" },
  { value: "legacyPlastic", label: "Legacy Plastic" },
  { value: "legacyWireframe", label: "Legacy Wireframe" },
  { value: "matte", label: "Matte" },
  { value: "metal", label: "Metal" },
  { value: "plastic", label: "Plastic" },
  { value: "powder", label: "Powder" },
  { value: "softEdge", label: "Soft Edge" },
  { value: "softmetal", label: "Soft Metal" },
  { value: "translucentPowder", label: "Translucent Powder" },
  { value: "warmMatte", label: "Warm Matte" },
];

/**
 * Shape3d editor. Pure content - no containers.
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export function Shape3dEditor({
  value,
  onChange,
  disabled,
}: Shape3dEditorProps) {
  const handleBevelTopToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, bevelTop: createDefaultBevel3d() });
    } else {
      const { bevelTop: _bevelTop, ...rest } = value;
      void _bevelTop;
      onChange(rest);
    }
  };

  const handleBevelBottomToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, bevelBottom: createDefaultBevel3d() });
    } else {
      const { bevelBottom: _bevelBottom, ...rest } = value;
      void _bevelBottom;
      onChange(rest);
    }
  };

  const handleExtrusionColorToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, extrusionColor: createNoFill() });
    } else {
      const { extrusionColor: _extrusionColor, ...rest } = value;
      void _extrusionColor;
      onChange(rest);
    }
  };

  const handleContourColorToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, contourColor: createNoFill() });
    } else {
      const { contourColor: _contourColor, ...rest } = value;
      void _contourColor;
      onChange(rest);
    }
  };

  return (
    <>
      {/* Basic properties */}
      <FieldRow>
        <FieldGroup label="Z Position" style={fieldStyle}>
          <PixelsEditor
            value={value.z ?? px(0)}
            onChange={(z) => onChange({ ...value, z })}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Material" style={fieldStyle}>
          <Select
            value={value.preset ?? "plastic"}
            onChange={(preset) => onChange({ ...value, preset })}
            options={materialPresetOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      {/* Extrusion */}
      <FieldGroup label="Extrusion Height">
        <PixelsEditor
          value={value.extrusionHeight ?? px(0)}
          onChange={(extrusionHeight) => onChange({ ...value, extrusionHeight })}
          disabled={disabled}
          min={0}
        />
      </FieldGroup>
      <Toggle
        checked={!!value.extrusionColor}
        onChange={handleExtrusionColorToggle}
        label="Extrusion Color"
        disabled={disabled}
      />
      {value.extrusionColor && (
        <FillEditor
          value={value.extrusionColor}
          onChange={(extrusionColor: Fill) => onChange({ ...value, extrusionColor })}
          disabled={disabled}
        />
      )}

      {/* Contour */}
      <FieldGroup label="Contour Width">
        <PixelsEditor
          value={value.contourWidth ?? px(0)}
          onChange={(contourWidth) => onChange({ ...value, contourWidth })}
          disabled={disabled}
          min={0}
        />
      </FieldGroup>
      <Toggle
        checked={!!value.contourColor}
        onChange={handleContourColorToggle}
        label="Contour Color"
        disabled={disabled}
      />
      {value.contourColor && (
        <FillEditor
          value={value.contourColor}
          onChange={(contourColor: Fill) => onChange({ ...value, contourColor })}
          disabled={disabled}
        />
      )}

      {/* Bevel Top (bevelT - front face) */}
      <Toggle
        checked={!!value.bevelTop}
        onChange={handleBevelTopToggle}
        label="Top Bevel (Front)"
        disabled={disabled}
      />
      {value.bevelTop && (
        <Bevel3dEditor
          value={value.bevelTop}
          onChange={(bevelTop) => onChange({ ...value, bevelTop })}
          disabled={disabled}
        />
      )}

      {/* Bevel Bottom (bevelB - back face) */}
      <Toggle
        checked={!!value.bevelBottom}
        onChange={handleBevelBottomToggle}
        label="Bottom Bevel (Back)"
        disabled={disabled}
      />
      {value.bevelBottom && (
        <Bevel3dEditor
          value={value.bevelBottom}
          onChange={(bevelBottom) => onChange({ ...value, bevelBottom })}
          disabled={disabled}
        />
      )}
    </>
  );
}

/**
 * Create default Shape3d
 */
export function createDefaultShape3d(): Shape3d {
  return {};
}
