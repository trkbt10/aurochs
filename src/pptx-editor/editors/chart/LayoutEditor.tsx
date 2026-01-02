/**
 * @file LayoutEditor - Editor for Layout/ManualLayout type
 *
 * Edits manual layout positioning for chart elements.
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import type { Layout, ManualLayout } from "../../../pptx/domain/chart";
import type { EditorProps, SelectOption } from "../../types";

export type LayoutEditorProps = EditorProps<Layout | undefined> & {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const layoutTargetOptions: SelectOption<
  NonNullable<ManualLayout["layoutTarget"]>
>[] = [
  { value: "inner", label: "Inner" },
  { value: "outer", label: "Outer" },
];

const modeOptions: SelectOption<NonNullable<ManualLayout["xMode"]>>[] = [
  { value: "edge", label: "Edge" },
  { value: "factor", label: "Factor" },
];

export function LayoutEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: LayoutEditorProps) {
  const layout = value ?? {};
  const manualLayout = layout.manualLayout ?? {};

  const updateManualLayout = useCallback(
    <K extends keyof ManualLayout>(field: K, newValue: ManualLayout[K]) => {
      onChange({
        ...layout,
        manualLayout: { ...manualLayout, [field]: newValue },
      });
    },
    [layout, manualLayout, onChange]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldRow>
        <FieldGroup label="Layout Target" style={{ flex: 1 }}>
          <Select
            value={manualLayout.layoutTarget ?? "inner"}
            onChange={(v) =>
              updateManualLayout(
                "layoutTarget",
                v as ManualLayout["layoutTarget"]
              )
            }
            options={layoutTargetOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="X Mode" style={{ flex: 1 }}>
          <Select
            value={manualLayout.xMode ?? "edge"}
            onChange={(v) =>
              updateManualLayout("xMode", v as ManualLayout["xMode"])
            }
            options={modeOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Y Mode" style={{ flex: 1 }}>
          <Select
            value={manualLayout.yMode ?? "edge"}
            onChange={(v) =>
              updateManualLayout("yMode", v as ManualLayout["yMode"])
            }
            options={modeOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="W Mode" style={{ flex: 1 }}>
          <Select
            value={manualLayout.wMode ?? "edge"}
            onChange={(v) =>
              updateManualLayout("wMode", v as ManualLayout["wMode"])
            }
            options={modeOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="H Mode" style={{ flex: 1 }}>
          <Select
            value={manualLayout.hMode ?? "edge"}
            onChange={(v) =>
              updateManualLayout("hMode", v as ManualLayout["hMode"])
            }
            options={modeOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="X" style={{ flex: 1 }}>
          <Input
            type="number"
            value={manualLayout.x ?? 0}
            onChange={(v) => updateManualLayout("x", Number(v))}
            disabled={disabled}
            step={0.01}
          />
        </FieldGroup>
        <FieldGroup label="Y" style={{ flex: 1 }}>
          <Input
            type="number"
            value={manualLayout.y ?? 0}
            onChange={(v) => updateManualLayout("y", Number(v))}
            disabled={disabled}
            step={0.01}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Width" style={{ flex: 1 }}>
          <Input
            type="number"
            value={manualLayout.w ?? 0}
            onChange={(v) => updateManualLayout("w", Number(v))}
            disabled={disabled}
            step={0.01}
          />
        </FieldGroup>
        <FieldGroup label="Height" style={{ flex: 1 }}>
          <Input
            type="number"
            value={manualLayout.h ?? 0}
            onChange={(v) => updateManualLayout("h", Number(v))}
            disabled={disabled}
            step={0.01}
          />
        </FieldGroup>
      </FieldRow>
    </div>
  );
}

/**
 * Create default layout
 */
export function createDefaultLayout(): Layout {
  return {
    manualLayout: {
      layoutTarget: "inner",
      xMode: "edge",
      yMode: "edge",
      wMode: "edge",
      hMode: "edge",
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    },
  };
}
