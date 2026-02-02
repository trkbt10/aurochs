/**
 * @file Kiwi schema and message encoder
 */

import type { KiwiSchema, KiwiDefinition, KiwiField } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { KIWI_KIND, KIWI_TYPE } from "./schema";
import { FigBuildError } from "../errors";

/** Map from type name to type constant */
const TYPE_IDS: Record<string, number> = {
  bool: KIWI_TYPE.BOOL,
  byte: KIWI_TYPE.BYTE,
  int: KIWI_TYPE.INT,
  uint: KIWI_TYPE.UINT,
  float: KIWI_TYPE.FLOAT,
  string: KIWI_TYPE.STRING,
  int64: KIWI_TYPE.INT64,
  uint64: KIWI_TYPE.UINT64,
};

/** Map from kind name to kind constant */
const KIND_IDS: Record<string, number> = {
  ENUM: KIWI_KIND.ENUM,
  STRUCT: KIWI_KIND.STRUCT,
  MESSAGE: KIWI_KIND.MESSAGE,
};

/**
 * Resolve type name to type ID.
 */
function resolveTypeId(
  typeName: string,
  definitions: readonly KiwiDefinition[]
): number {
  const primitiveId = TYPE_IDS[typeName];
  if (primitiveId !== undefined) {
    return primitiveId;
  }

  // Custom type - find index in definitions
  const index = definitions.findIndex((d) => d.name === typeName);
  if (index >= 0) {
    return index;
  }

  throw new FigBuildError(`Unknown type: ${typeName}`);
}

/**
 * Encode a Kiwi schema to binary data.
 *
 * @param schema - Schema to encode
 * @returns Binary schema data
 */
export function encodeSchema(schema: KiwiSchema): Uint8Array {
  const buffer = new ByteBuffer();

  buffer.writeVarUint(schema.definitions.length);

  for (const def of schema.definitions) {
    buffer.writeString(def.name);
    buffer.writeByte(KIND_IDS[def.kind] ?? KIWI_KIND.MESSAGE);
    buffer.writeVarUint(def.fields.length);

    for (const field of def.fields) {
      buffer.writeString(field.name);
      // Use typeId directly if available, otherwise resolve from type name
      const typeId =
        field.typeId !== undefined
          ? field.typeId
          : resolveTypeId(field.type, schema.definitions);
      buffer.writeVarInt(typeId);
      buffer.writeByte(field.isArray ? 1 : 0);
      buffer.writeVarUint(field.value);
    }
  }

  return buffer.toUint8Array();
}

/**
 * Check if type is a primitive type.
 */
function isPrimitiveType(type: string): boolean {
  return TYPE_IDS[type] !== undefined;
}

/**
 * Encode a primitive value to buffer.
 */
function encodePrimitive(
  buffer: ByteBuffer,
  type: string,
  value: unknown
): void {
  switch (type) {
    case "bool":
      buffer.writeByte(value ? 1 : 0);
      break;
    case "byte":
      buffer.writeByte(value as number);
      break;
    case "int":
      buffer.writeVarInt(value as number);
      break;
    case "uint":
      buffer.writeVarUint(value as number);
      break;
    case "float":
      buffer.writeVarFloat(value as number);
      break;
    case "string":
      buffer.writeString(value as string);
      break;
    case "int64":
      buffer.writeVarInt64(value as bigint);
      break;
    case "uint64":
      buffer.writeVarUint64(value as bigint);
      break;
  }
}

/** Context for encoding operations */
type EncodeContext = {
  readonly schema: KiwiSchema;
  readonly buffer: ByteBuffer;
};

/**
 * Extract enum value from message object.
 */
function extractEnumValue(message: Record<string, unknown>): number {
  if (typeof message === "object" && message !== null && "value" in message) {
    return message.value as number;
  }
  return 0;
}

/**
 * Encode a message to binary data.
 *
 * @param schema - Schema to use for encoding
 * @param message - Message object to encode
 * @param typeName - Name of the message type
 * @returns Binary message data
 */
export function encodeMessage(
  schema: KiwiSchema,
  message: Record<string, unknown>,
  typeName: string
): Uint8Array {
  const buffer = new ByteBuffer();
  const ctx: EncodeContext = { schema, buffer };
  encodeMessageToBuffer(ctx, message, typeName);
  return buffer.toUint8Array();
}

/**
 * Encode a message to buffer.
 */
function encodeMessageToBuffer(
  ctx: EncodeContext,
  message: Record<string, unknown>,
  typeName: string
): void {
  const definition = ctx.schema.definitions.find((d) => d.name === typeName);
  if (!definition) {
    throw new FigBuildError(`Unknown type: ${typeName}`);
  }

  if (definition.kind === "STRUCT") {
    // Struct: all fields in order
    for (const field of definition.fields) {
      const value = message[field.name];
      encodeField(ctx, field, value);
    }
  } else if (definition.kind === "MESSAGE") {
    // Message: field index then value, for each present field
    for (const field of definition.fields) {
      const value = message[field.name];
      if (value !== undefined && value !== null) {
        ctx.buffer.writeVarUint(field.value);
        encodeField(ctx, field, value);
      }
    }
    // End marker
    ctx.buffer.writeVarUint(0);
  } else if (definition.kind === "ENUM") {
    // Enum: write the value
    const enumValue = extractEnumValue(message);
    ctx.buffer.writeVarUint(enumValue);
  }
}

/**
 * Encode a field value.
 */
function encodeField(
  ctx: EncodeContext,
  field: KiwiField,
  value: unknown
): void {
  if (field.isArray) {
    const items = value as unknown[];
    ctx.buffer.writeVarUint(items?.length ?? 0);
    if (items) {
      for (const item of items) {
        encodeValue(ctx, field.type, item);
      }
    }
  } else {
    encodeValue(ctx, field.type, value);
  }
}

/**
 * Encode a single value.
 */
function encodeValue(ctx: EncodeContext, type: string, value: unknown): void {
  if (isPrimitiveType(type)) {
    encodePrimitive(ctx.buffer, type, value);
  } else {
    // Custom type
    encodeMessageToBuffer(ctx, value as Record<string, unknown>, type);
  }
}

/**
 * Combine schema and data chunks into payload.
 *
 * @param schema - Compressed schema chunk
 * @param data - Compressed data chunk
 * @returns Combined payload
 */
export function combineChunks(
  schema: Uint8Array,
  data: Uint8Array
): Uint8Array {
  const buffer = new ByteBuffer();

  // First chunk: schema
  buffer.writeVarUint(schema.length);
  buffer.writeBytes(schema);

  // Second chunk: data
  buffer.writeVarUint(data.length);
  buffer.writeBytes(data);

  return buffer.toUint8Array();
}
