/**
 * @file PPTX chart editor adapters
 *
 * Injects PPTX-specific editors into the format-agnostic `@oxen-ui/chart-editor`.
 */

import type { ChartEditorAdapters } from "@oxen-ui/chart-editor";
import type { BaseFill } from "@oxen-office/ooxml/domain/fill";
import type { BaseLine } from "@oxen-office/ooxml/domain/line";
import type { Fill, Line } from "@oxen-office/pptx/domain/color/types";
import { FieldGroup } from "@oxen-ui/ui-components/layout";
import { FillEditor, createNoFill } from "../color";
import { TextBodyEditor } from "../text";
import { LineEditor, createDefaultLine } from "../../ui/line";

const baseFillTypes = ["noFill", "solidFill", "gradientFill", "patternFill", "groupFill"] as const;

function isBaseFill(fill: Fill): fill is BaseFill {
  return fill.type !== "blipFill";
}

function toBaseLine(line: Line): BaseLine {
  if (!isBaseFill(line.fill)) {
    throw new Error("Chart shapeProperties.line.fill must not be blipFill");
  }
  return { ...line, fill: line.fill };
}

export const pptxChartEditorAdapters: ChartEditorAdapters = {
  textBody: {
    renderEditor: ({ value, onChange, disabled, className, style }) => (
      <TextBodyEditor
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
        style={style}
      />
    ),
  },
  shapeProperties: {
    renderEditor: ({ value, onChange, disabled, className, style }) => {
      const props = value ?? {};
      const fill = props.fill ?? createNoFill();
      const line = props.line ?? toBaseLine(createDefaultLine());

      return (
        <div className={className} style={style}>
          <FieldGroup label="Fill">
            <FillEditor
              value={fill}
              onChange={(nextFill) => {
                if (!isBaseFill(nextFill)) {
                  throw new Error("Chart shapeProperties.fill must not be blipFill");
                }
                onChange({ ...props, fill: nextFill });
              }}
              disabled={disabled}
              allowedTypes={baseFillTypes}
            />
          </FieldGroup>

          <FieldGroup label="Line">
            <LineEditor
              value={line}
              onChange={(nextLine) => {
                onChange({ ...props, line: toBaseLine(nextLine) });
              }}
              disabled={disabled}
              showEnds={true}
              showPreview={false}
            />
          </FieldGroup>
        </div>
      );
    },
  },
};
