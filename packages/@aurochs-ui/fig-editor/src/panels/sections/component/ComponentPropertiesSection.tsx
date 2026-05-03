/**
 * @file Component Properties section
 *
 * Displays resolved component property definitions and their current values
 * for INSTANCE nodes. Shows the SYMBOL's property definitions alongside
 * the INSTANCE's overridden values (or the default if not overridden).
 */

import type {
  FigDesignNode,
  FigDesignDocument,
  FigNodeId,
  ComponentPropertyDef,
  ComponentPropertyAssignment,
  ComponentPropertyValue,
} from "@aurochs/fig/domain";
import { useCallback } from "react";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { createPropertyPrimaryUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

// =============================================================================
// Resolution Logic
// =============================================================================

/**
 * A single resolved property with its definition and current effective value.
 */
export type ResolvedComponentProperty = {
  /** The property definition from the SYMBOL */
  readonly def: ComponentPropertyDef;
  /** Current effective value (from INSTANCE assignment, or SYMBOL default) */
  readonly value: ComponentPropertyValue | undefined;
  /** Whether this property is overridden by the INSTANCE */
  readonly isOverridden: boolean;
};

/**
 * Resolve component properties for an INSTANCE node.
 *
 * Looks up the referenced SYMBOL's property definitions, then merges
 * with the INSTANCE's property assignments to determine the current
 * effective value for each property.
 *
 * @param instanceNode - The INSTANCE FigDesignNode
 * @param document - The document (for components map lookup)
 * @returns Array of resolved properties, or empty if not an INSTANCE or SYMBOL not found
 */
export function resolveComponentProperties(
  instanceNode: FigDesignNode,
  document: FigDesignDocument,
): readonly ResolvedComponentProperty[] {
  if (instanceNode.type !== "INSTANCE" || !instanceNode.symbolId) {
    return [];
  }

  const symbol = document.components.get(instanceNode.symbolId);
  if (!symbol || !symbol.componentPropertyDefs || symbol.componentPropertyDefs.length === 0) {
    return [];
  }

  // Build assignment lookup by defId
  const assignmentMap = new Map<string, ComponentPropertyAssignment>();
  if (instanceNode.componentPropertyAssignments) {
    for (const assign of instanceNode.componentPropertyAssignments) {
      assignmentMap.set(assign.defId, assign);
    }
  }

  return symbol.componentPropertyDefs.map((def) => {
    const assignment = assignmentMap.get(def.id);
    return {
      def,
      value: assignment ? assignment.value : def.initialValue,
      isOverridden: assignment !== undefined,
    };
  });
}

// =============================================================================
// Styles
// =============================================================================

const styles = {
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: `${spacingTokens.xs} 0`,
    borderBottom: `1px solid ${colorTokens.border.subtle}`,
    gap: spacingTokens.sm,
  } as const,
  name: {
    fontSize: fontTokens.size.sm,
    color: colorTokens.text.secondary,
    flexShrink: 0,
  } as const,
  value: {
    fontSize: fontTokens.size.sm,
    color: colorTokens.text.primary,
    textAlign: "right" as const,
    wordBreak: "break-word" as const,
    minWidth: 0,
  } as const,
  overridden: {
    fontWeight: fontTokens.weight.semibold,
  } as const,
  badge: {
    fontSize: fontTokens.size.xs,
    color: colorTokens.text.tertiary,
    backgroundColor: colorTokens.background.tertiary,
    borderRadius: "3px",
    padding: `0 ${spacingTokens.xs}`,
    marginLeft: spacingTokens.xs,
  } as const,
  empty: {
    fontSize: fontTokens.size.sm,
    color: colorTokens.text.tertiary,
    fontStyle: "italic" as const,
    padding: `${spacingTokens.sm} 0`,
  } as const,
  symbolName: {
    fontSize: fontTokens.size.xs,
    color: colorTokens.text.tertiary,
    marginBottom: spacingTokens.sm,
  } as const,
} as const;

// =============================================================================
// Component
// =============================================================================

type Props = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly document: FigDesignDocument;
  readonly dispatch: (action: FigEditorAction) => void;
};

/** Panel section for viewing and editing component instance properties. */
export function ComponentPropertiesSection({ node, target, document, dispatch }: Props) {
  const properties = resolveComponentProperties(node, document);
  const updateAssignment = useCallback(
    (defId: FigNodeId, value: ComponentPropertyValue) => {
      dispatch(createPropertyPrimaryUpdateAction({
        target,
        updater: (current) => {
          const assignments = current.componentPropertyAssignments ?? [];
          const exists = assignments.some((assignment) => assignment.defId === defId);
          const next = updateComponentPropertyAssignments({ assignments, defId, value, exists });
          return { ...current, componentPropertyAssignments: next };
        },
      }));
    },
    [dispatch, target],
  );

  if (properties.length === 0) {
    const symbol = node.symbolId ? document.components.get(node.symbolId) : undefined;
    return (
      <div>
        {symbol && (
          <div style={styles.symbolName}>
            Component: {symbol.name}
          </div>
        )}
        <div style={styles.empty}>No component properties defined</div>
      </div>
    );
  }

  const symbol = node.symbolId ? document.components.get(node.symbolId) : undefined;

  return (
    <div>
      {symbol && (
        <div style={styles.symbolName}>
          Component: {symbol.name}
        </div>
      )}
      {properties.map((prop) => (
        <div key={prop.def.id} style={styles.row}>
          <span style={styles.name}>
            {prop.def.name}
            <span style={styles.badge}>{prop.def.type}</span>
          </span>
          <ComponentPropertyValueEditor
            prop={prop}
            document={document}
            onChange={(value) => updateAssignment(prop.def.id, value)}
          />
        </div>
      ))}
    </div>
  );
}

function ComponentPropertyValueEditor(
  { prop, document, onChange }: {
    readonly prop: ResolvedComponentProperty;
    readonly document: FigDesignDocument;
    readonly onChange: (value: ComponentPropertyValue) => void;
  },
) {
  const value = prop.value;
  const badge = renderOverrideBadge(prop.isOverridden);

  switch (prop.def.type) {
    case "BOOL":
      return (
        <span style={styles.value}>
          <input
            type="checkbox"
            aria-label={componentPropertyControlLabel(prop)}
            checked={value?.boolValue ?? false}
            onChange={(e) => onChange({ boolValue: e.currentTarget.checked })}
          />
          {badge}
        </span>
      );
    case "TEXT":
      return (
        <span style={{ ...styles.value, ...(prop.isOverridden ? styles.overridden : {}) }}>
          <Input
            type="text"
            ariaLabel={componentPropertyControlLabel(prop)}
            value={value?.textValue?.characters ?? ""}
            onChange={(v) => onChange({ textValue: { characters: String(v) } })}
          />
          {badge}
        </span>
      );
    case "NUMBER":
      return (
        <span style={{ ...styles.value, ...(prop.isOverridden ? styles.overridden : {}) }}>
          <Input
            type="number"
            ariaLabel={componentPropertyControlLabel(prop)}
            value={value?.numberValue ?? 0}
            onChange={(v) => onChange({ numberValue: v as number })}
          />
          {badge}
        </span>
      );
    case "INSTANCE_SWAP":
      return (
        <span style={{ ...styles.value, ...(prop.isOverridden ? styles.overridden : {}) }}>
          <Select
            value={value?.referenceValue ?? ""}
            onChange={(v) => onChange(createInstanceSwapValue(v))}
            options={buildInstanceSwapOptions(document)}
            ariaLabel={componentPropertyControlLabel(prop)}
          />
          {badge}
        </span>
      );
    case "VARIANT":
      return (
        <span style={{ ...styles.value, ...(prop.isOverridden ? styles.overridden : {}) }}>
          <Select
            value={value?.referenceValue ?? ""}
            onChange={(v) => onChange(createReferenceSelectValue(v))}
            options={buildReferenceOptions(document)}
            ariaLabel={componentPropertyControlLabel(prop)}
          />
          {badge}
        </span>
      );
    case "COLOR":
    case "IMAGE":
    case "SLOT":
      return (
        <span style={{ ...styles.value, ...(prop.isOverridden ? styles.overridden : {}) }}>
          <Input
            type="text"
            ariaLabel={componentPropertyControlLabel(prop)}
            value={value?.referenceValue ?? ""}
            onChange={(v) => onChange(createReferenceValue(String(v)))}
          />
          {badge}
        </span>
      );
  }
}

function renderOverrideBadge(isOverridden: boolean) {
  if (!isOverridden) {
    return null;
  }
  return (
    <span style={{ ...styles.badge, backgroundColor: colorTokens.accent.secondary }}>
      override
    </span>
  );
}

function componentPropertyControlLabel(prop: ResolvedComponentProperty): string {
  return `Component property ${prop.def.name}`;
}

function updateComponentPropertyAssignments(
  {
    assignments,
    defId,
    value,
    exists,
  }: {
    readonly assignments: readonly ComponentPropertyAssignment[];
    readonly defId: FigNodeId;
    readonly value: ComponentPropertyValue;
    readonly exists: boolean;
  },
): readonly ComponentPropertyAssignment[] {
  if (!exists) {
    return [...assignments, { defId, value }];
  }
  return assignments.map((assignment) => {
    if (assignment.defId === defId) {
      return { ...assignment, value };
    }
    return assignment;
  });
}

function buildInstanceSwapOptions(document: FigDesignDocument): readonly SelectOption<FigNodeId | "">[] {
  return [
    { value: "", label: "None" },
    ...[...document.components.values()].map((component) => ({
      value: component.id,
      label: component.name,
    })),
  ];
}

function buildReferenceOptions(document: FigDesignDocument): readonly SelectOption<FigNodeId | "">[] {
  return [
    { value: "", label: "None" },
    ...[...document.components.values()].map((component) => ({
      value: component.id,
      label: component.name,
    })),
  ];
}

function createInstanceSwapValue(value: FigNodeId | ""): ComponentPropertyValue {
  if (value === "") {
    return {};
  }
  return { referenceValue: value };
}

function createReferenceSelectValue(value: FigNodeId | ""): ComponentPropertyValue {
  if (value === "") {
    return {};
  }
  return { referenceValue: value };
}

function createReferenceValue(value: string): ComponentPropertyValue {
  if (value === "") {
    return {};
  }
  return { referenceValue: value as FigNodeId };
}
