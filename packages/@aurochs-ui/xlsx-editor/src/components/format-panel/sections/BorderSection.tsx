/**
 * @file Border section (format panel)
 *
 * UI controls for editing the selection border style and color.
 */

import { Accordion, Button, FieldGroup, FieldRow, Input, Select } from "@aurochs-ui/ui-components";
import type { XlsxBorder, XlsxBorderEdge, XlsxBorderStyle } from "@aurochs-office/xlsx/domain/style/border";
import { BORDER_STYLE_OPTIONS } from "../options";

export type BorderSectionProps = {
  readonly disabled: boolean;
  readonly border: XlsxBorder;
  readonly borderColorDraft: string;
  readonly onBorderColorDraftChange: (hex: string) => void;
  readonly onApplyBorderColor: () => void;
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

/**
 * Format panel section for applying border styles to the selection.
 */
export function BorderSection(props: BorderSectionProps) {
  const border = props.border;

  const updateEdge = (edge: "left" | "right" | "top" | "bottom", value: string) => {
    const nextEdge = value === "" ? undefined : ({ style: value as XlsxBorderStyle } satisfies XlsxBorderEdge);
    props.onBorderChange(updateBorderEdge(border, edge, nextEdge));
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
          <Input
            value={props.borderColorDraft}
            placeholder="#RRGGBB"
            disabled={props.disabled}
            onChange={(value) => props.onBorderColorDraftChange(String(value))}
            width={160}
          />
        </FieldGroup>
        <Button size="sm" disabled={props.disabled} onClick={props.onApplyBorderColor}>
          Apply
        </Button>
      </FieldRow>
    </Accordion>
  );
}
