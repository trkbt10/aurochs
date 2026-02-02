/**
 * @file Kiwi schema and message encoder
 */

import type { KiwiSchema, KiwiDefinition } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { KIWI_KIND } from "./schema";
import { FigBuildError } from "../errors";

// Import from core
import { encodeDefinition } from "./core/definition-codec";
import { createValueEncoder } from "./core/value-codec";
import { findDefinitionByName } from "./core/schema-utils";
import { TYPE_IDS } from "./core/primitives";
import type { KiwiFormat } from "./core/types";

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

  const index = definitions.findIndex((d) => d.name === typeName);
  if (index >= 0) {
    return index;
  }

  throw new FigBuildError(`Unknown type: ${typeName}`);
}

/**
 * Encode a Kiwi schema to binary data.
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
      const typeId =
        field.typeId ?? resolveTypeId(field.type, schema.definitions);
      buffer.writeVarInt(typeId);
      buffer.writeByte(field.isArray ? 1 : 0);
      buffer.writeVarUint(field.value);
    }
  }

  return buffer.toUint8Array();
}

/** Options for message encoding */
type EncodeMessageOptions = {
  readonly schema: KiwiSchema;
  readonly buffer: ByteBuffer;
  readonly message: Record<string, unknown>;
  readonly typeName: string;
  readonly format: KiwiFormat;
};

/** Internal encode with format parameter */
function encodeMessageInternal(options: EncodeMessageOptions): void {
  const { schema, buffer, message, typeName, format } = options;
  const definition = findDefinitionByName(schema, typeName);
  const encodeValue = createValueEncoder({ format, strict: false });

  encodeDefinition({
    buffer,
    schema,
    definition,
    message,
    format,
    encodeValue,
    strict: false,
  });
}

/**
 * Encode a message to binary data.
 */
export function encodeMessage(
  schema: KiwiSchema,
  message: Record<string, unknown>,
  typeName: string
): Uint8Array {
  const buffer = new ByteBuffer();
  encodeMessageInternal({
    schema,
    buffer,
    message,
    typeName,
    format: "standard",
  });
  return buffer.toUint8Array();
}

/**
 * Combine schema and data chunks into payload.
 */
export function combineChunks(
  schema: Uint8Array,
  data: Uint8Array
): Uint8Array {
  const buffer = new ByteBuffer();
  buffer.writeVarUint(schema.length);
  buffer.writeBytes(schema);
  buffer.writeVarUint(data.length);
  buffer.writeBytes(data);
  return buffer.toUint8Array();
}
