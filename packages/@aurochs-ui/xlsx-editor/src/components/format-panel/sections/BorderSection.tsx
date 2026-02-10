/**
 * @file Border section (format panel)
 *
 * UI controls for editing the selection border style and color.
 * Uses ColorPickerPopover for color selection.
 */

import { Accordion, FieldGroup, FieldRow, Select } from "@aurochs-ui/ui-components";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import type { XlsxBorder, XlsxBorderEdge, XlsxBorderStyle } from "@aurochs-office/xlsx/domain/style/border";
import { rgbHexFromXlsxColor, makeXlsxRgbColor } from "../color-utils";
import { BORDER_STYLE_OPTIONS } from "../options";

export type BorderSectionProps = {
  readonly disabled: boolean;
  readonly border: XlsxBorder;
  readonly onBorderChange: (border: XlsxBorder) => void;
};

function borderEdgeStyle(edge: XlsxBorderEdge | undefined): XlsxBorderStyle | "" {
  return edge?.style ?? "";
}

function updateBorderEdge(
  border: XlsxBorder,
  edge: "left" | "right" | "top" | "bottom",
  next: XlsxBorderEdge | undefined,
): XlsxBorder {
  return { ...border, [edge]: next };
}

/** Resolve the current border color from the left edge (first defined edge), as bare RRGGBB. */
function resolveBorderColorHex(border: XlsxBorder): string {
  const edge = border.left ?? border.right ?? border.top ?? border.bottom;
  return rgbHexFromXlsxColor(edge?.color) ?? "000000";
}

/**
 * Format panel section for applying border styles to the selection.
 */
export function BorderSection(props: BorderSectionProps) {
  const border = props.border;

  const updateEdge = (edge: "left" | "right" | "top" | "bottom", value: string) => {
    const nextEdge = value === "" ? undefined : ({ style: value as XlsxBorderStyle } satisfies XlsxBorderEdge);
    props.onBorderChange(updateBorderEdge(border, edge, nextEdge));
  };

  const handleBorderColorChange = (hex: string) => {
    const color = makeXlsxRgbColor(hex.toUpperCase());
    props.onBorderChange({
      ...border,
      left: border.left ? { ...border.left, color } : undefined,
      right: border.right ? { ...border.right, color } : undefined,
      top: border.top ? { ...border.top, color } : undefined,
      bottom: border.bottom ? { ...border.bottom, color } : undefined,
    });
  };

  return (
    <Accordion title="Border">
      <FieldGroup label="Left">
        <Select
          value={borderEdgeStyle(border.left)}
          options={BORDER_STYLE_OPTIONS}
          disabled={props.disabled}
          onChange={(v) => updateEdge("left", v)}
        />
      </FieldGroup>
      <FieldGroup label="Right">
        <Select
          value={borderEdgeStyle(border.right)}
          options={BORDER_STYLE_OPTIONS}
          disabled={props.disabled}
          onChange={(v) => updateEdge("right", v)}
        />
      </FieldGroup>
      <FieldGroup label="Top">
        <Select
          value={borderEdgeStyle(border.top)}
          options={BORDER_STYLE_OPTIONS}
          disabled={props.disabled}
          onChange={(v) => updateEdge("top", v)}
        />
      </FieldGroup>
      <FieldGroup label="Bottom">
        <Select
          value={borderEdgeStyle(border.bottom)}
          options={BORDER_STYLE_OPTIONS}
          disabled={props.disabled}
          onChange={(v) => updateEdge("bottom", v)}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Color">
          <ColorPickerPopover
            value={resolveBorderColorHex(border)}
            onChange={handleBorderColorChange}
            disabled={props.disabled}
          />
        </FieldGroup>
      </FieldRow>
    </Accordion>
  );
}
