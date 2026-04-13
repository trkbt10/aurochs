/**
 * @file View 3D Editor
 * @see ECMA-376 Part 1, Section 21.2.2.228 (view3D)
 */

import { useCallback } from "react";
import { Input, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { PercentEditor, DegreesEditor } from "../primitives";
import { pct, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { View3D } from "@aurochs-office/chart/domain";
import type { EditorProps } from "@aurochs-ui/ui-components/types";

export type View3DEditorProps = EditorProps<View3D | undefined>;






/** Editor component for configuring 3D chart view rotation and perspective settings. */
export function View3DEditor({ value, onChange, disabled }: View3DEditorProps) {
  const view = value ?? {};

  const updateField = useCallback(
    <K extends keyof View3D>(field: K, newValue: View3D[K]) => {
      onChange({ ...view, [field]: newValue });
    },
    [view, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Rotation X" style={{ flex: 1 }}>
          <DegreesEditor value={view.rotX ?? deg(0)} onChange={(v) => updateField("rotX", v)} disabled={disabled} min={-90} max={90} />
        </FieldGroup>
        <FieldGroup label="Rotation Y" style={{ flex: 1 }}>
          <DegreesEditor value={view.rotY ?? deg(0)} onChange={(v) => updateField("rotY", v)} disabled={disabled} min={0} max={360} />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="Height Percent" style={{ flex: 1 }}>
          <PercentEditor value={view.hPercent ?? pct(100)} onChange={(v) => updateField("hPercent", v)} disabled={disabled} min={5} max={500} />
        </FieldGroup>
        <FieldGroup label="Depth Percent" style={{ flex: 1 }}>
          <PercentEditor value={view.depthPercent ?? pct(100)} onChange={(v) => updateField("depthPercent", v)} disabled={disabled} min={20} max={2000} />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="Perspective" style={{ flex: 1 }}>
          <Input type="number" value={view.perspective?.toString() ?? "30"} onChange={(v) => updateField("perspective", v ? Number(v) : undefined)} disabled={disabled} />
        </FieldGroup>
        <FieldGroup label="Right Angle Axes" style={{ flex: 1 }}>
          <Toggle checked={view.rAngAx ?? true} onChange={(v) => updateField("rAngAx", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>
    </>
  );
}






/** Creates a default 3D view configuration with standard rotation angles. */
export function createDefaultView3D(): View3D {
  return { rotX: deg(15), rotY: deg(20), hPercent: pct(100), depthPercent: pct(100), rAngAx: true, perspective: 30 };
}
