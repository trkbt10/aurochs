/**
 * @file ColorEditor - Editor for Color type
 *
 * Pure content editor for Color (spec + optional transforms).
 * Does NOT include any container styling (borders, backgrounds).
 * The parent component is responsible for visual boundaries.
 */

import { useCallback, useState, type CSSProperties } from "react";
import { Button } from "../../ui/primitives";
import { FieldGroup } from "../../ui/layout";
import { ColorSpecEditor, createDefaultSrgbColor } from "./ColorSpecEditor";
import { ColorTransformEditor } from "./ColorTransformEditor";
import type { Color, ColorSpec, ColorTransform } from "../../../pptx/domain/color";
import type { EditorProps } from "../../types";

export type ColorEditorProps = EditorProps<Color> & {
  readonly style?: CSSProperties;
  /** Show transform editor (default: true) */
  readonly showTransform?: boolean;
  /** Compact mode for transforms */
  readonly compactTransform?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const toggleButtonStyle: CSSProperties = {
  alignSelf: "flex-start",
};

/**
 * Editor for Color (spec + optional transforms).
 * Renders pure content without any container styling.
 */
export function ColorEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showTransform = true,
  compactTransform = true,
}: ColorEditorProps) {
  const [transformExpanded, setTransformExpanded] = useState(!!value.transform);

  const handleSpecChange = useCallback(
    (spec: ColorSpec) => {
      onChange({ ...value, spec });
    },
    [value, onChange]
  );

  const handleTransformChange = useCallback(
    (transform: ColorTransform | undefined) => {
      onChange({ ...value, transform });
    },
    [value, onChange]
  );

  const toggleTransform = useCallback(() => {
    if (transformExpanded) {
      onChange({ ...value, transform: undefined });
      setTransformExpanded(false);
    } else {
      setTransformExpanded(true);
    }
  }, [transformExpanded, value, onChange]);

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <ColorSpecEditor
        value={value.spec}
        onChange={handleSpecChange}
        disabled={disabled}
      />

      {showTransform && (
        <>
          <Button
            variant="ghost"
            onClick={toggleTransform}
            style={toggleButtonStyle}
            disabled={disabled}
          >
            {transformExpanded ? "− Remove Transforms" : "+ Add Transforms"}
          </Button>

          {transformExpanded && (
            <FieldGroup label="Color Transforms">
              <ColorTransformEditor
                value={value.transform}
                onChange={handleTransformChange}
                disabled={disabled}
                compact={compactTransform}
              />
            </FieldGroup>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Create a default Color value.
 */
export function createDefaultColor(hex: string = "000000"): Color {
  return {
    spec: createDefaultSrgbColor(hex),
  };
}
