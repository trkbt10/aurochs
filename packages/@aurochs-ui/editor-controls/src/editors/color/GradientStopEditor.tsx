/**
 * @file GradientStopEditor - Editor for a single gradient stop
 *
 * Edits both position and color of a GradientStop in one place.
 * Designed to be used inside a Popover for complete stop editing.
 */

import { useCallback, type CSSProperties } from "react";
import { Button } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { PercentEditor } from "../primitives";
import { ColorEditor } from "./ColorEditor";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { GradientStop } from "@aurochs-office/drawing-ml/domain/fill";
import { pct, type Percent } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type GradientStopEditorProps = EditorProps<GradientStop> & {
  readonly style?: CSSProperties;
  /** Callback when the stop should be removed */
  readonly onRemove?: () => void;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: "240px",
};

const removeButtonContainerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: "4px",
  borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

/**
 * Editor for a single gradient stop (position + color).
 * Co-locates all stop properties for a unified editing experience.
 */
export function GradientStopEditor({ value, onChange, disabled, className, style, onRemove }: GradientStopEditorProps) {
  const handlePositionChange = useCallback(
    (position: Percent) => {
      onChange({ ...value, position });
    },
    [value, onChange],
  );

  const handleColorChange = useCallback(
    (color: Color) => {
      onChange({ ...value, color });
    },
    [value, onChange],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldGroup label="Position">
        <PercentEditor
          value={value.position}
          onChange={handlePositionChange}
          disabled={disabled}
          min={0}
          max={100}
          slider
        />
      </FieldGroup>

      <FieldGroup label="Color">
        <ColorEditor value={value.color} onChange={handleColorChange} disabled={disabled} showTransform={false} />
      </FieldGroup>

      {onRemove && (
        <div style={removeButtonContainerStyle}>
          <Button variant="ghost" onClick={onRemove} disabled={disabled}>
            Remove Stop
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Create a default gradient stop.
 */
export function createDefaultGradientStop(position: number = 50, hex: string = "b3b3b3"): GradientStop {
  return {
    position: pct(position),
    color: {
      spec: { type: "srgb", value: hex },
    },
  };
}
