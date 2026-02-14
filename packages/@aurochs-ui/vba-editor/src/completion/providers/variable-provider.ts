/**
 * @file Variable Completion Provider
 *
 * Provides local variables for completion.
 * Extracts variables from Dim, ReDim, Const, For, and procedure parameters.
 */

import type { CompletionProvider, CompletionItem, CompletionContext } from "../types";

// =============================================================================
// Variable Extraction
// =============================================================================

/**
 * Extract variable declarations from source.
 */
function extractVariables(source: string): readonly CompletionItem[] {
  const variables: CompletionItem[] = [];
  const seen = new Set<string>();

  // Match Dim/ReDim/Const/Static declarations
  // Examples:
  //   Dim x As Integer
  //   Dim x, y, z As String
  //   Dim arr(10) As Integer
  //   Const PI = 3.14
  //   Static counter As Long
  const dimPattern =
    /\b(?:Dim|ReDim|Const|Static|Public|Private)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*\([^)]*\))?(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*(?:\s*\([^)]*\))?)*)/gi;

  let match: RegExpExecArray | null;
  while ((match = dimPattern.exec(source)) !== null) {
    const declaration = match[1];
    // Split by comma and extract variable names
    const varPattern = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varPattern.exec(declaration)) !== null) {
      const name = varMatch[1];
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        variables.push({
          label: name,
          kind: "variable",
          detail: "Variable",
        });
      }
    }
  }

  // Match For loop variables
  // Examples:
  //   For i = 1 To 10
  //   For Each item In collection
  const forPattern = /\bFor\s+(?:Each\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  while ((match = forPattern.exec(source)) !== null) {
    const name = match[1];
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      variables.push({
        label: name,
        kind: "variable",
        detail: "Loop variable",
      });
    }
  }

  // Match procedure parameters
  // Examples:
  //   Sub Test(x As Integer, ByVal y As String)
  //   Function Calc(a, b As Double) As Double
  const procPattern =
    /\b(?:Sub|Function|Property\s+(?:Get|Let|Set))\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(([^)]*)\)/gi;
  while ((match = procPattern.exec(source)) !== null) {
    const params = match[1];
    if (params.trim()) {
      // Extract parameter names
      const paramPattern = /(?:Optional\s+)?(?:ByVal\s+|ByRef\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
      let paramMatch: RegExpExecArray | null;
      while ((paramMatch = paramPattern.exec(params)) !== null) {
        const name = paramMatch[1];
        // Skip keywords
        if (!/^(Optional|ByVal|ByRef|ParamArray|As)$/i.test(name)) {
          if (!seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            variables.push({
              label: name,
              kind: "variable",
              detail: "Parameter",
            });
          }
        }
      }
    }
  }

  return variables;
}

// =============================================================================
// Provider
// =============================================================================

/**
 * Variable completion provider.
 *
 * Provides local variables extracted from the source code.
 */
export const variableProvider: CompletionProvider = {
  id: "variable",

  provideCompletions(
    context: CompletionContext,
    source: string,
    _procedures: readonly import("@aurochs-office/vba").VbaProcedure[],
  ): readonly CompletionItem[] {
    // Don't provide variables after "."
    if (context.trigger === "dot") {
      return [];
    }

    const variables = extractVariables(source);

    // Filter by prefix
    const prefix = context.prefix.toLowerCase();
    if (!prefix) {
      return variables;
    }

    return variables.filter((item) =>
      item.label.toLowerCase().startsWith(prefix),
    );
  },
};
