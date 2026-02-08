/**
 * @file PPTX diagram editor adapters
 *
 * Injects PPTX-specific editors into the format-agnostic `@aurochs-ui/diagram-editor`.
 */

import type { DiagramEditorAdapters } from "@aurochs-ui/diagram-editor";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { ShapeProperties } from "@aurochs-office/pptx/domain/shape";
import { TextBodyEditor } from "../editors/text/TextBodyEditor";
import { ShapePropertiesEditor, createDefaultShapeProperties } from "../editors/shape/ShapePropertiesEditor";

export const pptxDiagramEditorAdapters: DiagramEditorAdapters<TextBody, ShapeProperties> = {
  textBody: {
    isTextBody: isPptxTextBody,
    renderEditor: ({ value, onChange, disabled }) => (
      <TextBodyEditor value={value} onChange={onChange} disabled={disabled} />
    ),
  },
  shapeProperties: {
    isShapeProperties,
    createDefault: createDefaultShapeProperties,
    renderEditor: ({ value, onChange, disabled }) => (
      <ShapePropertiesEditor
        value={value}
        onChange={onChange}
        disabled={disabled}
        showTransform={false}
        showGeometry={true}
        showFill={true}
        showLine={true}
        showEffects={true}
        showScene3d={false}
        showShape3d={false}
      />
    ),
  },
};

function isShapeProperties(value: unknown): value is ShapeProperties {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isPptxTextBody(value: unknown): value is TextBody {
  if (!isObject(value)) {
    return false;
  }
  if (!("bodyProperties" in value) || !isObject(value.bodyProperties)) {
    return false;
  }
  return "paragraphs" in value && Array.isArray(value.paragraphs);
}
