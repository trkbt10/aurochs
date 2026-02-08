/**
 * @file Schema encoder for fig-kiwi format
 *
 * Encodes Kiwi schema definitions into binary format used by .fig files.
 */

import type { KiwiSchema } from "../../types";
import { ByteBuffer } from "../../kiwi/byte-buffer";

function writeNullString(buffer: ByteBuffer, value: string): void {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  for (const byte of bytes) {
    buffer.writeByte(byte);
  }
  buffer.writeByte(0);
}

/**
 * Encode a Kiwi schema into binary format for .fig files
 */
export function encodeFigSchema(schema: KiwiSchema): Uint8Array {
  const buffer = new ByteBuffer();

  buffer.writeVarUint(schema.definitions.length);

  for (const def of schema.definitions) {
    writeNullString(buffer, def.name);
    buffer.writeByte(def.kind === "ENUM" ? 0 : def.kind === "STRUCT" ? 1 : 2);
    buffer.writeVarUint(def.fields.length);

    for (const field of def.fields) {
      writeNullString(buffer, field.name);
      buffer.writeVarInt(field.typeId);
      buffer.writeByte(field.isArray ? 1 : 0);
      buffer.writeVarUint(field.value);
    }
  }

  return buffer.toUint8Array();
}
