/**
 * @file PointEditor - Editor for Point type
 *
 * Returns FieldRow with X, Y fields.
 * @see ECMA-376 Part 1, Section 20.1.7.6 (pt)
 */

import { FieldGroup, FieldRow } from "../../ui/layout";
import { PixelsEditor } from "../primitives/PixelsEditor";
import { px, type Point } from "../../../pptx/domain/types";
import type { EditorProps } from "../../types";

export type PointEditorProps = EditorProps<Point>;

const fieldStyle = { flex: 1 };

/**
 * Returns FieldRow with X, Y FieldGroups.
 */
export function PointEditor({
  value,
  onChange,
  disabled,
}: PointEditorProps) {
  return (
    <FieldRow>
      <FieldGroup label="X" style={fieldStyle}>
        <PixelsEditor
          value={value.x}
          onChange={(x) => onChange({ ...value, x })}
          disabled={disabled}
        />
      </FieldGroup>
      <FieldGroup label="Y" style={fieldStyle}>
        <PixelsEditor
          value={value.y}
          onChange={(y) => onChange({ ...value, y })}
          disabled={disabled}
        />
      </FieldGroup>
    </FieldRow>
  );
}

/**
 * Create default Point
 */
export function createDefaultPoint(): Point {
  return {
    x: px(0),
    y: px(0),
  };
}
