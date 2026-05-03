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
import type { FigPaint, FigColor, FigPaintType, FigImageScaleMode } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";
import { imageScaleModeOptions } from "./paint-options";
import { createFigImageAsset } from "./image-asset";
import { GradientPaintControls } from "./GradientPaintControls";

// =============================================================================
// Color helpers
// =============================================================================

function colorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToColor(hex: string, alpha = 1): FigColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: alpha,
  };
}

function getPaintColor(paint: FigPaint): FigColor | undefined {
  if ("color" in paint && paint.color) {
    return paint.color;
  }
  return undefined;
}

function getPaintOpacity(paint: FigPaint): number {
  if ("opacity" in paint && typeof paint.opacity === "number") {
    return paint.opacity;
  }
  return 1;
}

/** Default solid white fill for new fills */
function createDefaultSolidFill(): FigPaint {
  return {
    type: "SOLID",
    color: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
    opacity: 1,
    visible: true,
  };
}

const paintTypeOptions: readonly SelectOption<FigPaint["type"]>[] = [
  { value: "SOLID", label: "Solid" },
  { value: "GRADIENT_LINEAR", label: "Linear" },
  { value: "GRADIENT_RADIAL", label: "Radial" },
  { value: "GRADIENT_ANGULAR", label: "Angular" },
  { value: "GRADIENT_DIAMOND", label: "Diamond" },
  { value: "IMAGE", label: "Image" },
];

function createDefaultGradientFill(type: Extract<FigPaintType, `GRADIENT_${string}`>): FigPaint {
  return {
    type,
    visible: true,
    opacity: 1,
    gradientStops: [
      { position: 0, color: { r: 0.2, g: 0.45, b: 1, a: 1 } },
      { position: 1, color: { r: 0.8, g: 0.25, b: 0.9, a: 1 } },
    ],
    gradientHandlePositions: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0, y: 1 },
    ],
  };
}

function createDefaultImageFill(): FigPaint {
  return {
    type: "IMAGE",
    visible: true,
    opacity: 1,
    imageRef: "",
    scaleMode: "FILL",
  };
}

function createDefaultPaint(type: FigPaint["type"]): FigPaint {
  if (type === "SOLID") {
    return createDefaultSolidFill();
  }
  if (type === "IMAGE") {
    return createDefaultImageFill();
  }
  return createDefaultGradientFill(type);
}

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
          const newFills = [...n.fills];
          const fill = newFills[fillIndex];
          if (fill) {
            newFills[fillIndex] = updater(fill);
          }
          return { ...n, fills: newFills };
        },
      }));
    },
    [dispatch, target],
  );

  const updateFillColor = useCallback(
    (fillIndex: number, hex: string) => {
      updateFill(fillIndex, (fill) => {
        const currentColor = getPaintColor(fill);
        const alpha = currentColor?.a ?? 1;
        return { ...fill, color: hexToColor(hex, alpha) } as FigPaint;
      });
    },
    [updateFill],
  );

  const updateFillOpacity = useCallback(
    (fillIndex: number, opacity: number) => {
      updateFill(fillIndex, (fill) => ({ ...fill, opacity } as FigPaint));
    },
    [updateFill],
  );

  const updateFillType = useCallback(
    (fillIndex: number, type: FigPaint["type"]) => {
      updateFill(fillIndex, (fill) => ({ ...createDefaultPaint(type), opacity: getPaintOpacity(fill), visible: fill.visible }));
    },
    [updateFill],
  );

  const updateImageRef = useCallback(
    (fillIndex: number, imageRef: string) => {
      updateFill(fillIndex, (fill) => ({ ...fill, imageRef } as FigPaint));
    },
    [updateFill],
  );

  const updateImageScaleMode = useCallback(
    (fillIndex: number, scaleMode: FigImageScaleMode) => {
      updateFill(fillIndex, (fill) => ({ ...fill, scaleMode, imageScaleMode: scaleMode } as FigPaint));
    },
    [updateFill],
  );

  const updateImageScale = useCallback(
    (fillIndex: number, scale: number) => {
      updateFill(fillIndex, (fill) => ({ ...fill, scalingFactor: scale, scale } as FigPaint));
    },
    [updateFill],
  );

  const updateImageRotation = useCallback(
    (fillIndex: number, rotationDeg: number) => {
      updateFill(fillIndex, (fill) => ({ ...fill, rotation: rotationDeg * (Math.PI / 180) } as FigPaint));
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
        updater: (n) => ({
          ...n,
          fills: n.fills.filter((_, i) => i !== fillIndex),
        }),
      }));
    },
    [dispatch, target],
  );

  const addFill = useCallback(() => {
    dispatch(createPropertyTargetUpdateAction({
      target,
      updater: (n) => ({
        ...n,
        fills: [...n.fills, createDefaultSolidFill()],
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
