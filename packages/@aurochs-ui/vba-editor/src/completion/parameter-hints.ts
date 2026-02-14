/**
 * @file Parameter Hints (Signature Help)
 *
 * Provides signature help when typing function calls.
 */

import type { VbaProcedure, VbaTypeName } from "@aurochs-office/vba";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert VbaTypeName to string.
 */
function typeNameToString(typeName: VbaTypeName | null | undefined): string | undefined {
  if (typeName === null || typeName === undefined) {
    return undefined;
  }
  if (typeof typeName === "string") {
    return typeName;
  }
  return typeName.userDefined;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Parameter info for display.
 */
export type ParameterInfo = {
  readonly name: string;
  readonly type?: string;
  readonly isOptional: boolean;
  readonly description?: string;
};

/**
 * Parameter hint to display.
 */
export type ParameterHint = {
  /** Function name */
  readonly functionName: string;
  /** Full signature string */
  readonly signature: string;
  /** Individual parameters */
  readonly parameters: readonly ParameterInfo[];
  /** Active parameter index (0-based) */
  readonly activeParameter: number;
  /** Return type if function */
  readonly returnType?: string;
};

// =============================================================================
// Built-in Function Signatures
// =============================================================================

type BuiltinSignature = {
  readonly params: readonly ParameterInfo[];
  readonly returnType?: string;
};

const BUILTIN_SIGNATURES: Record<string, BuiltinSignature> = {
  MsgBox: {
    params: [
      { name: "Prompt", type: "String", isOptional: false },
      { name: "Buttons", type: "VbMsgBoxStyle", isOptional: true },
      { name: "Title", type: "String", isOptional: true },
      { name: "HelpFile", type: "String", isOptional: true },
      { name: "Context", type: "Long", isOptional: true },
    ],
    returnType: "VbMsgBoxResult",
  },
  InputBox: {
    params: [
      { name: "Prompt", type: "String", isOptional: false },
      { name: "Title", type: "String", isOptional: true },
      { name: "Default", type: "String", isOptional: true },
      { name: "XPos", type: "Long", isOptional: true },
      { name: "YPos", type: "Long", isOptional: true },
    ],
    returnType: "String",
  },
  Left: {
    params: [
      { name: "String", type: "String", isOptional: false },
      { name: "Length", type: "Long", isOptional: false },
    ],
    returnType: "String",
  },
  Right: {
    params: [
      { name: "String", type: "String", isOptional: false },
      { name: "Length", type: "Long", isOptional: false },
    ],
    returnType: "String",
  },
  Mid: {
    params: [
      { name: "String", type: "String", isOptional: false },
      { name: "Start", type: "Long", isOptional: false },
      { name: "Length", type: "Long", isOptional: true },
    ],
    returnType: "String",
  },
  InStr: {
    params: [
      { name: "Start", type: "Long", isOptional: true },
      { name: "String1", type: "String", isOptional: false },
      { name: "String2", type: "String", isOptional: false },
      { name: "Compare", type: "VbCompareMethod", isOptional: true },
    ],
    returnType: "Long",
  },
  Replace: {
    params: [
      { name: "Expression", type: "String", isOptional: false },
      { name: "Find", type: "String", isOptional: false },
      { name: "Replace", type: "String", isOptional: false },
      { name: "Start", type: "Long", isOptional: true },
      { name: "Count", type: "Long", isOptional: true },
      { name: "Compare", type: "VbCompareMethod", isOptional: true },
    ],
    returnType: "String",
  },
  Split: {
    params: [
      { name: "Expression", type: "String", isOptional: false },
      { name: "Delimiter", type: "String", isOptional: true },
      { name: "Limit", type: "Long", isOptional: true },
      { name: "Compare", type: "VbCompareMethod", isOptional: true },
    ],
    returnType: "String()",
  },
  Join: {
    params: [
      { name: "SourceArray", type: "Variant()", isOptional: false },
      { name: "Delimiter", type: "String", isOptional: true },
    ],
    returnType: "String",
  },
  Format: {
    params: [
      { name: "Expression", type: "Variant", isOptional: false },
      { name: "Format", type: "String", isOptional: true },
    ],
    returnType: "String",
  },
  DateAdd: {
    params: [
      { name: "Interval", type: "String", isOptional: false },
      { name: "Number", type: "Double", isOptional: false },
      { name: "Date", type: "Date", isOptional: false },
    ],
    returnType: "Date",
  },
  DateDiff: {
    params: [
      { name: "Interval", type: "String", isOptional: false },
      { name: "Date1", type: "Date", isOptional: false },
      { name: "Date2", type: "Date", isOptional: false },
      { name: "FirstDayOfWeek", type: "VbDayOfWeek", isOptional: true },
      { name: "FirstWeekOfYear", type: "VbFirstWeekOfYear", isOptional: true },
    ],
    returnType: "Long",
  },
  Round: {
    params: [
      { name: "Number", type: "Double", isOptional: false },
      { name: "NumDigitsAfterDecimal", type: "Integer", isOptional: true },
    ],
    returnType: "Double",
  },
  Array: {
    params: [{ name: "ArgList", type: "Variant", isOptional: false, description: "Elements to include in array" }],
    returnType: "Variant()",
  },
  UBound: {
    params: [
      { name: "Array", type: "Variant", isOptional: false },
      { name: "Dimension", type: "Long", isOptional: true },
    ],
    returnType: "Long",
  },
  LBound: {
    params: [
      { name: "Array", type: "Variant", isOptional: false },
      { name: "Dimension", type: "Long", isOptional: true },
    ],
    returnType: "Long",
  },
};

// =============================================================================
// Context Detection
// =============================================================================

/**
 * Find the function name and active parameter at cursor position.
 */
export function detectParameterContext(
  source: string,
  cursorOffset: number,
  procedures: readonly VbaProcedure[],
): ParameterHint | undefined {
  // Scan backward to find unmatched "("
  let parenDepth = 0;
  let funcEnd = -1;

  for (let i = cursorOffset - 1; i >= 0; i--) {
    const char = source[i];

    if (char === ")") {
      parenDepth++;
    } else if (char === "(") {
      if (parenDepth === 0) {
        funcEnd = i;
        break;
      }
      parenDepth--;
    }
  }

  if (funcEnd === -1) {
    return undefined;
  }

  // Extract function name before "("
  let funcStart = funcEnd - 1;
  while (funcStart >= 0 && /\s/.test(source[funcStart])) {
    funcStart--;
  }
  while (funcStart >= 0 && /[a-zA-Z0-9_]/.test(source[funcStart])) {
    funcStart--;
  }
  funcStart++;

  const functionName = source.slice(funcStart, funcEnd).trim();
  if (!functionName) {
    return undefined;
  }

  // Count commas to determine active parameter
  let activeParameter = 0;
  parenDepth = 0;
  let inString = false;

  for (let i = funcEnd + 1; i < cursorOffset; i++) {
    const char = source[i];

    if (char === '"') {
      inString = !inString;
    } else if (!inString) {
      if (char === "(") {
        parenDepth++;
      } else if (char === ")") {
        parenDepth--;
      } else if (char === "," && parenDepth === 0) {
        activeParameter++;
      }
    }
  }

  // Look up function signature
  const builtin = BUILTIN_SIGNATURES[functionName];
  if (builtin) {
    return {
      functionName,
      signature: formatBuiltinSignature(functionName, builtin),
      parameters: builtin.params,
      activeParameter,
      returnType: builtin.returnType,
    };
  }

  // Look up in procedures
  const proc = procedures.find(
    (p) => p.name.toLowerCase() === functionName.toLowerCase(),
  );
  if (proc) {
    return {
      functionName: proc.name,
      signature: formatProcedureSignature(proc),
      parameters: proc.parameters.map((p) => ({
        name: p.name,
        type: typeNameToString(p.type),
        isOptional: p.isOptional,
      })),
      activeParameter,
      returnType: typeNameToString(proc.returnType),
    };
  }

  return undefined;
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format builtin signature for display.
 */
function formatBuiltinSignature(name: string, sig: BuiltinSignature): string {
  const params = sig.params
    .map((p) => {
      let s = p.name;
      if (p.type) {
        s += ` As ${p.type}`;
      }
      if (p.isOptional) {
        s = `[${s}]`;
      }
      return s;
    })
    .join(", ");

  const returnType = sig.returnType ? ` As ${sig.returnType}` : "";
  return `${name}(${params})${returnType}`;
}

/**
 * Format procedure signature for display.
 */
function formatProcedureSignature(proc: VbaProcedure): string {
  const params = proc.parameters
    .map((p) => {
      let s = p.name;
      if (p.type) {
        s += ` As ${p.type}`;
      }
      if (p.isOptional) {
        s = `[${s}]`;
      }
      return s;
    })
    .join(", ");

  const prefix =
    proc.type === "function"
      ? "Function"
      : proc.type === "sub"
        ? "Sub"
        : "Property";
  const returnType = proc.returnType ? ` As ${proc.returnType}` : "";

  return `${prefix} ${proc.name}(${params})${returnType}`;
}
