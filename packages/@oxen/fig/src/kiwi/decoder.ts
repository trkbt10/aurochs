/**
 * @file Kiwi schema and message decoder
 */

import type { KiwiSchema, KiwiDefinition, KiwiField } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { resolveTypeName, resolveKindName } from "./schema";
import { FigParseError } from "../errors";

/**
 * Decode a Kiwi schema from binary data (length-prefixed strings).
 *
 * @param data - Binary schema data
 * @returns Decoded schema
 */
export function decodeSchema(data: Uint8Array): KiwiSchema {
  const buffer = new ByteBuffer(data);
  const definitionCount = buffer.readVarUint();
  const definitions: KiwiDefinition[] = [];

  for (const _ of Array(definitionCount).keys()) {
    const name = buffer.readString();
    const kind = resolveKindName(buffer.readByte());
    const fieldCount = buffer.readVarUint();
    const fields: KiwiField[] = [];

    for (const __ of Array(fieldCount).keys()) {
      const fieldName = buffer.readString();
      const typeId = buffer.readVarInt();
      const isArray = buffer.readByte() !== 0;
      const value = buffer.readVarUint();

      fields.push({
        name: fieldName,
        type: resolveTypeName(typeId, definitions),
        typeId,
        isArray,
        value,
      });
    }

    definitions.push({ name, kind, fields });
  }

  return { definitions };
}

/**
 * Decode a fig-kiwi schema from binary data (null-terminated strings).
 * This is the format used by .fig files.
 *
 * @param data - Binary schema data
 * @returns Decoded schema
 */
export function decodeFigSchema(data: Uint8Array): KiwiSchema {
  const buffer = new ByteBuffer(data);
  const definitionCount = buffer.readVarUint();
  const definitions: KiwiDefinition[] = [];

  for (const _ of Array(definitionCount).keys()) {
    const name = buffer.readNullString();
    const kind = resolveKindName(buffer.readByte());
    const fieldCount = buffer.readVarUint();
    const fields: KiwiField[] = [];

    for (const __ of Array(fieldCount).keys()) {
      const fieldName = buffer.readNullString();
      const typeId = buffer.readVarInt();
      const isArray = buffer.readByte() !== 0;
      const value = buffer.readVarUint();

      fields.push({
        name: fieldName,
        type: resolveTypeName(typeId, definitions),
        typeId,
        isArray,
        value,
      });
    }

    definitions.push({ name, kind, fields });
  }

  return { definitions };
}

/**
 * Decode a primitive value from buffer.
 */
function decodePrimitive(
  buffer: ByteBuffer,
  type: string
): unknown {
  switch (type) {
    case "bool":
      return buffer.readByte() !== 0;
    case "byte":
      return buffer.readByte();
    case "int":
      return buffer.readVarInt();
    case "uint":
      return buffer.readVarUint();
    case "float":
      return buffer.readVarFloat();
    case "string":
      return buffer.readString();
    case "int64":
      return buffer.readVarInt64();
    case "uint64":
      return buffer.readVarUint64();
    default:
      return null;
  }
}

/**
 * Check if type is a primitive type.
 */
function isPrimitiveType(type: string): boolean {
  return [
    "bool",
    "byte",
    "int",
    "uint",
    "float",
    "string",
    "int64",
    "uint64",
  ].includes(type);
}

/**
 * Decode a Kiwi message using a schema.
 *
 * @param schema - Schema to use for decoding
 * @param data - Binary message data
 * @param typeName - Name of the message type to decode
 * @returns Decoded message object
 */
export function decodeMessage(
  schema: KiwiSchema,
  data: Uint8Array,
  typeName: string
): Record<string, unknown> {
  const buffer = new ByteBuffer(data);
  return decodeMessageFromBuffer(schema, buffer, typeName);
}

/**
 * Decode a message from buffer.
 */
function decodeMessageFromBuffer(
  schema: KiwiSchema,
  buffer: ByteBuffer,
  typeName: string
): Record<string, unknown> {
  const definition = schema.definitions.find((d) => d.name === typeName);
  if (!definition) {
    throw new FigParseError(`Unknown type: ${typeName}`);
  }

  const result: Record<string, unknown> = {};

  if (definition.kind === "STRUCT") {
    // Struct: all fields in order
    for (const field of definition.fields) {
      result[field.name] = decodeField(schema, buffer, field);
    }
  } else if (definition.kind === "MESSAGE") {
    // Message: field index then value, until 0
    const fieldMap = new Map(definition.fields.map((f) => [f.value, f]));

    // eslint-disable-next-line no-restricted-syntax -- Loop until sentinel
    let fieldIndex: number;
    while ((fieldIndex = buffer.readVarUint()) !== 0) {
      const field = fieldMap.get(fieldIndex);
      if (field) {
        result[field.name] = decodeField(schema, buffer, field);
      } else {
        // Unknown field - skip
        skipField(buffer);
      }
    }
  } else if (definition.kind === "ENUM") {
    // Enum: just return the value
    const value = buffer.readVarUint();
    const field = definition.fields.find((f) => f.value === value);
    return { value, name: field?.name ?? `unknown(${value})` };
  }

  return result;
}

/**
 * Decode a field value.
 */
function decodeField(
  schema: KiwiSchema,
  buffer: ByteBuffer,
  field: KiwiField
): unknown {
  if (field.isArray) {
    const count = buffer.readVarUint();
    const items: unknown[] = [];
    for (const _ of Array(count).keys()) {
      items.push(decodeValue(schema, buffer, field.type));
    }
    return items;
  }
  return decodeValue(schema, buffer, field.type);
}

/**
 * Decode a single value.
 */
function decodeValue(
  schema: KiwiSchema,
  buffer: ByteBuffer,
  type: string
): unknown {
  if (isPrimitiveType(type)) {
    return decodePrimitive(buffer, type);
  }
  // Custom type
  return decodeMessageFromBuffer(schema, buffer, type);
}

/**
 * Skip an unknown field (for forward compatibility).
 */
function skipField(buffer: ByteBuffer): void {
  // Read as byte array to skip
  buffer.readByteArray();
}

/**
 * Decode raw fig file chunks.
 * Fig files have: schema chunk (deflate) + data chunk (deflate)
 */
export type FigChunks = {
  schema: Uint8Array;
  data: Uint8Array;
};

/**
 * Split standard Kiwi payload into chunks.
 * Each chunk is prefixed with its size as VarUint.
 *
 * @param payload - Raw payload
 * @returns Schema and data chunks
 */
export function splitChunks(payload: Uint8Array): FigChunks {
  const buffer = new ByteBuffer(payload);

  // First chunk: schema
  const schemaSize = buffer.readVarUint();
  const schema = buffer.readBytes(schemaSize);

  // Second chunk: data
  const dataSize = buffer.readVarUint();
  const data = buffer.readBytes(dataSize);

  return { schema, data };
}

/**
 * Split fig file payload into schema and data chunks.
 * Schema chunk size is in header (payloadSize field).
 * Data chunk has 4-byte LE size prefix.
 *
 * @param payload - Raw payload (after header)
 * @param schemaSize - Size of schema chunk from header
 * @returns Schema and data chunks
 */
export function splitFigChunks(
  payload: Uint8Array,
  schemaSize: number
): FigChunks {
  const schema = payload.slice(0, schemaSize);

  // Data chunk starts after schema
  const dataStart = schemaSize;
  const dataChunk = payload.slice(dataStart);

  // Data chunk has 4-byte LE size prefix
  const view = new DataView(dataChunk.buffer, dataChunk.byteOffset, 4);
  const dataSize = view.getUint32(0, true);
  const data = dataChunk.slice(4, 4 + dataSize);

  return { schema, data };
}

/**
 * Decode a fig-kiwi message using a schema.
 * Uses null-terminated strings for fig format.
 *
 * @param schema - Schema to use for decoding
 * @param data - Binary message data
 * @param typeName - Name of the message type to decode
 * @returns Decoded message object
 */
export function decodeFigMessage(
  schema: KiwiSchema,
  data: Uint8Array,
  typeName: string
): Record<string, unknown> {
  const buffer = new ByteBuffer(data);
  return decodeFigMessageFromBuffer(schema, buffer, typeName);
}

/**
 * Decode a fig-kiwi message from buffer by type name.
 */
function decodeFigMessageFromBuffer(
  schema: KiwiSchema,
  buffer: ByteBuffer,
  typeName: string
): Record<string, unknown> {
  const definition = schema.definitions.find((d) => d.name === typeName);
  if (!definition) {
    throw new FigParseError(`Unknown type: ${typeName}`);
  }

  return decodeFigDefinition(schema, buffer, definition) as Record<
    string,
    unknown
  >;
}

/**
 * Decode a fig field value using typeId.
 */
function decodeFigField(
  schema: KiwiSchema,
  buffer: ByteBuffer,
  field: KiwiField
): unknown {
  if (field.isArray) {
    const count = buffer.readVarUint();
    const items: unknown[] = [];
    for (const _ of Array(count).keys()) {
      items.push(decodeFigValueByTypeId(schema, buffer, field.typeId));
    }
    return items;
  }
  return decodeFigValueByTypeId(schema, buffer, field.typeId);
}

/** Primitive type IDs */
const PRIMITIVE_TYPES: Record<number, string> = {
  [-1]: "bool",
  [-2]: "byte",
  [-3]: "int",
  [-4]: "uint",
  [-5]: "float",
  [-6]: "string",
  [-7]: "int64",
  [-8]: "uint64",
};

/**
 * Decode a single fig value by typeId.
 */
function decodeFigValueByTypeId(
  schema: KiwiSchema,
  buffer: ByteBuffer,
  typeId: number
): unknown {
  // Negative typeId = primitive type
  if (typeId < 0) {
    const primitiveType = PRIMITIVE_TYPES[typeId];
    if (primitiveType) {
      return decodeFigPrimitive(buffer, primitiveType);
    }
    throw new FigParseError(`Unknown primitive type: ${typeId}`);
  }

  // Non-negative typeId = reference to definition by index
  const definition = schema.definitions[typeId];
  if (!definition) {
    throw new FigParseError(`Unknown type index: ${typeId}`);
  }

  return decodeFigDefinition(schema, buffer, definition);
}

/**
 * Decode a fig value by definition.
 */
function decodeFigDefinition(
  schema: KiwiSchema,
  buffer: ByteBuffer,
  definition: KiwiDefinition
): unknown {
  const result: Record<string, unknown> = {};

  if (definition.kind === "STRUCT") {
    // Struct: all fields in order
    for (const field of definition.fields) {
      result[field.name] = decodeFigField(schema, buffer, field);
    }
  } else if (definition.kind === "MESSAGE") {
    // Message: field index then value, until 0
    const fieldMap = new Map(definition.fields.map((f) => [f.value, f]));

    // eslint-disable-next-line no-restricted-syntax -- Loop until sentinel
    let fieldIndex: number;
    while ((fieldIndex = buffer.readVarUint()) !== 0) {
      const field = fieldMap.get(fieldIndex);
      if (field) {
        result[field.name] = decodeFigField(schema, buffer, field);
      } else {
        // Unknown field - cannot safely skip, so stop
        break;
      }
    }
  } else if (definition.kind === "ENUM") {
    // Enum: just return the value
    const value = buffer.readVarUint();
    const field = definition.fields.find((f) => f.value === value);
    return { value, name: field?.name ?? `unknown(${value})` };
  }

  return result;
}

/**
 * Decode a fig primitive value (null-terminated strings, raw floats).
 */
function decodeFigPrimitive(buffer: ByteBuffer, type: string): unknown {
  switch (type) {
    case "bool":
      return buffer.readByte() !== 0;
    case "byte":
      return buffer.readByte();
    case "int":
      return buffer.readVarInt();
    case "uint":
      return buffer.readVarUint();
    case "float":
      return buffer.readFloat32(); // Raw 4-byte float for fig
    case "string":
      return buffer.readNullString(); // Use null-terminated for fig
    case "int64":
      return buffer.readVarInt64();
    case "uint64":
      return buffer.readVarUint64();
    default:
      return null;
  }
}
