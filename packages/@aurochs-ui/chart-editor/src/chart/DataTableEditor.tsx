/**
 * @file Data Table Editor
 * @see ECMA-376 Part 1, Section 21.2.2.54 (dTable)
 */

import { useCallback } from "react";
import { Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { ChartShapePropertiesEditor } from "./ChartShapePropertiesEditor";
import { TextBodyEditor, createDefaultTextBody } from "../text";
import type { DataTable, ChartShapeProperties } from "@aurochs-office/chart/domain";
import type { TextBody } from "@aurochs-office/chart/domain/text";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type DataTableEditorProps = EditorProps<DataTable | undefined>;






/** Editor component for configuring chart data table display options. */
export function DataTableEditor({ value, onChange, disabled }: DataTableEditorProps) {
  const dataTable = value ?? {};

  const updateField = useCallback(
    <K extends keyof DataTable>(field: K, newValue: DataTable[K]) => {
      onChange({ ...dataTable, [field]: newValue });
    },
    [dataTable, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Show Horizontal Border" style={{ flex: 1 }}>
          <Toggle checked={dataTable.showHorzBorder ?? true} onChange={(v) => updateField("showHorzBorder", v)} disabled={disabled} />
        </FieldGroup>
        <FieldGroup label="Show Vertical Border" style={{ flex: 1 }}>
          <Toggle checked={dataTable.showVertBorder ?? true} onChange={(v) => updateField("showVertBorder", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="Show Outline" style={{ flex: 1 }}>
          <Toggle checked={dataTable.showOutline ?? true} onChange={(v) => updateField("showOutline", v)} disabled={disabled} />
        </FieldGroup>
        <FieldGroup label="Show Keys" style={{ flex: 1 }}>
          <Toggle checked={dataTable.showKeys ?? true} onChange={(v) => updateField("showKeys", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>
      <OptionalPropertySection title="Shape Properties" defaultExpanded={false}>
        <ChartShapePropertiesEditor value={dataTable.shapeProperties} onChange={(sp: ChartShapeProperties | undefined) => updateField("shapeProperties", sp)} disabled={disabled} />
      </OptionalPropertySection>
      <OptionalPropertySection title="Text Properties" defaultExpanded={false}>
        <TextBodyEditor value={dataTable.textProperties ?? createDefaultTextBody()} onChange={(tp: TextBody) => updateField("textProperties", tp)} disabled={disabled} />
      </OptionalPropertySection>
    </>
  );
}






/** Creates a default data table configuration with all borders and keys visible. */
export function createDefaultDataTable(): DataTable {
  return { showHorzBorder: true, showVertBorder: true, showOutline: true, showKeys: true };
}
