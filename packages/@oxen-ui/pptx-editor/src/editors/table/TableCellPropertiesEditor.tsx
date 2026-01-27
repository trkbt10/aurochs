/**
 * @file TableCellPropertiesEditor - Editor for TableCellProperties type
 *
 * Edits cell properties: margins, anchor, fill, borders, cell3d, headers, spans.
 * @see ECMA-376 Part 1, Section 21.1.3.17 (tcPr)
 */

import { useCallback, useState, type CSSProperties } from "react";
import { Select, Toggle, Input, Button } from "@oxen-ui/ui-components/primitives";
import { Accordion, FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { PixelsEditor } from "../primitives/PixelsEditor";
import { FillEditor, createNoFill } from "../color/FillEditor";
import { LineEditor, createDefaultLine } from "../../ui/line";
import { px, type Pixels } from "@oxen/ooxml/domain/units";
import type {
  TableCellProperties,
  CellMargin,
  CellAnchor,
  CellHorzOverflow,
  CellVerticalType,
  CellBorders,
  Cell3d,
} from "@oxen/pptx/domain/table/types";
import type { BevelPresetType } from "@oxen/pptx/domain";
import type { Line } from "@oxen/pptx/domain/color/types";
import type { PresetMaterialType, LightRigType, LightRigDirection } from "@oxen/pptx/domain/types";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";

export type TableCellPropertiesEditorProps = EditorProps<TableCellProperties> & {
  readonly style?: CSSProperties;
  readonly showMergeOptions?: boolean;
  readonly showSpanOptions?: boolean;
  readonly showCell3d?: boolean;
  readonly showHeaders?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const fieldStyle: CSSProperties = {
  flex: 1,
};

const presetButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const headerListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const headerItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

// =============================================================================
// Options
// =============================================================================

const anchorOptions: SelectOption<CellAnchor>[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

const horzOverflowOptions: SelectOption<CellHorzOverflow>[] = [
  { value: "clip", label: "Clip" },
  { value: "overflow", label: "Overflow" },
];

const verticalTypeOptions: SelectOption<CellVerticalType>[] = [
  { value: "horz", label: "Horizontal" },
  { value: "vert", label: "Vertical" },
  { value: "vert270", label: "Vertical 270°" },
  { value: "wordArtVert", label: "WordArt Vertical" },
  { value: "eaVert", label: "East Asian Vertical" },
  { value: "mongolianVert", label: "Mongolian Vertical" },
];

const presetMaterialOptions: SelectOption<PresetMaterialType>[] = [
  { value: "clear", label: "Clear" },
  { value: "dkEdge", label: "Dark Edge" },
  { value: "flat", label: "Flat" },
  { value: "legacyMatte", label: "Legacy Matte" },
  { value: "legacyMetal", label: "Legacy Metal" },
  { value: "legacyPlastic", label: "Legacy Plastic" },
  { value: "legacyWireframe", label: "Legacy Wireframe" },
  { value: "matte", label: "Matte" },
  { value: "metal", label: "Metal" },
  { value: "plastic", label: "Plastic" },
  { value: "powder", label: "Powder" },
  { value: "softEdge", label: "Soft Edge" },
  { value: "softmetal", label: "Soft Metal" },
  { value: "translucentPowder", label: "Translucent Powder" },
  { value: "warmMatte", label: "Warm Matte" },
];

const lightRigTypeOptions: SelectOption<LightRigType>[] = [
  { value: "balanced", label: "Balanced" },
  { value: "brightRoom", label: "Bright Room" },
  { value: "chilly", label: "Chilly" },
  { value: "contrasting", label: "Contrasting" },
  { value: "flat", label: "Flat" },
  { value: "flood", label: "Flood" },
  { value: "freezing", label: "Freezing" },
  { value: "glow", label: "Glow" },
  { value: "harsh", label: "Harsh" },
  { value: "legacyFlat1", label: "Legacy Flat 1" },
  { value: "legacyFlat2", label: "Legacy Flat 2" },
  { value: "legacyFlat3", label: "Legacy Flat 3" },
  { value: "legacyFlat4", label: "Legacy Flat 4" },
  { value: "legacyHarsh1", label: "Legacy Harsh 1" },
  { value: "legacyHarsh2", label: "Legacy Harsh 2" },
  { value: "legacyHarsh3", label: "Legacy Harsh 3" },
  { value: "legacyHarsh4", label: "Legacy Harsh 4" },
  { value: "legacyNormal1", label: "Legacy Normal 1" },
  { value: "legacyNormal2", label: "Legacy Normal 2" },
  { value: "legacyNormal3", label: "Legacy Normal 3" },
  { value: "legacyNormal4", label: "Legacy Normal 4" },
  { value: "morning", label: "Morning" },
  { value: "soft", label: "Soft" },
  { value: "sunrise", label: "Sunrise" },
  { value: "sunset", label: "Sunset" },
  { value: "threePt", label: "Three Point" },
  { value: "twoPt", label: "Two Point" },
];

const lightRigDirectionOptions: SelectOption<LightRigDirection>[] = [
  { value: "t", label: "Top" },
  { value: "tl", label: "Top Left" },
  { value: "tr", label: "Top Right" },
  { value: "l", label: "Left" },
  { value: "r", label: "Right" },
  { value: "b", label: "Bottom" },
  { value: "bl", label: "Bottom Left" },
  { value: "br", label: "Bottom Right" },
];

const bevelPresetOptions: SelectOption<BevelPresetType>[] = [
  { value: "angle", label: "Angle" },
  { value: "artDeco", label: "Art Deco" },
  { value: "circle", label: "Circle" },
  { value: "convex", label: "Convex" },
  { value: "coolSlant", label: "Cool Slant" },
  { value: "cross", label: "Cross" },
  { value: "divot", label: "Divot" },
  { value: "hardEdge", label: "Hard Edge" },
  { value: "relaxedInset", label: "Relaxed Inset" },
  { value: "riblet", label: "Riblet" },
  { value: "slope", label: "Slope" },
  { value: "softRound", label: "Soft Round" },
];

// =============================================================================
// Types
// =============================================================================

type BevelProps = NonNullable<Cell3d["bevel"]>;
type LightRigProps = NonNullable<Cell3d["lightRig"]>;

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for TableCellProperties type.
 * Pure content - no container styles (Section). Consumer wraps with Section if needed.
 */
export function TableCellPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showMergeOptions = true,
  showSpanOptions = true,
  showCell3d = true,
  showHeaders = true,
}: TableCellPropertiesEditorProps) {
  // Border style state for "apply" buttons
  const [borderStyle, setBorderStyle] = useState<Line>(createDefaultLine());

  const updateField = useCallback(
    <K extends keyof TableCellProperties>(field: K, newValue: TableCellProperties[K]) => {
      if (newValue === undefined) {
        const updated = { ...value };
        delete (updated as Record<string, unknown>)[field];
        onChange(updated);
      } else {
        onChange({ ...value, [field]: newValue });
      }
    },
    [value, onChange]
  );

  // Margins helpers
  const margins = value.margins ?? createDefaultCellMargins();
  const handleMarginChange = useCallback(
    (side: keyof CellMargin, pixels: number) => {
      updateField("margins", { ...margins, [side]: px(pixels) });
    },
    [margins, updateField]
  );

  // Borders helpers
  const applyBorderToEdges = useCallback(() => {
    updateField("borders", {
      ...value.borders,
      left: borderStyle,
      right: borderStyle,
      top: borderStyle,
      bottom: borderStyle,
    });
  }, [value.borders, borderStyle, updateField]);

  const applyBorderToAll = useCallback(() => {
    updateField("borders", {
      left: borderStyle,
      right: borderStyle,
      top: borderStyle,
      bottom: borderStyle,
      insideH: borderStyle,
      insideV: borderStyle,
      tlToBr: borderStyle,
      blToTr: borderStyle,
    });
  }, [borderStyle, updateField]);

  const clearBorders = useCallback(() => {
    updateField("borders", undefined);
  }, [updateField]);

  // Cell3d helpers
  const cell3d = value.cell3d ?? createDefaultCell3d();

  const handleToggle3d = useCallback(
    (enabled: boolean) => {
      updateField("cell3d", enabled ? createDefaultCell3d() : undefined);
    },
    [updateField]
  );

  const update3dField = useCallback(
    <K extends keyof Cell3d>(field: K, newValue: Cell3d[K]) => {
      if (newValue === undefined) {
        const updated = { ...cell3d };
        delete (updated as Record<string, unknown>)[field];
        updateField("cell3d", updated);
      } else {
        updateField("cell3d", { ...cell3d, [field]: newValue });
      }
    },
    [cell3d, updateField]
  );

  // Headers helpers
  const headers = value.headers ?? [];

  const handleAddHeader = useCallback(() => {
    updateField("headers", [...headers, ""]);
  }, [headers, updateField]);

  const handleRemoveHeader = useCallback(
    (index: number) => {
      const newHeaders = headers.filter((_, i) => i !== index);
      updateField("headers", newHeaders.length > 0 ? newHeaders : undefined);
    },
    [headers, updateField]
  );

  const handleHeaderChange = useCallback(
    (index: number, newValue: string | number) => {
      const newHeaders = headers.map((h, i) => (i === index ? String(newValue) : h));
      updateField("headers", newHeaders);
    },
    [headers, updateField]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Vertical Alignment */}
      <FieldGroup label="Vertical Alignment">
        <FieldRow>
          <Select
            value={value.anchor ?? "top"}
            onChange={(v) => updateField("anchor", v as CellAnchor)}
            options={anchorOptions}
            disabled={disabled}
          />
          <Toggle
            checked={value.anchorCenter ?? false}
            onChange={(v) => updateField("anchorCenter", v || undefined)}
            label="Center"
            disabled={disabled}
          />
        </FieldRow>
      </FieldGroup>

      {/* Text Direction */}
      <FieldRow>
        <FieldGroup label="Text Direction" style={fieldStyle}>
          <Select
            value={value.verticalType ?? "horz"}
            onChange={(v) => updateField("verticalType", v as CellVerticalType)}
            options={verticalTypeOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Overflow" style={fieldStyle}>
          <Select
            value={value.horzOverflow ?? "clip"}
            onChange={(v) => updateField("horzOverflow", v as CellHorzOverflow)}
            options={horzOverflowOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      {/* Margins */}
      <Accordion title="Margins" defaultExpanded={!!value.margins}>
        <FieldRow>
          <FieldGroup label="Left" style={fieldStyle}>
            <PixelsEditor
              value={margins.left}
              onChange={(v) => handleMarginChange("left", v)}
              disabled={disabled}
              min={0}
            />
          </FieldGroup>
          <FieldGroup label="Right" style={fieldStyle}>
            <PixelsEditor
              value={margins.right}
              onChange={(v) => handleMarginChange("right", v)}
              disabled={disabled}
              min={0}
            />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup label="Top" style={fieldStyle}>
            <PixelsEditor
              value={margins.top}
              onChange={(v) => handleMarginChange("top", v)}
              disabled={disabled}
              min={0}
            />
          </FieldGroup>
          <FieldGroup label="Bottom" style={fieldStyle}>
            <PixelsEditor
              value={margins.bottom}
              onChange={(v) => handleMarginChange("bottom", v)}
              disabled={disabled}
              min={0}
            />
          </FieldGroup>
        </FieldRow>
      </Accordion>

      {/* Fill */}
      <Accordion title="Fill" defaultExpanded={!!value.fill}>
        <FillEditor
          value={value.fill ?? createNoFill()}
          onChange={(fill) => updateField("fill", fill.type === "noFill" ? undefined : fill)}
          disabled={disabled}
          allowedTypes={["noFill", "solidFill", "gradientFill", "patternFill"]}
        />
      </Accordion>

      {/* Borders */}
      <Accordion title="Borders" defaultExpanded={!!value.borders}>
        <FieldGroup label="Border Style">
          <LineEditor
            value={borderStyle}
            onChange={setBorderStyle}
            disabled={disabled}
            showEnds={false}
          />
        </FieldGroup>
        <div style={presetButtonsStyle}>
          <Button variant="secondary" onClick={applyBorderToEdges} disabled={disabled}>
            外枠に適用
          </Button>
          <Button variant="secondary" onClick={applyBorderToAll} disabled={disabled}>
            全てに適用
          </Button>
          <Button variant="ghost" onClick={clearBorders} disabled={disabled}>
            クリア
          </Button>
        </div>
      </Accordion>

      {/* 3D Effects */}
      {showCell3d && (
        <Accordion title="3D Effects" defaultExpanded={!!value.cell3d}>
          <Toggle
            checked={!!value.cell3d}
            onChange={handleToggle3d}
            label={value.cell3d ? "Enabled" : "Disabled"}
            disabled={disabled}
          />
          {value.cell3d && (
            <>
              <FieldGroup label="Material">
                <Select
                  value={cell3d.preset ?? "plastic"}
                  onChange={(v) => update3dField("preset", v as PresetMaterialType)}
                  options={presetMaterialOptions}
                  disabled={disabled}
                />
              </FieldGroup>

              <Accordion title="Bevel" defaultExpanded={!!cell3d.bevel}>
                <Toggle
                  checked={!!cell3d.bevel}
                  onChange={(enabled) => {
                    update3dField("bevel", enabled ? createDefaultBevel() : undefined);
                  }}
                  label={cell3d.bevel ? "Enabled" : "Disabled"}
                  disabled={disabled}
                />
                {cell3d.bevel && (
                  <>
                    <FieldGroup label="Preset">
                      <Select
                        value={cell3d.bevel.preset}
                        onChange={(v) =>
                          update3dField("bevel", {
                            ...cell3d.bevel!,
                            preset: v as BevelPresetType,
                          })
                        }
                        options={bevelPresetOptions}
                        disabled={disabled}
                      />
                    </FieldGroup>
                    <FieldRow>
                      <FieldGroup label="Width" style={fieldStyle}>
                        <PixelsEditor
                          value={cell3d.bevel.width}
                          onChange={(w) =>
                            update3dField("bevel", {
                              ...cell3d.bevel!,
                              width: w as Pixels,
                            })
                          }
                          disabled={disabled}
                          min={0}
                        />
                      </FieldGroup>
                      <FieldGroup label="Height" style={fieldStyle}>
                        <PixelsEditor
                          value={cell3d.bevel.height}
                          onChange={(h) =>
                            update3dField("bevel", {
                              ...cell3d.bevel!,
                              height: h as Pixels,
                            })
                          }
                          disabled={disabled}
                          min={0}
                        />
                      </FieldGroup>
                    </FieldRow>
                  </>
                )}
              </Accordion>

              <Accordion title="Light Rig" defaultExpanded={!!cell3d.lightRig}>
                <Toggle
                  checked={!!cell3d.lightRig}
                  onChange={(enabled) => {
                    update3dField("lightRig", enabled ? createDefaultLightRig() : undefined);
                  }}
                  label={cell3d.lightRig ? "Enabled" : "Disabled"}
                  disabled={disabled}
                />
                {cell3d.lightRig && (
                  <>
                    <FieldGroup label="Rig Type">
                      <Select
                        value={cell3d.lightRig.rig}
                        onChange={(v) =>
                          update3dField("lightRig", {
                            ...cell3d.lightRig!,
                            rig: v as LightRigType,
                          })
                        }
                        options={lightRigTypeOptions}
                        disabled={disabled}
                      />
                    </FieldGroup>
                    <FieldGroup label="Direction">
                      <Select
                        value={cell3d.lightRig.direction}
                        onChange={(v) =>
                          update3dField("lightRig", {
                            ...cell3d.lightRig!,
                            direction: v as LightRigDirection,
                          })
                        }
                        options={lightRigDirectionOptions}
                        disabled={disabled}
                      />
                    </FieldGroup>
                  </>
                )}
              </Accordion>
            </>
          )}
        </Accordion>
      )}

      {/* Headers (Accessibility) */}
      {showHeaders && (
        <Accordion title="Headers (Accessibility)" defaultExpanded={!!value.headers}>
          <div style={headerListStyle}>
            {headers.map((header, index) => (
              <div key={index} style={headerItemStyle}>
                <Input
                  value={header}
                  onChange={(v) => handleHeaderChange(index, v)}
                  disabled={disabled}
                  placeholder={`Header ${index + 1}`}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="ghost"
                  onClick={() => handleRemoveHeader(index)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={handleAddHeader} disabled={disabled}>
              Add Header
            </Button>
          </div>
        </Accordion>
      )}

      {/* Span Options */}
      {showSpanOptions && (
        <Accordion title="Cell Span" defaultExpanded={!!(value.rowSpan || value.colSpan)}>
          <FieldRow>
            <FieldGroup label="Row Span" style={fieldStyle}>
              <Input
                type="number"
                value={String(value.rowSpan ?? 1)}
                onChange={(v) => {
                  const num = typeof v === "number" ? v : parseInt(String(v), 10);
                  updateField("rowSpan", isNaN(num) || num < 1 ? undefined : num);
                }}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Column Span" style={fieldStyle}>
              <Input
                type="number"
                value={String(value.colSpan ?? 1)}
                onChange={(v) => {
                  const num = typeof v === "number" ? v : parseInt(String(v), 10);
                  updateField("colSpan", isNaN(num) || num < 1 ? undefined : num);
                }}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </Accordion>
      )}

      {/* Merge Options */}
      {showMergeOptions && (
        <Accordion
          title="Merge Status"
          defaultExpanded={!!(value.horizontalMerge || value.verticalMerge)}
        >
          <Toggle
            checked={value.horizontalMerge ?? false}
            onChange={(v) => updateField("horizontalMerge", v || undefined)}
            label="Horizontal Merge (continuation)"
            disabled={disabled}
          />
          <Toggle
            checked={value.verticalMerge ?? false}
            onChange={(v) => updateField("verticalMerge", v || undefined)}
            label="Vertical Merge (continuation)"
            disabled={disabled}
          />
        </Accordion>
      )}
    </div>
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/** Creates default cell margins (3px each side) */
export function createDefaultCellMargins(): CellMargin {
  return {
    left: px(3),
    right: px(3),
    top: px(3),
    bottom: px(3),
  };
}

/** Creates default table cell properties */
export function createDefaultTableCellProperties(): TableCellProperties {
  return {
    anchor: "top",
    margins: createDefaultCellMargins(),
  };
}

/** Creates empty cell borders */
export function createDefaultCellBorders(): CellBorders {
  return {};
}

/** Creates cell borders with default line on all edges */
export function createAllEdgeBorders(): CellBorders {
  const line = createDefaultLine();
  return {
    left: line,
    right: line,
    top: line,
    bottom: line,
  };
}

/** Creates default bevel properties */
export function createDefaultBevel(): BevelProps {
  return {
    width: px(6),
    height: px(6),
    preset: "circle",
  };
}

/** Creates default light rig properties */
export function createDefaultLightRig(): LightRigProps {
  return {
    rig: "threePt",
    direction: "t",
  };
}

/** Creates default 3D cell properties */
export function createDefaultCell3d(): Cell3d {
  return {
    preset: "plastic",
  };
}
