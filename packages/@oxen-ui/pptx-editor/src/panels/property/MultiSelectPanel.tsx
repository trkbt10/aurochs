/**
 * @file Multi-selection property panel
 *
 * Displays common property editors for multiple selected shapes.
 * Shows "Mixed" for properties that differ across shapes.
 */

import { useMemo, useCallback, type CSSProperties } from "react";
import { colorTokens } from "@oxen-ui/ui-components/design-tokens";
import type { Shape } from "@oxen/pptx/domain/index";
import type { Transform } from "@oxen/pptx/domain/types";
import type { Fill, Line } from "@oxen/pptx/domain/color/types";
import { px, deg } from "@oxen/ooxml/domain/units";
import { type ShapeId } from "@oxen/pptx/domain/types";
import { Accordion } from "@oxen-ui/ui-components/layout";
import { Input } from "@oxen-ui/ui-components/primitives/index";
import { FillEditor } from "../../editors/color/FillEditor";
import { LineEditor } from "../../ui/line";
import {
  analyzeShapeTypes,
  getCommonTransform,
  getCommonFill,
  getCommonLine,
  allShapesSupportFill,
  allShapesSupportLine,
  applyTransformToShape,
  applyFillToShape,
  applyLineToShape,
  type CommonTransform,
  type CommonValue,
} from "./common-properties";

// =============================================================================
// Types
// =============================================================================

export type MultiSelectPanelProps = {
  readonly shapes: readonly Shape[];
  readonly onShapeChange: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get shape ID safely.
 */
function getShapeId(shape: Shape): ShapeId | undefined {
  return "nonVisual" in shape ? shape.nonVisual.id : undefined;
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Header showing selection count and type info.
 */
function SelectionHeader({
  count,
  isSameType,
  commonType,
}: {
  readonly count: number;
  readonly isSameType: boolean;
  readonly commonType: string | undefined;
}) {
  const headerStyle: CSSProperties = {
    padding: "12px 16px",
    borderBottom: `1px solid ${colorTokens.border.primary}`,
    fontSize: "13px",
    color: colorTokens.text.primary,
  };

  const typeStyle: CSSProperties = {
    fontSize: "11px",
    color: colorTokens.text.tertiary,
    marginTop: "4px",
  };

  return (
    <div style={headerStyle}>
      <strong>{count} shapes selected</strong>
      <div style={typeStyle}>
        {isSameType ? `All ${commonType}` : "Mixed types"}
      </div>
    </div>
  );
}

/**
 * Mixed value input that shows "Mixed" placeholder.
 */
function MixedInput({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: CommonValue<number>;
  readonly onChange: (value: number) => void;
}) {
  const isMixed = value === undefined;

  const handleChange = useCallback(
    (val: string | number) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (!isNaN(num)) {
        onChange(num);
      }
    },
    [onChange]
  );

  const labelStyle: CSSProperties = {
    fontSize: "11px",
    color: colorTokens.text.secondary,
    marginBottom: "4px",
  };

  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <Input
        type="number"
        value={isMixed ? "" : value}
        placeholder={isMixed ? "Mixed" : undefined}
        onChange={handleChange}
      />
    </div>
  );
}

/**
 * Transform section for multi-selection.
 */
function MultiTransformSection({
  commonTransform,
  onTransformChange,
}: {
  readonly commonTransform: CommonTransform;
  readonly onTransformChange: (update: Partial<Transform>) => void;
}) {
  return (
    <Accordion title="Transform" defaultExpanded>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <MixedInput
            label="X"
            value={commonTransform.x}
            onChange={(x) => onTransformChange({ x: px(x) })}
          />
          <MixedInput
            label="Y"
            value={commonTransform.y}
            onChange={(y) => onTransformChange({ y: px(y) })}
          />
          <MixedInput
            label="Width"
            value={commonTransform.width}
            onChange={(width) => onTransformChange({ width: px(width) })}
          />
          <MixedInput
            label="Height"
            value={commonTransform.height}
            onChange={(height) => onTransformChange({ height: px(height) })}
          />
        </div>
        <MixedInput
          label="Rotation"
          value={commonTransform.rotation}
          onChange={(rotation) => onTransformChange({ rotation: deg(rotation) })}
        />
      </div>
    </Accordion>
  );
}

/**
 * Fill section for multi-selection (same type only).
 */
function MultiFillSection({
  commonFill,
  onFillChange,
}: {
  readonly commonFill: CommonValue<Fill>;
  readonly onFillChange: (fill: Fill) => void;
}) {
  const isMixed = commonFill === undefined;

  if (isMixed) {
    return (
      <Accordion title="Fill" defaultExpanded={false}>
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: colorTokens.text.tertiary,
            fontSize: "12px",
          }}
        >
          Mixed fill values
        </div>
      </Accordion>
    );
  }

  return (
    <Accordion title="Fill" defaultExpanded={false}>
      <FillEditor value={commonFill} onChange={onFillChange} />
    </Accordion>
  );
}

/**
 * Line section for multi-selection (same type only).
 */
function MultiLineSection({
  commonLine,
  onLineChange,
}: {
  readonly commonLine: CommonValue<Line>;
  readonly onLineChange: (line: Line) => void;
}) {
  const isMixed = commonLine === undefined;

  if (isMixed) {
    return (
      <Accordion title="Line" defaultExpanded={false}>
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: colorTokens.text.tertiary,
            fontSize: "12px",
          }}
        >
          Mixed line values
        </div>
      </Accordion>
    );
  }

  return (
    <Accordion title="Line" defaultExpanded={false}>
      <LineEditor value={commonLine} onChange={onLineChange} />
    </Accordion>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Multi-selection property panel.
 *
 * Shows common properties for multiple selected shapes:
 * - Transform (all shapes)
 * - Fill/Line (same type shapes only)
 */
export function MultiSelectPanel({
  shapes,
  onShapeChange,
}: MultiSelectPanelProps) {
  // Analyze shape types
  const typeAnalysis = useMemo(() => analyzeShapeTypes(shapes), [shapes]);

  // Extract common properties
  const commonTransform = useMemo(() => getCommonTransform(shapes), [shapes]);
  const commonFill = useMemo(() => getCommonFill(shapes), [shapes]);
  const commonLine = useMemo(() => getCommonLine(shapes), [shapes]);

  // Check capabilities
  const canEditFill = useMemo(() => allShapesSupportFill(shapes), [shapes]);
  const canEditLine = useMemo(() => allShapesSupportLine(shapes), [shapes]);

  // Apply transform change to all shapes
  const handleTransformChange = useCallback(
    (update: Partial<Transform>) => {
      for (const shape of shapes) {
        const id = getShapeId(shape);
        if (id) {
          onShapeChange(id, (s) => applyTransformToShape(s, update));
        }
      }
    },
    [shapes, onShapeChange]
  );

  // Apply fill change to all shapes
  const handleFillChange = useCallback(
    (fill: Fill) => {
      for (const shape of shapes) {
        const id = getShapeId(shape);
        if (id) {
          onShapeChange(id, (s) => applyFillToShape(s, fill));
        }
      }
    },
    [shapes, onShapeChange]
  );

  // Apply line change to all shapes
  const handleLineChange = useCallback(
    (line: Line) => {
      for (const shape of shapes) {
        const id = getShapeId(shape);
        if (id) {
          onShapeChange(id, (s) => applyLineToShape(s, line));
        }
      }
    },
    [shapes, onShapeChange]
  );

  return (
    <div>
      <SelectionHeader
        count={shapes.length}
        isSameType={typeAnalysis.isSameType}
        commonType={typeAnalysis.commonType}
      />

      <MultiTransformSection
        commonTransform={commonTransform}
        onTransformChange={handleTransformChange}
      />

      {canEditFill && (
        <MultiFillSection
          commonFill={commonFill}
          onFillChange={handleFillChange}
        />
      )}

      {canEditLine && (
        <MultiLineSection
          commonLine={commonLine}
          onLineChange={handleLineChange}
        />
      )}
    </div>
  );
}
