/**
 * @file LayoutShapePanel - Property editor for selected layout shapes
 *
 * Lightweight shape property editor for the potx-editor Layout tab.
 * Displays shape identity, transform, and solid fill color editing.
 */

import { useCallback, type CSSProperties } from "react";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import { getShapeTransform } from "@aurochs-renderer/pptx/svg";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type LayoutShapePanelProps = {
  readonly shape: Shape;
  readonly onShapeChange: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
};

// =============================================================================
// Styles
// =============================================================================

const emptyStyle: CSSProperties = {
  padding: spacingTokens.lg,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.sm,
};

const infoValueStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.secondary,
};

const swatchStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: radiusTokens.sm,
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  cursor: "pointer",
};

const LABEL_WIDTH = 60;

// =============================================================================
// Helpers
// =============================================================================

function hasNonVisual(shape: Shape): shape is Exclude<Shape, { type: "contentPart" }> {
  return "nonVisual" in shape;
}

function getShapeId(shape: Shape): ShapeId | undefined {
  if (hasNonVisual(shape)) {return shape.nonVisual.id;}
  return undefined;
}

function getShapeName(shape: Shape): string {
  if (hasNonVisual(shape)) {return shape.nonVisual.name ?? `(${shape.type})`;}
  return `(${shape.type})`;
}

function getSolidFillHex(shape: Shape): string | undefined {
  if (shape.type !== "sp") {return undefined;}
  const fill = shape.properties.fill;
  if (!fill || fill.type !== "solidFill") {return undefined;}
  if (fill.color.spec.type === "srgb") {return fill.color.spec.value;}
  return undefined;
}

// =============================================================================
// Component
// =============================================================================






/**
 * Property editor for selected shapes in layout editing mode.
 */
export function LayoutShapePanel({ shape, onShapeChange }: LayoutShapePanelProps) {
  const shapeId = getShapeId(shape);
  const transform = getShapeTransform(shape);
  const fillHex = getSolidFillHex(shape);

  const handleFillChange = useCallback(
    (hex: string) => {
      if (!shapeId) {return;}
      onShapeChange(shapeId, (s) => {
        if (s.type !== "sp") {return s;}
        return {
          ...s,
          properties: {
            ...s.properties,
            fill: {
              type: "solidFill" as const,
              color: { spec: { type: "srgb" as const, value: hex } },
            },
          },
        };
      });
    },
    [shapeId, onShapeChange],
  );

  return (
    <>
      <OptionalPropertySection title="Shape" defaultExpanded>
        <FieldGroup label="Name" inline labelWidth={LABEL_WIDTH}>
          <span style={infoValueStyle}>{getShapeName(shape)}</span>
        </FieldGroup>
        <FieldGroup label="Type" inline labelWidth={LABEL_WIDTH}>
          <span style={infoValueStyle}>{shape.type}</span>
        </FieldGroup>
      </OptionalPropertySection>

      {transform && (
        <OptionalPropertySection title="Transform" defaultExpanded>
          <FieldGroup label="X" inline labelWidth={LABEL_WIDTH}>
            <span style={infoValueStyle}>{Math.round(transform.x as number)}</span>
          </FieldGroup>
          <FieldGroup label="Y" inline labelWidth={LABEL_WIDTH}>
            <span style={infoValueStyle}>{Math.round(transform.y as number)}</span>
          </FieldGroup>
          <FieldGroup label="W" inline labelWidth={LABEL_WIDTH}>
            <span style={infoValueStyle}>{Math.round(transform.width as number)}</span>
          </FieldGroup>
          <FieldGroup label="H" inline labelWidth={LABEL_WIDTH}>
            <span style={infoValueStyle}>{Math.round(transform.height as number)}</span>
          </FieldGroup>
        </OptionalPropertySection>
      )}

      {fillHex !== undefined && (
        <OptionalPropertySection title="Fill" defaultExpanded>
          <FieldGroup label="Color" inline labelWidth={LABEL_WIDTH}>
            <ColorPickerPopover
              value={fillHex}
              onChange={handleFillChange}
              trigger={
                <div style={{ ...swatchStyle, backgroundColor: `#${fillHex}` }} />
              }
            />
          </FieldGroup>
        </OptionalPropertySection>
      )}
    </>
  );
}

/** Empty state when no shape is selected. */
export function NoShapeSelected() {
  return <div style={emptyStyle}>Select a shape on the canvas</div>;
}
