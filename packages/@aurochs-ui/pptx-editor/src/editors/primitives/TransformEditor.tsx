/**
 * @file TransformEditor - Editor for Transform type
 *
 * Edits position (x, y), size (width, height), rotation, and flip properties.
 */

import { useCallback, type CSSProperties } from "react";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Toggle } from "@aurochs-ui/ui-components/primitives";
import { PixelsEditor } from "./PixelsEditor";
import { DegreesEditor } from "./DegreesEditor";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { Transform } from "@aurochs-office/pptx/domain/types";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

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
  gap: "8px",
};

/**
 * Editor for Transform values.
 */
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
    [value, onChange],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Position */}
      <FieldRow>
        <FieldGroup label="X" inline labelWidth={20} style={{ flex: 1 }}>
          <PixelsEditor value={value.x} onChange={(v) => updateField("x", v)} disabled={disabled} />
        </FieldGroup>
        <FieldGroup label="Y" inline labelWidth={20} style={{ flex: 1 }}>
          <PixelsEditor value={value.y} onChange={(v) => updateField("y", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>

      {/* Size */}
      <FieldRow>
        <FieldGroup label="W" inline labelWidth={20} style={{ flex: 1 }}>
          <PixelsEditor value={value.width} onChange={(v) => updateField("width", v)} disabled={disabled} min={0} />
        </FieldGroup>
        <FieldGroup label="H" inline labelWidth={20} style={{ flex: 1 }}>
          <PixelsEditor value={value.height} onChange={(v) => updateField("height", v)} disabled={disabled} min={0} />
        </FieldGroup>
      </FieldRow>

      {/* Rotation */}
      {showRotation && (
        <FieldGroup label="Rotation" inline labelWidth={56}>
          <DegreesEditor value={value.rotation} onChange={(v) => updateField("rotation", v)} disabled={disabled} />
        </FieldGroup>
      )}

      {/* Flip */}
      {showFlip && (
        <FieldRow>
          <Toggle checked={value.flipH} onChange={(v) => updateField("flipH", v)} label="Flip H" disabled={disabled} />
          <Toggle checked={value.flipV} onChange={(v) => updateField("flipV", v)} label="Flip V" disabled={disabled} />
        </FieldRow>
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
