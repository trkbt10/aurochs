/**
 * @file ColorTransformEditor - Editor for ColorTransform type
 *
 * Edits color transform properties like alpha, shade, tint, etc.
 */

import { useCallback, type CSSProperties } from "react";
import { FieldGroup } from "../../ui/layout";
import { Toggle } from "../../ui/primitives";
import { PercentEditor, DegreesEditor } from "../primitives";
import { pct, deg, type Percent, type Degrees } from "../../../pptx/domain/types";
import type { ColorTransform } from "../../../pptx/domain/color/types";
import type { EditorProps } from "../../types";

export type ColorTransformEditorProps = EditorProps<ColorTransform | undefined> & {
  readonly style?: CSSProperties;
  /** Show only common transforms (alpha, shade, tint) */
  readonly compact?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

type PercentField = "alpha" | "alphaMod" | "alphaOff" | "sat" | "satMod" | "satOff" | "lum" | "lumMod" | "lumOff" | "shade" | "tint" | "blueMod" | "blueOff" | "green" | "greenMod" | "greenOff" | "redMod" | "redOff";
type DegreesField = "hue" | "hueOff";
type BooleanField = "gamma" | "invGamma" | "comp" | "inv" | "gray";

/**
 * Editor for color transform settings.
 */
export function ColorTransformEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  compact = false,
}: ColorTransformEditorProps) {
  const transform = value ?? {};

  const updatePercentField = useCallback(
    (field: PercentField, newValue: Percent | undefined) => {
      const updated = { ...transform, [field]: newValue };
      // Clean up undefined values
      if (newValue === undefined) {
        delete (updated as Record<string, unknown>)[field];
      }
      onChange(Object.keys(updated).length > 0 ? updated : undefined);
    },
    [transform, onChange]
  );

  const updateDegreesField = useCallback(
    (field: DegreesField, newValue: Degrees | undefined) => {
      const updated = { ...transform, [field]: newValue };
      if (newValue === undefined) {
        delete (updated as Record<string, unknown>)[field];
      }
      onChange(Object.keys(updated).length > 0 ? updated : undefined);
    },
    [transform, onChange]
  );

  const updateBooleanField = useCallback(
    (field: BooleanField, newValue: boolean) => {
      const updated = { ...transform, [field]: newValue || undefined };
      if (!newValue) {
        delete (updated as Record<string, unknown>)[field];
      }
      onChange(Object.keys(updated).length > 0 ? updated : undefined);
    },
    [transform, onChange]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Common transforms */}
      <FieldGroup label="Alpha" hint="Opacity">
        <PercentEditor
          value={transform.alpha ?? pct(100)}
          onChange={(v) => updatePercentField("alpha", v)}
          disabled={disabled}
          slider
        />
      </FieldGroup>

      <FieldGroup label="Shade" hint="Darken">
        <PercentEditor
          value={transform.shade ?? pct(100)}
          onChange={(v) => updatePercentField("shade", v === pct(100) ? undefined : v)}
          disabled={disabled}
          slider
        />
      </FieldGroup>

      <FieldGroup label="Tint" hint="Lighten">
        <PercentEditor
          value={transform.tint ?? pct(100)}
          onChange={(v) => updatePercentField("tint", v === pct(100) ? undefined : v)}
          disabled={disabled}
          slider
        />
      </FieldGroup>

      {!compact && (
        <>
          {/* HSL adjustments */}
          <FieldGroup label="Hue">
            <DegreesEditor
              value={transform.hue ?? deg(0)}
              onChange={(v) => updateDegreesField("hue", v === deg(0) ? undefined : v)}
              disabled={disabled}
            />
          </FieldGroup>

          <FieldGroup label="Saturation">
            <PercentEditor
              value={transform.sat ?? pct(100)}
              onChange={(v) => updatePercentField("sat", v === pct(100) ? undefined : v)}
              disabled={disabled}
              slider
            />
          </FieldGroup>

          <FieldGroup label="Luminance">
            <PercentEditor
              value={transform.lum ?? pct(100)}
              onChange={(v) => updatePercentField("lum", v === pct(100) ? undefined : v)}
              disabled={disabled}
              slider
            />
          </FieldGroup>

          {/* Boolean transforms */}
          <FieldGroup label="Effects">
            <Toggle
              checked={transform.comp ?? false}
              onChange={(v) => updateBooleanField("comp", v)}
              label="Complement"
              disabled={disabled}
            />
            <Toggle
              checked={transform.inv ?? false}
              onChange={(v) => updateBooleanField("inv", v)}
              label="Inverse"
              disabled={disabled}
            />
            <Toggle
              checked={transform.gray ?? false}
              onChange={(v) => updateBooleanField("gray", v)}
              label="Grayscale"
              disabled={disabled}
            />
          </FieldGroup>
        </>
      )}
    </div>
  );
}
