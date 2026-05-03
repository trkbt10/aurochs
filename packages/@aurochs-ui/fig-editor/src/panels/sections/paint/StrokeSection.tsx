/**
 * @file Stroke property section
 *
 * Edits stroke paints and weight of a selected node.
 * Supports: stroke color editing, weight, opacity, add/remove strokes.
 */

import { useCallback, useRef, type ChangeEvent, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigImage } from "@aurochs/fig/parser";
import type { FigImageScaleMode, FigPaint, FigStrokeAlign, FigStrokeCap, FigStrokeJoin } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";
import { imageScaleModeOptions } from "./paint-options";
import { createFigImageAsset } from "./image-asset";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";
import { GradientPaintControls } from "./GradientPaintControls";
import { applyPaintOperation, colorToHex, getPaintColor, getPaintOpacity, paintTypeOptions } from "./paint-domain";
import { applyAppearanceOperation } from "./appearance-domain";

function getStrokeAlignLabel(align: FigDesignNode["strokeAlign"]): string {
  return align ?? "";
}

const strokeAlignOptions: readonly SelectOption<FigStrokeAlign>[] = [
  { value: "CENTER", label: "Center" },
  { value: "INSIDE", label: "Inside" },
  { value: "OUTSIDE", label: "Outside" },
];

const strokeCapOptions: readonly SelectOption<FigStrokeCap>[] = [
  { value: "NONE", label: "None" },
  { value: "ROUND", label: "Round" },
  { value: "SQUARE", label: "Square" },
  { value: "LINE_ARROW", label: "Line arrow" },
  { value: "TRIANGLE_ARROW", label: "Triangle arrow" },
];

const strokeJoinOptions: readonly SelectOption<FigStrokeJoin>[] = [
  { value: "MITER", label: "Miter" },
  { value: "BEVEL", label: "Bevel" },
  { value: "ROUND", label: "Round" },
];

// =============================================================================
// Styles
// =============================================================================

const strokeRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "4px 0",
};

const strokeHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
};

const strokeInlineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
};

const swatchStyle: CSSProperties = {
  width: 24,
  height: 24,
  border: `1px solid ${colorTokens.border.strong}`,
  borderRadius: 4,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

const hexStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontFamily: "monospace",
  color: colorTokens.text.secondary,
  minWidth: 60,
};

const removeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 2,
  color: colorTokens.text.tertiary,
  lineHeight: 0,
  flexShrink: 0,
};

const addButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: `1px dashed ${colorTokens.border.primary}`,
  borderRadius: 4,
  cursor: "pointer",
  padding: "4px 8px",
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.sm,
  width: "100%",
  justifyContent: "center",
};

// =============================================================================
// Props
// =============================================================================

type StrokeSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly images: ReadonlyMap<string, FigImage>;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================






/** Panel section for editing stroke properties of a Figma node. */
export function StrokeSection({ node, target, images, dispatch }: StrokeSectionProps) {
  const strokeWeight = typeof node.strokeWeight === "number" ? node.strokeWeight : 0;
  const strokes = node.strokes;
  const alignLabel = getStrokeAlignLabel(node.strokeAlign);
  const uploadTargetRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageOptions = [{ value: "", label: "No image" }, ...[...images.keys()].map((ref) => ({ value: ref, label: ref }))];

  const updateStrokeWeight = useCallback(
    (weight: number) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, { type: "stroke-weight", weight }),
      }));
    },
    [dispatch, target],
  );

  const updateStrokeAlign = useCallback(
    (strokeAlign: FigStrokeAlign) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, { type: "stroke-align", strokeAlign }),
      }));
    },
    [dispatch, target],
  );

  const updateStrokeCap = useCallback(
    (strokeCap: FigStrokeCap) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, { type: "stroke-cap", strokeCap }),
      }));
    },
    [dispatch, target],
  );

  const updateStrokeJoin = useCallback(
    (strokeJoin: FigStrokeJoin) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, { type: "stroke-join", strokeJoin }),
      }));
    },
    [dispatch, target],
  );

  const updateStrokeDashes = useCallback(
    (value: string) => {
      const dashPattern = value
        .split(/[\s,]+/)
        .filter((part) => part.length > 0)
        .map((part) => Number(part));
      if (dashPattern.some((part) => !Number.isFinite(part) || part < 0)) {
        return;
      }
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, {
          type: "stroke-dashes",
          strokeDashes: dashPattern.length > 0 ? dashPattern : undefined,
        }),
      }));
    },
    [dispatch, target],
  );

  const updateStrokePaint = useCallback(
    (strokeIndex: number, updater: (paint: FigPaint) => FigPaint) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => {
          const paint = n.strokes[strokeIndex];
          if (!paint) {
            return n;
          }
          return applyAppearanceOperation(n, {
            type: "stroke-paints",
            operation: { type: "update", index: strokeIndex, operation: { type: "replace", paint: updater(paint) } },
          });
        },
      }));
    },
    [dispatch, target],
  );

  const updateStrokeColor = useCallback(
    (strokeIndex: number, hex: string) => {
      updateStrokePaint(strokeIndex, (paint) => applyPaintOperation(paint, { type: "set-color", hex }));
    },
    [updateStrokePaint],
  );

  const updateStrokeOpacity = useCallback(
    (strokeIndex: number, opacity: number) => {
      updateStrokePaint(strokeIndex, (paint) => applyPaintOperation(paint, { type: "set-opacity", opacity }));
    },
    [updateStrokePaint],
  );

  const updateStrokeType = useCallback(
    (strokeIndex: number, type: FigPaint["type"]) => {
      updateStrokePaint(strokeIndex, (paint) => applyPaintOperation(paint, { type: "set-type", paintType: type, kind: "stroke" }));
    },
    [updateStrokePaint],
  );

  const updateImageRef = useCallback(
    (strokeIndex: number, imageRef: string) => {
      updateStrokePaint(strokeIndex, (paint) => applyPaintOperation(paint, { type: "set-image-ref", imageRef }));
    },
    [updateStrokePaint],
  );

  const updateImageScaleMode = useCallback(
    (strokeIndex: number, scaleMode: FigImageScaleMode) => {
      updateStrokePaint(strokeIndex, (paint) => applyPaintOperation(paint, { type: "set-image-scale-mode", scaleMode }));
    },
    [updateStrokePaint],
  );

  const updateImageScale = useCallback(
    (strokeIndex: number, scale: number) => {
      updateStrokePaint(strokeIndex, (paint) => applyPaintOperation(paint, { type: "set-image-scale", scale }));
    },
    [updateStrokePaint],
  );

  const updateImageRotation = useCallback(
    (strokeIndex: number, rotationDeg: number) => {
      updateStrokePaint(strokeIndex, (paint) => applyPaintOperation(paint, { type: "set-image-rotation-deg", rotationDeg }));
    },
    [updateStrokePaint],
  );

  const startImageUpload = useCallback((strokeIndex: number) => {
    uploadTargetRef.current = strokeIndex;
    fileInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      const strokeIndex = uploadTargetRef.current;
      event.currentTarget.value = "";
      uploadTargetRef.current = null;
      if (!file || strokeIndex === null) {
        return;
      }
      void file.arrayBuffer().then((buffer) => {
        const image = createFigImageAsset({
          data: new Uint8Array(buffer),
          mimeType: file.type,
          fileName: file.name,
        });
        dispatch({ type: "ADD_IMAGE_ASSET", image, source: "property-panel" });
        updateImageRef(strokeIndex, image.ref);
      });
    },
    [dispatch, updateImageRef],
  );

  const removeStroke = useCallback(
    (strokeIndex: number) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, {
          type: "stroke-paints",
          operation: { type: "remove", index: strokeIndex },
        }),
      }));
    },
    [dispatch, target],
  );

  const addStroke = useCallback(() => {
    dispatch(createPropertyTargetUpdateAction({
      target,
      updater: (n) => applyAppearanceOperation(n, {
        type: "stroke-paints",
        operation: { type: "add", kind: "stroke" },
      }),
    }));
  }, [dispatch, target]);

  const hasContent = strokes.length > 0 || strokeWeight > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={handleImageFileChange}
        style={{ display: "none" }}
      />
      {hasContent && (
        <>
          <FieldRow>
            <FieldGroup label="Weight" inline labelWidth={50}>
              <Input
                type="number"
                ariaLabel="Stroke weight"
                value={strokeWeight}
                min={0}
                step={0.5}
                onChange={(v) => updateStrokeWeight(v as number)}
                width={60}
              />
            </FieldGroup>
            {alignLabel && (
              <span style={{ fontSize: fontTokens.size.xs, color: colorTokens.text.tertiary }}>
                {alignLabel}
              </span>
            )}
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Align" inline labelWidth={42}>
              <Select
                value={node.strokeAlign ?? "CENTER"}
                onChange={updateStrokeAlign}
                options={strokeAlignOptions}
                ariaLabel="Stroke align"
              />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Cap" inline labelWidth={32}>
              <Select
                value={node.strokeCap ?? "NONE"}
                onChange={updateStrokeCap}
                options={strokeCapOptions}
                ariaLabel="Stroke cap"
              />
            </FieldGroup>
            <FieldGroup label="Join" inline labelWidth={36}>
              <Select
                value={node.strokeJoin ?? "MITER"}
                onChange={updateStrokeJoin}
                options={strokeJoinOptions}
                ariaLabel="Stroke join"
              />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Dash" inline labelWidth={38}>
              <Input
                type="text"
                ariaLabel="Stroke dash pattern"
                value={(node.strokeDashes ?? []).join(" ")}
                onChange={(v) => updateStrokeDashes(String(v))}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {strokes.map((stroke, i) => {
        const color = getPaintColor(stroke);
        const opacity = getPaintOpacity(stroke);

        return (
          <div key={i} style={strokeRowStyle}>
            <div style={strokeHeaderStyle}>
              <Select
                value={stroke.type}
                onChange={(type) => updateStrokeType(i, type)}
                options={paintTypeOptions}
                ariaLabel={`Stroke paint type ${i + 1}`}
              />
              <Input
                type="number"
                ariaLabel={`Stroke opacity ${i + 1}`}
                value={Math.round(opacity * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => updateStrokeOpacity(i, (v as number) / 100)}
                width={52}
                suffix="%"
              />
              <button
                type="button"
                style={removeButtonStyle}
                onClick={() => removeStroke(i)}
                title="Remove stroke"
              >
                <CloseIcon size={12} />
              </button>
            </div>
            {color && (
              <div style={strokeInlineStyle}>
                <input
                  aria-label={`Stroke color ${i + 1}`}
                  type="color"
                  value={colorToHex(color)}
                  onChange={(e) => updateStrokeColor(i, e.target.value)}
                  style={swatchStyle}
                />
                <span style={hexStyle}>{colorToHex(color).toUpperCase()}</span>
              </div>
            )}
            {stroke.type.startsWith("GRADIENT_") && (
              <GradientPaintControls
                labelPrefix="Stroke"
                paintIndex={i}
                paint={stroke}
                onChange={(nextPaint) => updateStrokePaint(i, () => nextPaint)}
              />
            )}
            {stroke.type === "IMAGE" && (
              <>
                <div style={strokeInlineStyle}>
                  <Select
                    value={stroke.imageRef ?? ""}
                    onChange={(value) => updateImageRef(i, value)}
                    options={imageOptions}
                    ariaLabel={`Stroke image ${i + 1}`}
                  />
                  <button type="button" style={addButtonStyle} onClick={() => startImageUpload(i)}>
                    Upload image
                  </button>
                </div>
                <div style={strokeInlineStyle}>
                  <Select
                    value={stroke.scaleMode ?? stroke.imageScaleMode ?? "FILL"}
                    onChange={(value) => updateImageScaleMode(i, value)}
                    options={imageScaleModeOptions}
                    ariaLabel={`Stroke image scale mode ${i + 1}`}
                  />
                  <Input
                    type="number"
                    ariaLabel={`Stroke image scale ${i + 1}`}
                    value={stroke.scalingFactor ?? stroke.scale ?? 1}
                    min={0}
                    step={0.05}
                    onChange={(v) => updateImageScale(i, v as number)}
                    width={64}
                  />
                  <Input
                    type="number"
                    ariaLabel={`Stroke image rotation ${i + 1}`}
                    value={Math.round(((stroke.rotation ?? 0) * 180) / Math.PI)}
                    step={1}
                    onChange={(v) => updateImageRotation(i, v as number)}
                    width={64}
                    suffix="°"
                  />
                </div>
              </>
            )}
          </div>
        );
      })}

      <button type="button" style={addButtonStyle} onClick={addStroke}>
        <AddIcon size={12} />
        Add stroke
      </button>
    </div>
  );
}
