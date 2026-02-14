/**
 * @file Procedure Completion Provider
 *
 * Provides Sub/Function/Property names for completion.
 */

import type { VbaProcedure } from "@aurochs-office/vba";
import type { CompletionProvider, CompletionItem, CompletionContext } from "../types";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format procedure signature for detail display.
 */
function formatSignature(proc: VbaProcedure): string {
  const params = proc.parameters
    .map((p) => {
      let sig = p.name;
      if (p.type) {
        sig += ` As ${p.type}`;
      }
      if (p.isOptional) {
        sig = `[${sig}]`;
      }
      return sig;
    })
    .join(", ");

  const returnType = proc.returnType ? ` As ${proc.returnType}` : "";

  switch (proc.type) {
    case "function":
      return `Function(${params})${returnType}`;
    case "sub":
      return `Sub(${params})`;
    case "propertyGet":
      return `Property Get${returnType}`;
    case "propertyLet":
      return `Property Let`;
    case "propertySet":
      return `Property Set`;
    default:
      return `Procedure(${params})`;
  }
}

/**
 * Convert procedure to completion item.
 */
function procedureToCompletionItem(proc: VbaProcedure): CompletionItem {
  const kind = proc.type.startsWith("property") ? "property" : "procedure";

  return {
    label: proc.name,
    kind,
    detail: formatSignature(proc),
    documentation: `${proc.visibility === "public" ? "Public" : "Private"} ${proc.type}`,
    insertText: proc.name,
  };
}

// =============================================================================
// Provider
// =============================================================================

/**
 * Procedure completion provider.
 *
 * Provides Sub/Function/Property names from the current module.
 */
export const procedureProvider: CompletionProvider = {
  id: "procedure",

  provideCompletions(
    context: CompletionContext,
    _source: string,
    procedures: readonly VbaProcedure[],
  ): readonly CompletionItem[] {
    // Don't provide procedures after "." (unless it's Me.)
    if (context.trigger === "dot" && context.objectName?.toLowerCase() !== "me") {
      return [];
    }

    const items = procedures.map(procedureToCompletionItem);

    // Filter by prefix
    const prefix = context.prefix.toLowerCase();
    if (!prefix) {
      return items;
    }

    return items.filter((item) =>
      item.label.toLowerCase().startsWith(prefix),
    );
  },
};
