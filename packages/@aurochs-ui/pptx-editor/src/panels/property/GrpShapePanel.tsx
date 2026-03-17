/**
 * @file GrpShape property panel component
 *
 * Displays property editors for GrpShape (group) elements.
 * When a property is undefined, shows an "Add" button to initialize it with defaults.
 */

import type { GrpShape, Shape, GroupTransform } from "@aurochs-office/pptx/domain/index";
import type { Transform } from "@aurochs-office/pptx/domain/types";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { Accordion } from "@aurochs-ui/ui-components/layout";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  FillEditor,
  EffectsEditor,
  createDefaultTransform,
  createDefaultSolidFill,
  createDefaultEffects,
} from "../../editors/index";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";

// =============================================================================
// Types
// =============================================================================

export type GrpShapePanelProps = {
  readonly shape: GrpShape;
  readonly onChange: (shape: GrpShape) => void;
  readonly onUngroup: () => void;
  readonly onSelectChild: (childId: string, addToSelection: boolean, toggle?: boolean) => void;
};

// =============================================================================
// Helpers
// =============================================================================

/** Create a default GroupTransform with child offset/extent. */
function createDefaultGroupTransform(): GroupTransform {
  const base = createDefaultTransform();
  return {
    ...base,
    childOffsetX: px(0),
    childOffsetY: px(0),
    childExtentWidth: base.width,
    childExtentHeight: base.height,
  };
}

/**
 * Get shape type label for display.
 */
function getShapeTypeLabel(child: Shape): string {
  switch (child.type) {
    case "sp": {
      const geometry = child.properties.geometry;
      if (geometry?.type === "preset") {
        return geometry.preset;
      }
      return "Shape";
    }
    case "pic":
      return "Picture";
    case "cxnSp":
      return "Connector";
    case "grpSp":
      return "Group";
    case "graphicFrame": {
      switch (child.content.type) {
        case "table":
          return "Table";
        case "chart":
          return "Chart";
        case "diagram":
          return "Diagram";
        default:
          return "Graphic";
      }
    }
    default:
      return child.type;
  }
}

/**
 * Extract base Transform from GroupTransform for TransformEditor.
 */
function extractBaseTransform(groupTransform: GrpShape["properties"]["transform"]): Transform | undefined {
  if (!groupTransform) {
    return undefined;
  }
  return {
    x: groupTransform.x,
    y: groupTransform.y,
    width: groupTransform.width,
    height: groupTransform.height,
    rotation: groupTransform.rotation,
    flipH: groupTransform.flipH,
    flipV: groupTransform.flipV,
  };
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Child shape list item button.
 */
function ChildShapeButton({
  child,
  index,
  onSelect,
}: {
  readonly child: Shape;
  readonly index: number;
  readonly onSelect: (childId: string, addToSelection: boolean, toggle?: boolean) => void;
}) {
  function getChildName(child: Shape, index: number): string {
    if ("nonVisual" in child) {
      return child.nonVisual.name || `Shape ${index + 1}`;
    }
    return `Shape ${index + 1}`;
  }

  const childId = "nonVisual" in child ? child.nonVisual.id : undefined;
  const childName = getChildName(child, index);
  const typeLabel = getShapeTypeLabel(child);

  const handleClick = (e: React.MouseEvent) => {
    if (!childId) {
      return;
    }
    const isModifierKey = e.shiftKey || e.metaKey || e.ctrlKey;
    const isToggle = e.metaKey || e.ctrlKey;
    onSelect(childId, isModifierKey, isToggle);
  };

  return (
    <button
      key={childId ?? index}
      type="button"
      onClick={handleClick}
      disabled={!childId}
      style={{
        padding: "8px 12px",
        backgroundColor: "var(--bg-tertiary, #111111)",
        border: "1px solid transparent",
        borderRadius: "6px",
        fontSize: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: childId ? "pointer" : "default",
        textAlign: "left",
        color: "var(--text-secondary, #a1a1a1)",
      }}
    >
      <span>{childName}</span>
      <span
        style={{
          fontSize: "10px",
          color: "var(--text-tertiary, #737373)",
          backgroundColor: "var(--bg-secondary, #1a1a1a)",
          padding: "2px 6px",
          borderRadius: "4px",
        }}
      >
        {typeLabel}
      </span>
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * GrpShape editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Group info (ungroup button, children list)
 * - Transform
 * - Fill
 * - Effects
 */
export function GrpShapePanel({ shape, onChange, onUngroup, onSelectChild }: GrpShapePanelProps) {
  /** Update shape properties immutably. */
  function updateProperties(update: Partial<GrpShape["properties"]>) {
    onChange({ ...shape, properties: { ...shape.properties, ...update } });
  }

  const baseTransform = extractBaseTransform(shape.properties.transform);

  /**
   * Handle transform changes.
   * When no GroupTransform exists yet, creates a new one from the base Transform.
   * When one exists, merges the base Transform fields into the existing GroupTransform.
   */
  const handleTransformChange = (newTransform: Transform) => {
    const existing = shape.properties.transform;
    if (existing) {
      updateProperties({ transform: { ...existing, ...newTransform } });
    } else {
      const base = createDefaultGroupTransform();
      updateProperties({ transform: { ...base, ...newTransform } });
    }
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </Accordion>

      <Accordion title="Group Info" defaultExpanded>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Ungroup button */}
          <button
            type="button"
            onClick={onUngroup}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              backgroundColor: "var(--bg-secondary, #1a1a1a)",
              border: "1px solid var(--border-subtle, #333)",
              borderRadius: "6px",
              color: "var(--text-primary, #fff)",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Ungroup ({shape.children.length} shapes)
          </button>

          {/* Children list */}
          <FieldGroup label="Children">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {shape.children.map((child, index) => (
                <ChildShapeButton
                  key={"nonVisual" in child ? child.nonVisual.id : index}
                  child={child}
                  index={index}
                  onSelect={onSelectChild}
                />
              ))}
            </div>
          </FieldGroup>
        </div>
      </Accordion>

      <OptionalPropertySection
        title="Transform"
        value={baseTransform}
        createDefault={createDefaultTransform}
        onChange={handleTransformChange}
        renderEditor={(v, set) => <TransformEditor value={v} onChange={set} />}
        defaultExpanded
      />

      <OptionalPropertySection
        title="Fill"
        value={shape.properties.fill}
        createDefault={createDefaultSolidFill}
        onChange={(fill) => updateProperties({ fill })}
        renderEditor={(v, set) => <FillEditor value={v} onChange={set} />}
      />

      <OptionalPropertySection
        title="Effects"
        value={shape.properties.effects}
        createDefault={createDefaultEffects}
        onChange={(effects) => updateProperties({ effects })}
        renderEditor={(v, set) => <EffectsEditor value={v} onChange={set} />}
      />
    </>
  );
}
