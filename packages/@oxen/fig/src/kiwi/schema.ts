/**
 * @file Kiwi schema types and constants
 */

import type {
  KiwiSchema,
  KiwiDefinition,
  KiwiField,
  KiwiDefinitionKind,
  KiwiPrimitiveType,
} from "../types";

/** Kiwi definition kind constants */
export const KIWI_KIND = {
  ENUM: 0,
  STRUCT: 1,
  MESSAGE: 2,
} as const;

/** Kiwi field type constants */
export const KIWI_TYPE = {
  BOOL: -1,
  BYTE: -2,
  INT: -3,
  UINT: -4,
  FLOAT: -5,
  STRING: -6,
  INT64: -7,
  UINT64: -8,
} as const;

/** Map from type constant to type name */
const TYPE_NAMES: Record<number, KiwiPrimitiveType> = {
  [-1]: "bool",
  [-2]: "byte",
  [-3]: "int",
  [-4]: "uint",
  [-5]: "float",
  [-6]: "string",
  [-7]: "int64",
  [-8]: "uint64",
};

/** Map from kind constant to kind name */
const KIND_NAMES: Record<number, KiwiDefinitionKind> = {
  [0]: "ENUM",
  [1]: "STRUCT",
  [2]: "MESSAGE",
};

/**
 * Convert type constant to type name.
 *
 * @param typeId - Type constant or definition index
 * @param definitions - Schema definitions for resolving custom types
 * @returns Type name
 */
export function resolveTypeName(
  typeId: number,
  definitions: readonly KiwiDefinition[]
): KiwiPrimitiveType | string {
  if (typeId < 0) {
    const name = TYPE_NAMES[typeId];
    if (name) {
      return name;
    }
    return `unknown(${typeId})`;
  }

  // Custom type - reference to another definition
  if (typeId < definitions.length) {
    return definitions[typeId].name;
  }

  return `ref(${typeId})`;
}

/**
 * Convert kind constant to kind name.
 *
 * @param kindId - Kind constant
 * @returns Kind name
 */
export function resolveKindName(kindId: number): KiwiDefinitionKind {
  return KIND_NAMES[kindId] ?? "MESSAGE";
}

/** Options for creating a field */
type CreateFieldOptions = {
  readonly name: string;
  readonly type: KiwiPrimitiveType | string;
  readonly typeId: number;
  readonly isArray: boolean;
  readonly value: number;
};

/**
 * Create a field definition.
 */
export function createField(options: CreateFieldOptions): KiwiField {
  return {
    name: options.name,
    type: options.type,
    typeId: options.typeId,
    isArray: options.isArray,
    value: options.value,
  };
}

/**
 * Create a definition.
 */
export function createDefinition(
  name: string,
  kind: KiwiDefinitionKind,
  fields: readonly KiwiField[]
): KiwiDefinition {
  return { name, kind, fields };
}

/**
 * Create a schema.
 */
export function createSchema(
  definitions: readonly KiwiDefinition[]
): KiwiSchema {
  return { definitions };
}

/**
 * Find a definition by name.
 */
export function findDefinition(
  schema: KiwiSchema,
  name: string
): KiwiDefinition | undefined {
  return schema.definitions.find((d) => d.name === name);
}
