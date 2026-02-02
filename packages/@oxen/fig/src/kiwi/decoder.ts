/**
 * @file Kiwi schema and message decoder
 */

import type { KiwiSchema } from "../types";
import { ByteBuffer } from "./byte-buffer";

// Import from core
import { decodeSchemaFromBuffer } from "./core/schema-codec";
import { decodeDefinition } from "./core/definition-codec";
import { createValueDecoder } from "./core/value-codec";
import { findDefinitionByName } from "./core/schema-utils";
import type { KiwiFormat } from "./core/types";

/**
 * Decode a Kiwi schema from binary data (length-prefixed strings).
 */
export function decodeSchema(data: Uint8Array): KiwiSchema {
  return decodeSchemaFromBuffer({
    buffer: new ByteBuffer(data),
    format: "standard",
  });
}

/**
 * Decode a fig-kiwi schema from binary data (null-terminated strings).
 */
export function decodeFigSchema(data: Uint8Array): KiwiSchema {
  return decodeSchemaFromBuffer({
    buffer: new ByteBuffer(data),
    format: "fig",
  });
}

/**
 * Decode raw fig file chunks.
 */
export type FigChunks = {
  schema: Uint8Array;
  data: Uint8Array;
};

/**
 * Split standard Kiwi payload into chunks.
 */
export function splitChunks(payload: Uint8Array): FigChunks {
  const buffer = new ByteBuffer(payload);
  const schemaSize = buffer.readVarUint();
  const schema = buffer.readBytes(schemaSize);
  const dataSize = buffer.readVarUint();
  const data = buffer.readBytes(dataSize);
  return { schema, data };
}

/**
 * Split fig file payload into schema and data chunks.
 */
export function splitFigChunks(
  payload: Uint8Array,
  schemaSize: number
): FigChunks {
  const schema = payload.slice(0, schemaSize);
  const dataStart = schemaSize;
  const dataChunk = payload.slice(dataStart);
  const view = new DataView(dataChunk.buffer, dataChunk.byteOffset, 4);
  const dataSize = view.getUint32(0, true);
  const data = dataChunk.slice(4, 4 + dataSize);
  return { schema, data };
}

/** Options for message decoding */
type DecodeMessageOptions = {
  readonly schema: KiwiSchema;
  readonly buffer: ByteBuffer;
  readonly typeName: string;
  readonly format: KiwiFormat;
};

/** Internal decode with format parameter */
function decodeMessageInternal(options: DecodeMessageOptions): Record<string, unknown> {
  const { schema, buffer, typeName, format } = options;
  const definition = findDefinitionByName(schema, typeName);
  const decodeValue = createValueDecoder(format);

  return decodeDefinition({
    buffer,
    schema,
    definition,
    format,
    decodeValue,
  }) as Record<string, unknown>;
}

/**
 * Decode a Kiwi message using a schema.
 */
export function decodeMessage(
  schema: KiwiSchema,
  data: Uint8Array,
  typeName: string
): Record<string, unknown> {
  return decodeMessageInternal({
    schema,
    buffer: new ByteBuffer(data),
    typeName,
    format: "standard",
  });
}

/**
 * Decode a fig-kiwi message using a schema.
 */
export function decodeFigMessage(
  schema: KiwiSchema,
  data: Uint8Array,
  typeName: string
): Record<string, unknown> {
  return decodeMessageInternal({
    schema,
    buffer: new ByteBuffer(data),
    typeName,
    format: "fig",
  });
}
