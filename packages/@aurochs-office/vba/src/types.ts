/**
 * @file VBA Intermediate Representation types
 *
 * Core types for representing parsed VBA programs.
 * These types form the contract between the OVBA parser and VBA runtime.
 *
 * @see MS-OVBA (Office VBA File Format)
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

// =============================================================================
// Program-level types
// =============================================================================

/**
 * VBA Program Intermediate Representation.
 *
 * Complete representation of a parsed vbaProject.bin file.
 * This is the output of the OVBA parser and input to the VBA runtime.
 */
export type VbaProgramIr = {
  /** Project metadata from PROJECT stream */
  readonly project: VbaProjectInfo;
  /** All modules in the VBA project */
  readonly modules: readonly VbaModule[];
  /** References to external libraries */
  readonly references: readonly VbaReference[];
};

/**
 * VBA Project metadata from PROJECT stream.
 */
export type VbaProjectInfo = {
  /** Project name */
  readonly name: string;
  /** Help file path (if any) */
  readonly helpFile: string | null;
  /** Help context ID */
  readonly helpContext: number;
  /** Conditional compilation constants */
  readonly constants: string | null;
  /** Version info: major.minor */
  readonly version: { readonly major: number; readonly minor: number };
};

// =============================================================================
// Module types
// =============================================================================

/**
 * VBA Module (Standard Module, Class Module, Form, Document).
 */
export type VbaModule = {
  /** Module name */
  readonly name: string;
  /** Module type */
  readonly type: VbaModuleType;
  /** Decompressed source code text */
  readonly sourceCode: string;
  /** Stream offset within vbaProject.bin (for debugging) */
  readonly streamOffset: number;
  /** Parsed procedures (populated after source parsing) */
  readonly procedures: readonly VbaProcedure[];
};

/**
 * VBA module types.
 */
export type VbaModuleType =
  /** Standard module (.bas) */
  | "standard"
  /** Class module (.cls) */
  | "class"
  /** UserForm (.frm) */
  | "form"
  /** Document module (ThisWorkbook, Sheet1, etc.) */
  | "document";

// =============================================================================
// Procedure types
// =============================================================================

/**
 * VBA Procedure (Sub, Function, Property).
 */
export type VbaProcedure = {
  /** Procedure name */
  readonly name: string;
  /** Procedure type */
  readonly type: VbaProcedureType;
  /** Visibility */
  readonly visibility: "public" | "private";
  /** Parameters */
  readonly parameters: readonly VbaParameter[];
  /** Return type (for Function and Property Get) */
  readonly returnType: VbaTypeName | null;
};

/**
 * VBA procedure types.
 */
export type VbaProcedureType =
  | "sub"
  | "function"
  | "propertyGet"
  | "propertyLet"
  | "propertySet";

/**
 * VBA parameter definition.
 */
export type VbaParameter = {
  /** Parameter name */
  readonly name: string;
  /** Parameter type (Variant if not specified) */
  readonly type: VbaTypeName | null;
  /** Passing mode (ByRef is default) */
  readonly passingMode: "byVal" | "byRef";
  /** Is optional parameter */
  readonly isOptional: boolean;
  /** Default value expression (for optional parameters) */
  readonly defaultValue: string | null;
  /** Is ParamArray */
  readonly isParamArray: boolean;
};

/**
 * VBA type name.
 */
export type VbaTypeName =
  | "Integer"
  | "Long"
  | "Single"
  | "Double"
  | "Currency"
  | "String"
  | "Boolean"
  | "Date"
  | "Variant"
  | "Object"
  | { readonly userDefined: string };

// =============================================================================
// Reference types
// =============================================================================

/**
 * External library reference.
 */
export type VbaReference = {
  /** Reference name (as used in code) */
  readonly name: string;
  /** Library identifier (GUID or path) */
  readonly libId: string;
  /** Reference type */
  readonly type: "registered" | "project";
};
