/**
 * @file Schema encoding and decoding
 */

import type { KiwiSchema, KiwiDefinition, KiwiField } from "../../types";
import type { KiwiFormat } from "./types";
import { ByteBuffer } from "../byte-buffer";
import { resolveTypeName, resolveKindName } from "../schema";

/** Options for schema decoding */
export type DecodeSchemaOptions = {
  readonly buffer: ByteBuffer;
  readonly format: KiwiFormat;
};

/**
 * Decode a Kiwi schema from buffer.
 */
/** Get string reader for format */
function getStringReader(buffer: ByteBuffer, format: KiwiFormat): () => string {
  if (format === "standard") {
    return () => buffer.readString();
  }
  return () => buffer.readNullString();
}

export function decodeSchemaFromBuffer(options: DecodeSchemaOptions): KiwiSchema {
  const { buffer, format } = options;
  const readString = getStringReader(buffer, format);

  const definitionCount = buffer.readVarUint();
  const definitions: KiwiDefinition[] = [];

  for (const _ of Array(definitionCount).keys()) {
    const name = readString();
    const kind = resolveKindName(buffer.readByte());
    const fieldCount = buffer.readVarUint();
    const fields: KiwiField[] = [];

    for (const __ of Array(fieldCount).keys()) {
      const fieldName = readString();
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
