/**
 * @file VBA Procedure parser
 *
 * Extracts procedure definitions (Sub, Function, Property) from VBA source code.
 * This is a simple regex-based parser that extracts procedure signatures
 * without full VBA syntax parsing.
 *
 * @see MS-VBAL (VBA Language Specification)
 */

import type { VbaProcedure, VbaProcedureType, VbaParameter, VbaTypeName } from "../types";

/**
 * Parse VBA source code and extract procedure definitions.
 *
 * @param sourceCode - VBA source code text
 * @returns Array of parsed procedures
 */
export function parseProcedures(sourceCode: string): VbaProcedure[] {
  const procedures: VbaProcedure[] = [];

  // Match procedure declarations
  // Pattern: [Public|Private] (Sub|Function|Property Get|Property Let|Property Set) Name[(params)] [As Type]
  const procRegex =
    /^[ \t]*(Public\s+|Private\s+)?(Sub|Function|Property\s+Get|Property\s+Let|Property\s+Set)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\([^)]*\))?(?:\s+As\s+([A-Za-z_][A-Za-z0-9_]*))?/gim;

  for (const match of sourceCode.matchAll(procRegex)) {
    const [, visibilityMatch, typeMatch, name, paramsMatch, returnTypeMatch] = match;

    const visibility = visibilityMatch?.trim().toLowerCase() === "private" ? "private" : "public";
    const procType = parseProcedureType(typeMatch);
    const parameters = paramsMatch ? parseParameters(paramsMatch) : [];
    const returnType = returnTypeMatch ? parseTypeName(returnTypeMatch) : null;

    procedures.push({
      name,
      type: procType,
      visibility,
      parameters,
      returnType,
    });
  }

  return procedures;
}

/**
 * Parse procedure type from keyword.
 */
function parseProcedureType(keyword: string): VbaProcedureType {
  const normalized = keyword.replace(/\s+/g, " ").toLowerCase();
  switch (normalized) {
    case "sub":
      return "sub";
    case "function":
      return "function";
    case "property get":
      return "propertyGet";
    case "property let":
      return "propertyLet";
    case "property set":
      return "propertySet";
    default:
      return "sub";
  }
}

/**
 * Parse parameter list from parenthesized string.
 *
 * @param paramsStr - Parameter string including parentheses, e.g., "(x As Integer, y)"
 */
function parseParameters(paramsStr: string): VbaParameter[] {
  // Remove parentheses
  const inner = paramsStr.slice(1, -1).trim();
  if (!inner) {return [];}

  const params: VbaParameter[] = [];

  // Split by comma (simple split, doesn't handle nested parentheses)
  const parts = inner.split(",");

  for (const part of parts) {
    const param = parseParameter(part.trim());
    if (param) {
      params.push(param);
    }
  }

  return params;
}

/**
 * Parse a single parameter definition.
 *
 * Format: [Optional] [ByVal|ByRef] [ParamArray] name [As type] [= default]
 */
function parseParameter(paramStr: string): VbaParameter | null {
  if (!paramStr) {return null;}

  const state = {
    str: paramStr,
    isOptional: false,
    passingMode: "byRef" as "byVal" | "byRef",
    isParamArray: false,
  };

  // Check for Optional
  if (/^optional\s+/i.test(state.str)) {
    state.isOptional = true;
    state.str = state.str.replace(/^optional\s+/i, "");
  }

  // Check for ByVal/ByRef
  if (/^byval\s+/i.test(state.str)) {
    state.passingMode = "byVal";
    state.str = state.str.replace(/^byval\s+/i, "");
  } else if (/^byref\s+/i.test(state.str)) {
    state.passingMode = "byRef";
    state.str = state.str.replace(/^byref\s+/i, "");
  }

  // Check for ParamArray
  if (/^paramarray\s+/i.test(state.str)) {
    state.isParamArray = true;
    state.str = state.str.replace(/^paramarray\s+/i, "");
  }

  // Parse name, type, and default value
  // Format: name [As type] [= default]
  const paramMatch = state.str.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s+As\s+([A-Za-z_][A-Za-z0-9_]*))?(?:\s*=\s*(.+))?$/i);

  if (!paramMatch) {
    // Just a name without type
    const nameMatch = state.str.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
    if (!nameMatch) {return null;}

    return {
      name: nameMatch[1],
      type: null,
      passingMode: state.passingMode,
      isOptional: state.isOptional,
      defaultValue: null,
      isParamArray: state.isParamArray,
    };
  }

  const [, name, typeStr, defaultValue] = paramMatch;

  return {
    name,
    type: typeStr ? parseTypeName(typeStr) : null,
    passingMode: state.passingMode,
    isOptional: state.isOptional,
    defaultValue: defaultValue?.trim() || null,
    isParamArray: state.isParamArray,
  };
}

/**
 * Parse VBA type name.
 */
function parseTypeName(typeStr: string): VbaTypeName {
  const normalized = typeStr.toLowerCase();
  switch (normalized) {
    case "integer":
      return "Integer";
    case "long":
      return "Long";
    case "single":
      return "Single";
    case "double":
      return "Double";
    case "currency":
      return "Currency";
    case "string":
      return "String";
    case "boolean":
      return "Boolean";
    case "date":
      return "Date";
    case "variant":
      return "Variant";
    case "object":
      return "Object";
    default:
      return { userDefined: typeStr };
  }
}
