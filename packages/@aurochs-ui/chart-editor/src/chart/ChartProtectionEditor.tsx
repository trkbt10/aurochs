/**
 * @file Chart Protection Editor
 * @see ECMA-376 Part 1, Section 21.2.2.149 (protection)
 */

import { useCallback } from "react";
import { Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import type { ChartProtection } from "@aurochs-office/chart/domain";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type ChartProtectionEditorProps = EditorProps<ChartProtection | undefined>;






/** Editor component for configuring chart protection settings. */
export function ChartProtectionEditor({ value, onChange, disabled }: ChartProtectionEditorProps) {
  const protection = value ?? {};

  const updateField = useCallback(
    <K extends keyof ChartProtection>(field: K, newValue: ChartProtection[K]) => {
      onChange({ ...protection, [field]: newValue });
    },
    [protection, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Chart Object" style={{ flex: 1 }}>
          <Toggle checked={protection.chartObject ?? false} onChange={(v) => updateField("chartObject", v)} disabled={disabled} />
        </FieldGroup>
        <FieldGroup label="Data" style={{ flex: 1 }}>
          <Toggle checked={protection.data ?? false} onChange={(v) => updateField("data", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="Formatting" style={{ flex: 1 }}>
          <Toggle checked={protection.formatting ?? false} onChange={(v) => updateField("formatting", v)} disabled={disabled} />
        </FieldGroup>
        <FieldGroup label="Selection" style={{ flex: 1 }}>
          <Toggle checked={protection.selection ?? false} onChange={(v) => updateField("selection", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="User Interface" style={{ flex: 1 }}>
          <Toggle checked={protection.userInterface ?? false} onChange={(v) => updateField("userInterface", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>
    </>
  );
}






/** Creates a default chart protection object with all restrictions disabled. */
export function createDefaultChartProtection(): ChartProtection {
  return { chartObject: false, data: false, formatting: false, selection: false, userInterface: false };
}
