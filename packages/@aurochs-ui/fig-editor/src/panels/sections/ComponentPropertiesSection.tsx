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
  ComponentPropertyDef,
  ComponentPropertyAssignment,
  ComponentPropertyValue,
  ComponentPropertyType,
} from "@aurochs/fig/domain";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";

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
// Value Display Helpers
// =============================================================================

function formatPropertyValue(value: ComponentPropertyValue | undefined, type: ComponentPropertyType): string {
  if (!value) return "(none)";

  switch (type) {
    case "BOOL":
      return value.boolValue !== undefined ? (value.boolValue ? "true" : "false") : "(none)";
    case "TEXT":
      return value.textValue?.characters ?? "(none)";
    case "COLOR":
      // Color values may be stored in various formats
      return "(color)";
    case "INSTANCE_SWAP":
      return value.referenceValue ?? "(none)";
    case "VARIANT":
      return value.textValue?.characters ?? "(none)";
    case "NUMBER":
      return String(value.numberValue ?? "(none)");
    case "IMAGE":
      return "(image)";
    case "SLOT":
      return "(slot)";
  }
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
  readonly document: FigDesignDocument;
};

export function ComponentPropertiesSection({ node, document }: Props) {
  const properties = resolveComponentProperties(node, document);

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
          <span style={{
            ...styles.value,
            ...(prop.isOverridden ? styles.overridden : {}),
          }}>
            {formatPropertyValue(prop.value, prop.def.type)}
            {prop.isOverridden && (
              <span style={{ ...styles.badge, backgroundColor: colorTokens.accent.secondary }}>
                override
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
