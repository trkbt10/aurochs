/**
 * @file FillEditor - Editor for Fill union type
 *
 * Supports NoFill, SolidFill, GradientFill, BlipFill, PatternFill, GroupFill.
 */

import { useCallback, type CSSProperties } from "react";
import { Select, Toggle } from "../../ui/primitives";
import { Accordion, FieldGroup, FieldRow } from "../../ui/layout";
import { ColorEditor, createDefaultColor } from "./ColorEditor";
import { GradientStopsEditor, createDefaultGradientStops } from "./GradientStopsEditor";
import { DegreesEditor } from "../primitives/DegreesEditor";
import { PercentEditor } from "../primitives/PercentEditor";
import { PixelsEditor } from "../primitives/PixelsEditor";
import {
  PATTERN_PRESETS,
  type Fill,
  type NoFill,
  type SolidFill,
  type GradientFill,
  type BlipFill,
  type PatternFill,
  type PatternType,
  type LinearGradient,
  type PathGradient,
} from "../../../pptx/domain/color";
import { deg } from "../../../pptx/domain/types";
import type { EditorProps, SelectOption } from "../../types";

export type FillEditorProps = EditorProps<Fill> & {
  readonly style?: CSSProperties;
  /** Limit fill types shown */
  readonly allowedTypes?: readonly Fill["type"][];
};

type FillType = Fill["type"];

const allFillTypeOptions: SelectOption<FillType>[] = [
  { value: "noFill", label: "No Fill" },
  { value: "solidFill", label: "Solid" },
  { value: "gradientFill", label: "Gradient" },
  { value: "blipFill", label: "Image" },
  { value: "patternFill", label: "Pattern" },
  { value: "groupFill", label: "Group" },
];

const PATTERN_LABELS: Record<PatternType, string> = {
  pct5: "5%", pct10: "10%", pct20: "20%", pct25: "25%", pct30: "30%",
  pct40: "40%", pct50: "50%", pct60: "60%", pct70: "70%", pct75: "75%",
  pct80: "80%", pct90: "90%",
  horz: "Horizontal", vert: "Vertical",
  ltHorz: "Light Horizontal", ltVert: "Light Vertical",
  dkHorz: "Dark Horizontal", dkVert: "Dark Vertical",
  narHorz: "Narrow Horizontal", narVert: "Narrow Vertical",
  dashHorz: "Dashed Horizontal", dashVert: "Dashed Vertical",
  cross: "Cross",
  dnDiag: "Down Diagonal", upDiag: "Up Diagonal",
  ltDnDiag: "Light Down Diagonal", ltUpDiag: "Light Up Diagonal",
  dkDnDiag: "Dark Down Diagonal", dkUpDiag: "Dark Up Diagonal",
  wdDnDiag: "Wide Down Diagonal", wdUpDiag: "Wide Up Diagonal",
  dashDnDiag: "Dashed Down Diagonal", dashUpDiag: "Dashed Up Diagonal",
  diagCross: "Diagonal Cross",
  smCheck: "Small Checker", lgCheck: "Large Checker",
  smGrid: "Small Grid", lgGrid: "Large Grid", dotGrid: "Dotted Grid",
  smConfetti: "Small Confetti", lgConfetti: "Large Confetti",
  horzBrick: "Horizontal Brick", diagBrick: "Diagonal Brick",
  solidDmnd: "Solid Diamond", openDmnd: "Open Diamond", dotDmnd: "Dotted Diamond",
  plaid: "Plaid", sphere: "Sphere", weave: "Weave", divot: "Divot",
  shingle: "Shingle", wave: "Wave", trellis: "Trellis", zigZag: "Zig Zag",
};

const patternPresetOptions: SelectOption<PatternType>[] = PATTERN_PRESETS.map((preset) => ({
  value: preset,
  label: PATTERN_LABELS[preset],
}));

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

function createDefaultFill(type: FillType): Fill {
  switch (type) {
    case "noFill":
      return { type: "noFill" };
    case "solidFill":
      return { type: "solidFill", color: createDefaultColor("000000") };
    case "gradientFill":
      return {
        type: "gradientFill",
        stops: createDefaultGradientStops(),
        linear: { angle: deg(0), scaled: true },
        rotWithShape: true,
      };
    case "blipFill":
      return {
        type: "blipFill",
        resourceId: "",
        rotWithShape: true,
      };
    case "patternFill":
      return {
        type: "patternFill",
        preset: "pct5",
        foregroundColor: createDefaultColor("000000"),
        backgroundColor: createDefaultColor("FFFFFF"),
      };
    case "groupFill":
      return { type: "groupFill" };
  }
}






function getFilteredFillOptions(allowedTypes?: readonly Fill["type"][]): SelectOption<FillType>[] {
  if (!allowedTypes) {
    return allFillTypeOptions;
  }
  return allFillTypeOptions.filter((opt) => allowedTypes.includes(opt.value));
}

/**
 * Editor for Fill union type (noFill, solidFill, gradientFill, blipFill, patternFill, groupFill).
 */
export function FillEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  allowedTypes,
}: FillEditorProps) {
  const fillTypeOptions = getFilteredFillOptions(allowedTypes);

  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createDefaultFill(newType as FillType));
    },
    [onChange]
  );

  const renderTypeSpecificEditor = () => {
    switch (value.type) {
      case "noFill":
        return null;

      case "solidFill": {
        const solidFill = value as SolidFill;
        return (
          <FieldGroup label="Color">
            <ColorEditor
              value={solidFill.color}
              onChange={(color) => onChange({ ...solidFill, color })}
              disabled={disabled}
            />
          </FieldGroup>
        );
      }

      case "gradientFill": {
        const gradientFill = value as GradientFill;
        return (
          <>
            <FieldGroup label="Color Stops">
              <GradientStopsEditor
                value={gradientFill.stops}
                onChange={(stops) => onChange({ ...gradientFill, stops })}
                disabled={disabled}
              />
            </FieldGroup>

            <FieldGroup label="Gradient Type">
                <Select
                  value={gradientFill.linear ? "linear" : gradientFill.path ? "path" : "linear"}
                  onChange={(type) => {
                    if (type === "linear") {
                      const updated = { ...gradientFill, linear: { angle: deg(0), scaled: true } };
                      delete (updated as Record<string, unknown>).path;
                      onChange(updated as GradientFill);
                    } else {
                      const updated = { ...gradientFill, path: { path: "circle" as const } };
                      delete (updated as Record<string, unknown>).linear;
                      onChange(updated as GradientFill);
                    }
                  }}
                  options={[
                    { value: "linear", label: "Linear" },
                    { value: "path", label: "Radial/Path" },
                  ]}
                  disabled={disabled}
                />
            </FieldGroup>

            {gradientFill.linear && (
              <Accordion title="Linear Options" defaultExpanded>
                  <FieldGroup label="Angle">
                    <DegreesEditor
                      value={gradientFill.linear.angle}
                      onChange={(angle) =>
                        onChange({
                          ...gradientFill,
                          linear: { ...gradientFill.linear, angle } as LinearGradient,
                        })
                      }
                      disabled={disabled}
                    />
                  </FieldGroup>
                  <div style={{ marginTop: "8px" }}>
                    <Toggle
                      checked={gradientFill.linear.scaled}
                      onChange={(scaled) =>
                        onChange({
                          ...gradientFill,
                          linear: { ...gradientFill.linear, scaled } as LinearGradient,
                        })
                      }
                      label="Scaled"
                      disabled={disabled}
                    />
                  </div>
              </Accordion>
            )}

            {gradientFill.path && (
              <Accordion title="Path Options" defaultExpanded>
                  <FieldGroup label="Path Type">
                    <Select
                      value={gradientFill.path.path}
                      onChange={(path) =>
                        onChange({
                          ...gradientFill,
                          path: { ...gradientFill.path, path } as PathGradient,
                        })
                      }
                      options={[
                        { value: "circle", label: "Circle" },
                        { value: "rect", label: "Rectangle" },
                        { value: "shape", label: "Shape" },
                      ]}
                      disabled={disabled}
                    />
                  </FieldGroup>
                  {gradientFill.path.fillToRect && (
                    <div style={{ marginTop: "8px" }}>
                      <FieldGroup label="Fill To Rect">
                        <FieldRow gap={8}>
                          <PercentEditor
                            value={gradientFill.path.fillToRect.left}
                            onChange={(left) =>
                              onChange({
                                ...gradientFill,
                                path: {
                                  ...gradientFill.path,
                                  fillToRect: { ...gradientFill.path!.fillToRect!, left },
                                } as PathGradient,
                              })
                            }
                            disabled={disabled}
                          />
                          <PercentEditor
                            value={gradientFill.path.fillToRect.top}
                            onChange={(top) =>
                              onChange({
                                ...gradientFill,
                                path: {
                                  ...gradientFill.path,
                                  fillToRect: { ...gradientFill.path!.fillToRect!, top },
                                } as PathGradient,
                              })
                            }
                            disabled={disabled}
                          />
                        </FieldRow>
                      </FieldGroup>
                    </div>
                  )}
              </Accordion>
            )}

            <Toggle
              checked={gradientFill.rotWithShape}
              onChange={(rotWithShape) => onChange({ ...gradientFill, rotWithShape })}
              label="Rotate with shape"
              disabled={disabled}
            />
          </>
        );
      }

      case "blipFill": {
        const blipFill = value as BlipFill;
        const fillMode = blipFill.tile ? "tile" : "stretch";

        return (
          <>
            <FieldGroup label="Image" hint="Resource ID">
              <div
                style={{
                  color: blipFill.resourceId ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontSize: "12px",
                  padding: "8px",
                  backgroundColor: "var(--bg-secondary, #1a1a1a)",
                  borderRadius: "4px",
                  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
                  wordBreak: "break-all",
                }}
              >
                {blipFill.resourceId || "(no image selected)"}
              </div>
            </FieldGroup>

            <div style={{ marginTop: "12px" }}>
              <FieldGroup label="Fill Mode">
                <Select
                  value={fillMode}
                  onChange={(mode) => {
                    if (mode === "stretch") {
                      const updated = { ...blipFill, stretch: {} };
                      delete (updated as Record<string, unknown>).tile;
                      onChange(updated as BlipFill);
                    } else {
                      const updated = {
                        ...blipFill,
                        tile: {
                          tx: 0,
                          ty: 0,
                          sx: 100,
                          sy: 100,
                          flip: "none" as const,
                          alignment: "tl" as const,
                        },
                      };
                      delete (updated as Record<string, unknown>).stretch;
                      onChange(updated as BlipFill);
                    }
                  }}
                  options={[
                    { value: "stretch", label: "Stretch" },
                    { value: "tile", label: "Tile" },
                  ]}
                  disabled={disabled}
                />
              </FieldGroup>
            </div>

            {blipFill.tile && (
              <div style={{ marginTop: "12px" }}>
                <Accordion title="Tile Options" defaultExpanded>
                  <FieldGroup label="Offset">
                    <FieldRow gap={8}>
                      <div style={{ flex: 1 }}>
                        <FieldGroup label="X">
                          <PixelsEditor
                            value={blipFill.tile.tx}
                            onChange={(tx) =>
                              onChange({
                                ...blipFill,
                                tile: { ...blipFill.tile!, tx },
                              })
                            }
                            disabled={disabled}
                          />
                        </FieldGroup>
                      </div>
                      <div style={{ flex: 1 }}>
                        <FieldGroup label="Y">
                          <PixelsEditor
                            value={blipFill.tile.ty}
                            onChange={(ty) =>
                              onChange({
                                ...blipFill,
                                tile: { ...blipFill.tile!, ty },
                              })
                            }
                            disabled={disabled}
                          />
                        </FieldGroup>
                      </div>
                    </FieldRow>
                  </FieldGroup>
                  <div style={{ marginTop: "8px" }}>
                    <FieldGroup label="Scale">
                      <FieldRow gap={8}>
                        <div style={{ flex: 1 }}>
                          <FieldGroup label="X">
                            <PercentEditor
                              value={blipFill.tile.sx}
                              onChange={(sx) =>
                                onChange({
                                  ...blipFill,
                                  tile: { ...blipFill.tile!, sx },
                                })
                              }
                              disabled={disabled}
                            />
                          </FieldGroup>
                        </div>
                        <div style={{ flex: 1 }}>
                          <FieldGroup label="Y">
                            <PercentEditor
                              value={blipFill.tile.sy}
                              onChange={(sy) =>
                                onChange({
                                  ...blipFill,
                                  tile: { ...blipFill.tile!, sy },
                                })
                              }
                              disabled={disabled}
                            />
                          </FieldGroup>
                        </div>
                      </FieldRow>
                    </FieldGroup>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <FieldGroup label="Flip">
                      <Select
                        value={blipFill.tile.flip}
                        onChange={(flip) =>
                          onChange({
                            ...blipFill,
                            tile: { ...blipFill.tile!, flip },
                          })
                        }
                        options={[
                          { value: "none", label: "None" },
                          { value: "x", label: "Horizontal" },
                          { value: "y", label: "Vertical" },
                          { value: "xy", label: "Both" },
                        ]}
                        disabled={disabled}
                      />
                    </FieldGroup>
                  </div>
                </Accordion>
              </div>
            )}

            <Toggle
              checked={blipFill.rotWithShape}
              onChange={(rotWithShape) => onChange({ ...blipFill, rotWithShape })}
              label="Rotate with shape"
              disabled={disabled}
            />
          </>
        );
      }

      case "patternFill": {
        const patternFill = value as PatternFill;
        return (
          <>
            <FieldGroup label="Pattern">
              <Select
                value={patternFill.preset}
                onChange={(preset) => onChange({ ...patternFill, preset })}
                options={patternPresetOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Foreground">
              <ColorEditor
                value={patternFill.foregroundColor}
                onChange={(color) => onChange({ ...patternFill, foregroundColor: color })}
                disabled={disabled}
                showTransform={false}
              />
            </FieldGroup>
            <FieldGroup label="Background">
              <ColorEditor
                value={patternFill.backgroundColor}
                onChange={(color) => onChange({ ...patternFill, backgroundColor: color })}
                disabled={disabled}
                showTransform={false}
              />
            </FieldGroup>
          </>
        );
      }

      case "groupFill":
        return (
          <div style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>
            Inherits fill from group
          </div>
        );
    }
  };

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldGroup label="Fill Type">
        <Select
          value={value.type}
          onChange={handleTypeChange}
          options={fillTypeOptions}
          disabled={disabled}
        />
      </FieldGroup>
      {renderTypeSpecificEditor()}
    </div>
  );
}

/**
 * Create a default solid fill
 */
export function createDefaultSolidFill(hex: string = "000000"): SolidFill {
  return {
    type: "solidFill",
    color: createDefaultColor(hex),
  };
}

/**
 * Create a no fill
 */
export function createNoFill(): NoFill {
  return { type: "noFill" };
}
