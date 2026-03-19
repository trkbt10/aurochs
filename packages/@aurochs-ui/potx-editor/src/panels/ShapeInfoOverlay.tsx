/**
 * @file Shape info overlay for potx-editor
 *
 * Renders a single-line badge on the primary selected shape.
 * Format: "[placeholder ▾] type · name" — all in one row.
 * Placeholder type is editable via inline dropdown for sp shapes.
 */

import { useCallback, type CSSProperties, type ReactNode, type ChangeEvent } from "react";
import type { Shape, SpShape, PlaceholderType, Placeholder } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { getShapeTransform } from "@aurochs-renderer/pptx/svg";
import { colorTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ShapeInfoOverlayProps = {
  readonly shapes: readonly Shape[];
  readonly primaryId: ShapeId | undefined;
  readonly isMultiSelection: boolean;
  readonly onPlaceholderChange?: (shapeId: ShapeId, placeholder: Placeholder | undefined) => void;
  readonly onDoubleClick?: (shapeId: ShapeId) => void;
};

// =============================================================================
// Constants
// =============================================================================

const PLACEHOLDER_TYPES: readonly { value: string; label: string }[] = [
  { value: "", label: "(none)" },
  { value: "title", label: "Title" },
  { value: "body", label: "Body" },
  { value: "ctrTitle", label: "Center Title" },
  { value: "subTitle", label: "Subtitle" },
  { value: "dt", label: "Date/Time" },
  { value: "sldNum", label: "Slide Number" },
  { value: "ftr", label: "Footer" },
  { value: "hdr", label: "Header" },
  { value: "obj", label: "Object" },
  { value: "chart", label: "Chart" },
  { value: "tbl", label: "Table" },
  { value: "dgm", label: "Diagram" },
  { value: "media", label: "Media" },
  { value: "pic", label: "Picture" },
];

function getPlaceholderLabel(type: PlaceholderType | undefined): string {
  if (!type) {return "(none)";}
  const entry = PLACEHOLDER_TYPES.find((t) => t.value === type);
  return entry ? entry.label : type;
}

function getShapeTypeLabel(shape: Shape): string {
  switch (shape.type) {
    case "sp": return shape.nonVisual.textBox ? "textbox" : "sp";
    case "cxnSp": return "connector";
    case "pic": return "picture";
    case "graphicFrame": return "frame";
    case "grpSp": return "group";
    case "contentPart": return "content";
    default: return "shape";
  }
}

// =============================================================================
// Styles
// =============================================================================

const badgeStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 6px",
  fontSize: "9px",
  fontFamily: "system-ui, sans-serif",
  lineHeight: "14px",
  borderRadius: radiusTokens.sm,
  whiteSpace: "nowrap",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  color: "#ddd",
};

const separatorStyle: CSSProperties = {
  color: "rgba(255, 255, 255, 0.3)",
};

const selectStyle: CSSProperties = {
  fontSize: "9px",
  fontFamily: "system-ui, sans-serif",
  lineHeight: "12px",
  padding: "0 1px",
  border: "none",
  borderRadius: radiusTokens.xs,
  backgroundColor: colorTokens.selection.primary,
  color: "#fff",
  cursor: "pointer",
  pointerEvents: "auto",
  outline: "none",
  height: "14px",
};

// =============================================================================
// Helpers
// =============================================================================

type PlaceholderControlProps = {
  readonly isSpShape: boolean;
  readonly placeholderType: string | undefined;
  readonly selectStyle: CSSProperties;
  readonly handleSelectChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  readonly phLabel: string;
  readonly idxSuffix: string;
};

function renderPlaceholderControl({ isSpShape, placeholderType, selectStyle, handleSelectChange, phLabel, idxSuffix }: PlaceholderControlProps): ReactNode {
  if (isSpShape) {
    return (
      <select
        style={selectStyle}
        value={placeholderType ?? ""}
        onChange={handleSelectChange}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {PLACEHOLDER_TYPES.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  return <span style={{ color: colorTokens.selection.primary }}>{phLabel}{idxSuffix}</span>;
}

// =============================================================================
// Component
// =============================================================================

/** Overlay showing shape info badges on the canvas. */
export function ShapeInfoOverlay({ shapes, primaryId, isMultiSelection, onPlaceholderChange, onDoubleClick }: ShapeInfoOverlayProps) {
  if (!primaryId || isMultiSelection) {return null;}

  const shape = shapes.find((s) => s.type !== "contentPart" && s.nonVisual.id === primaryId);
  if (!shape || shape.type === "contentPart") {return null;}

  const t = getShapeTransform(shape);
  if (!t) {return null;}

  const placeholder = shape.type === "sp" ? (shape as SpShape).placeholder : undefined;

  return (
    <ShapeBadge
      shapeId={primaryId}
      x={t.x as number}
      y={t.y as number}
      shapeName={shape.nonVisual.name}
      typeLabel={getShapeTypeLabel(shape)}
      placeholderType={placeholder?.type}
      placeholderIdx={placeholder?.idx}
      isSpShape={shape.type === "sp"}
      onPlaceholderChange={onPlaceholderChange}
      onDoubleClick={onDoubleClick}
    />
  );
}

// =============================================================================
// Badge sub-component (single-line)
// =============================================================================

type ShapeBadgeProps = {
  readonly shapeId: ShapeId;
  readonly x: number;
  readonly y: number;
  readonly shapeName: string;
  readonly typeLabel: string;
  readonly placeholderType: PlaceholderType | undefined;
  readonly placeholderIdx: number | undefined;
  readonly isSpShape: boolean;
  readonly onPlaceholderChange?: (shapeId: ShapeId, placeholder: Placeholder | undefined) => void;
  readonly onDoubleClick?: (shapeId: ShapeId) => void;
};

function ShapeBadge({
  shapeId,
  x,
  y,
  shapeName,
  typeLabel,
  placeholderType,
  placeholderIdx,
  isSpShape,
  onPlaceholderChange,
  onDoubleClick,
}: ShapeBadgeProps) {
  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      const value = e.target.value;
      if (!onPlaceholderChange) {return;}
      if (value === "") {
        onPlaceholderChange(shapeId, undefined);
      } else {
        onPlaceholderChange(shapeId, {
          type: value as PlaceholderType,
          idx: placeholderIdx,
        });
      }
    },
    [shapeId, placeholderIdx, onPlaceholderChange],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(shapeId);
    },
    [shapeId, onDoubleClick],
  );

  const phLabel = getPlaceholderLabel(placeholderType);
  const idxSuffix = placeholderIdx !== undefined ? ` ${placeholderIdx}` : "";

  return (
    <div
      style={{ ...badgeStyle, left: x, top: y, transform: "translateY(-100%)" }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Placeholder: dropdown for sp, static label for others */}
      {renderPlaceholderControl({ isSpShape, placeholderType, selectStyle, handleSelectChange, phLabel, idxSuffix })}

      <span style={separatorStyle}>|</span>

      {/* type · name */}
      <span>{typeLabel} · {shapeName}</span>
    </div>
  );
}
