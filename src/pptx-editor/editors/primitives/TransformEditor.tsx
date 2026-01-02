/**
 * @file TransformEditor - Editor for Transform type
 *
 * Edits position (x, y), size (width, height), rotation, and flip properties.
 */

import { useCallback, type CSSProperties } from "react";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { Toggle } from "../../ui/primitives";
import { PixelsEditor } from "./PixelsEditor";
import { DegreesEditor } from "./DegreesEditor";
import { px, deg, type Transform, type Pixels, type Degrees } from "../../../pptx/domain/types";
import type { EditorProps } from "../../types";

export type TransformEditorProps = EditorProps<Transform> & {
  readonly style?: CSSProperties;
  /** Show flip toggles */
  readonly showFlip?: boolean;
  /** Show rotation input */
  readonly showRotation?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const fieldStyle: CSSProperties = {
  flex: 1,
};






export function TransformEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showFlip = true,
  showRotation = true,
}: TransformEditorProps) {
  const updateField = useCallback(
    <K extends keyof Transform>(field: K, newValue: Transform[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Position */}
      <FieldGroup label="Position">
        <FieldRow>
          <FieldGroup label="X" style={fieldStyle}>
            <PixelsEditor
              value={value.x}
              onChange={(v) => updateField("x", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Y" style={fieldStyle}>
            <PixelsEditor
              value={value.y}
              onChange={(v) => updateField("y", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </FieldGroup>

      {/* Size */}
      <FieldGroup label="Size">
        <FieldRow>
          <FieldGroup label="W" style={fieldStyle}>
            <PixelsEditor
              value={value.width}
              onChange={(v) => updateField("width", v)}
              disabled={disabled}
              min={0}
            />
          </FieldGroup>
          <FieldGroup label="H" style={fieldStyle}>
            <PixelsEditor
              value={value.height}
              onChange={(v) => updateField("height", v)}
              disabled={disabled}
              min={0}
            />
          </FieldGroup>
        </FieldRow>
      </FieldGroup>

      {/* Rotation */}
      {showRotation && (
        <FieldGroup label="Rotation">
          <DegreesEditor
            value={value.rotation}
            onChange={(v) => updateField("rotation", v)}
            disabled={disabled}
          />
        </FieldGroup>
      )}

      {/* Flip */}
      {showFlip && (
        <FieldGroup label="Flip">
          <FieldRow>
            <Toggle
              checked={value.flipH}
              onChange={(v) => updateField("flipH", v)}
              label="Horizontal"
              disabled={disabled}
            />
            <Toggle
              checked={value.flipV}
              onChange={(v) => updateField("flipV", v)}
              label="Vertical"
              disabled={disabled}
            />
          </FieldRow>
        </FieldGroup>
      )}
    </div>
  );
}

/**
 * Create a default transform value
 */
export function createDefaultTransform(): Transform {
  return {
    x: px(0),
    y: px(0),
    width: px(100),
    height: px(100),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
}
