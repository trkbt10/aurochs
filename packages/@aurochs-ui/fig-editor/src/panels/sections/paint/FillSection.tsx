/**
 * @file Fill property section
 *
 * Edits the fill paints of a selected node.
 * Supports: solid color editing, opacity, add/remove fills.
 *
 * Each fill entry shows:
 * - Color swatch with native color picker
 * - Hex color value
 * - Opacity slider
 * - Remove button
 *
 * Uses the property-panel mutation target SoT with immutable updater functions.
 */

import { useCallback, useRef, type ChangeEvent, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigImage } from "@aurochs/fig/parser";
import type { FigImageScaleMode, FigPaint } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";
import { imageScaleModeOptions } from "./paint-options";
import { createFigImageAsset } from "./image-asset";
import { GradientPaintControls } from "./GradientPaintControls";
import { applyPaintOperation, colorToHex, getPaintColor, getPaintOpacity, paintTypeOptions } from "./paint-domain";
import { applyAppearanceOperation } from "./appearance-domain";

// =============================================================================
// Styles
// =============================================================================

const fillRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "4px 0",
};

const paintHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
};

const paintInlineStyle: CSSProperties = {
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

const emptyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

// =============================================================================
// Props
// =============================================================================

type FillSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly images: ReadonlyMap<string, FigImage>;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================






/** Panel section for viewing and editing fill paints of a Figma node. */
export function FillSection({ node, target, images, dispatch }: FillSectionProps) {
  const fills = node.fills;
  const uploadTargetRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageOptions = [{ value: "", label: "No image" }, ...[...images.keys()].map((ref) => ({ value: ref, label: ref }))];

  const updateFill = useCallback(
    (fillIndex: number, updater: (fill: FigPaint) => FigPaint) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => {
          const fill = n.fills[fillIndex];
          if (!fill) {
            return n;
          }
          return applyAppearanceOperation(n, {
            type: "fill-paints",
            operation: { type: "update", index: fillIndex, operation: { type: "replace", paint: updater(fill) } },
          });
        },
      }));
    },
    [dispatch, target],
  );

  const updateFillColor = useCallback(
    (fillIndex: number, hex: string) => {
      updateFill(fillIndex, (fill) => applyPaintOperation(fill, { type: "set-color", hex }));
    },
    [updateFill],
  );

  const updateFillOpacity = useCallback(
    (fillIndex: number, opacity: number) => {
      updateFill(fillIndex, (fill) => applyPaintOperation(fill, { type: "set-opacity", opacity }));
    },
    [updateFill],
  );

  const updateFillType = useCallback(
    (fillIndex: number, type: FigPaint["type"]) => {
      updateFill(fillIndex, (fill) => applyPaintOperation(fill, { type: "set-type", paintType: type, kind: "fill" }));
    },
    [updateFill],
  );

  const updateImageRef = useCallback(
    (fillIndex: number, imageRef: string) => {
      updateFill(fillIndex, (fill) => applyPaintOperation(fill, { type: "set-image-ref", imageRef }));
    },
    [updateFill],
  );

  const updateImageScaleMode = useCallback(
    (fillIndex: number, scaleMode: FigImageScaleMode) => {
      updateFill(fillIndex, (fill) => applyPaintOperation(fill, { type: "set-image-scale-mode", scaleMode }));
    },
    [updateFill],
  );

  const updateImageScale = useCallback(
    (fillIndex: number, scale: number) => {
      updateFill(fillIndex, (fill) => applyPaintOperation(fill, { type: "set-image-scale", scale }));
    },
    [updateFill],
  );

  const updateImageRotation = useCallback(
    (fillIndex: number, rotationDeg: number) => {
      updateFill(fillIndex, (fill) => applyPaintOperation(fill, { type: "set-image-rotation-deg", rotationDeg }));
    },
    [updateFill],
  );

  const startImageUpload = useCallback((fillIndex: number) => {
    uploadTargetRef.current = fillIndex;
    fileInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      const fillIndex = uploadTargetRef.current;
      event.currentTarget.value = "";
      uploadTargetRef.current = null;
      if (!file || fillIndex === null) {
        return;
      }
      void file.arrayBuffer().then((buffer) => {
        const image = createFigImageAsset({
          data: new Uint8Array(buffer),
          mimeType: file.type,
          fileName: file.name,
        });
        dispatch({ type: "ADD_IMAGE_ASSET", image, source: "property-panel" });
        updateImageRef(fillIndex, image.ref);
      });
    },
    [dispatch, updateImageRef],
  );

  const removeFill = useCallback(
    (fillIndex: number) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => applyAppearanceOperation(n, {
          type: "fill-paints",
          operation: { type: "remove", index: fillIndex },
        }),
      }));
    },
    [dispatch, target],
  );

  const addFill = useCallback(() => {
    dispatch(createPropertyTargetUpdateAction({
      target,
      updater: (n) => applyAppearanceOperation(n, {
        type: "fill-paints",
        operation: { type: "add", kind: "fill" },
      }),
    }));
  }, [dispatch, target]);

  return (
    <div style={emptyStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={handleImageFileChange}
        style={{ display: "none" }}
      />
      {fills.map((fill, i) => {
        const color = getPaintColor(fill);
        const opacity = getPaintOpacity(fill);

        return (
          <div key={i} style={fillRowStyle}>
            <div style={paintHeaderStyle}>
              <Select
                value={fill.type}
                onChange={(type) => updateFillType(i, type)}
                options={paintTypeOptions}
                ariaLabel={`Fill paint type ${i + 1}`}
              />
              <Input
                type="number"
                ariaLabel={`Fill opacity ${i + 1}`}
                value={Math.round(opacity * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => updateFillOpacity(i, (v as number) / 100)}
                width={52}
                suffix="%"
              />
              <button
                type="button"
                style={removeButtonStyle}
                onClick={() => removeFill(i)}
                title="Remove fill"
              >
                <CloseIcon size={12} />
              </button>
            </div>
            {color && (
              <div style={paintInlineStyle}>
                <input
                  aria-label={`Fill color ${i + 1}`}
                  type="color"
                  value={colorToHex(color)}
                  onChange={(e) => updateFillColor(i, e.target.value)}
                  style={swatchStyle}
                />
                <span style={hexStyle}>{colorToHex(color).toUpperCase()}</span>
              </div>
            )}
            {fill.type.startsWith("GRADIENT_") && (
              <GradientPaintControls
                labelPrefix="Fill"
                paintIndex={i}
                paint={fill}
                onChange={(nextPaint) => updateFill(i, () => nextPaint)}
              />
            )}
            {fill.type === "IMAGE" && (
              <>
                <div style={paintInlineStyle}>
                  <Select
                    value={fill.imageRef ?? ""}
                    onChange={(value) => updateImageRef(i, value)}
                    options={imageOptions}
                    ariaLabel={`Fill image ${i + 1}`}
                  />
                  <button type="button" style={addButtonStyle} onClick={() => startImageUpload(i)}>
                    Upload image
                  </button>
                </div>
                <div style={paintInlineStyle}>
                  <Select
                    value={fill.scaleMode ?? fill.imageScaleMode ?? "FILL"}
                    onChange={(value) => updateImageScaleMode(i, value)}
                    options={imageScaleModeOptions}
                    ariaLabel={`Fill image scale mode ${i + 1}`}
                  />
                  <Input
                    type="number"
                    ariaLabel={`Fill image scale ${i + 1}`}
                    value={fill.scalingFactor ?? fill.scale ?? 1}
                    min={0}
                    step={0.05}
                    onChange={(v) => updateImageScale(i, v as number)}
                    width={64}
                  />
                  <Input
                    type="number"
                    ariaLabel={`Fill image rotation ${i + 1}`}
                    value={Math.round(((fill.rotation ?? 0) * 180) / Math.PI)}
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

      <button type="button" style={addButtonStyle} onClick={addFill}>
        <AddIcon size={12} />
        Add fill
      </button>
    </div>
  );
}
