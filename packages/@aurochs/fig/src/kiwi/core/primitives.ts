/**
 * @file Primitive type constants and utilities
 */

import type { PrimitiveTypeName } from "./types";
import { KIWI_TYPE } from "../schema";

/** Map from type ID to type name */
export const PRIMITIVE_TYPES: Readonly<Record<number, PrimitiveTypeName>> = {
  [KIWI_TYPE.BOOL]: "bool",
  [KIWI_TYPE.BYTE]: "byte",
  [KIWI_TYPE.INT]: "int",
  [KIWI_TYPE.UINT]: "uint",
  [KIWI_TYPE.FLOAT]: "float",
  [KIWI_TYPE.STRING]: "string",
  [KIWI_TYPE.INT64]: "int64",
  [KIWI_TYPE.UINT64]: "uint64",
};

/** Map from type name to type ID */
export const TYPE_IDS: Readonly<Record<string, number>> = {
  bool: KIWI_TYPE.BOOL,
  byte: KIWI_TYPE.BYTE,
  int: KIWI_TYPE.INT,
  uint: KIWI_TYPE.UINT,
  float: KIWI_TYPE.FLOAT,
  string: KIWI_TYPE.STRING,
  int64: KIWI_TYPE.INT64,
  uint64: KIWI_TYPE.UINT64,
};

/**
 * Check if type name is a primitive type.
 */
export function isPrimitiveTypeName(type: string): type is PrimitiveTypeName {
  return type in TYPE_IDS;
}

/**
 * Check if type ID is a primitive type.
 */
export function isPrimitiveTypeId(typeId: number): boolean {
  return typeId < 0 && typeId in PRIMITIVE_TYPES;
}

/**
 * Get primitive type name from type ID.
 * Returns undefined if not a primitive type.
 */
export function getPrimitiveTypeName(
  typeId: number
): PrimitiveTypeName | undefined {
  return PRIMITIVE_TYPES[typeId];
}
