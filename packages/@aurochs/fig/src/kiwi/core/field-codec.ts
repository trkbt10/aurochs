/**
 * @file Field encoding and decoding logic
 */

import type { DecodeFieldOptions, EncodeFieldOptions } from "./types";
import { FigBuildError } from "../../errors";

/**
 * Decode a field value (handles array wrapper).
 */
export function decodeField(options: DecodeFieldOptions): unknown {
  const { buffer, schema, field, format, decodeValue } = options;
  if (field.isArray) {
    const count = buffer.readVarUint();
    const items: unknown[] = [];
    for (const _ of Array(count).keys()) {
      items.push(decodeValue({ buffer, schema, typeId: field.typeId, format }));
    }
    return items;
  }
  return decodeValue({ buffer, schema, typeId: field.typeId, format });
}

/**
 * Encode a field value (handles array wrapper).
 */
export function encodeField(options: EncodeFieldOptions): void {
  const { buffer, schema, field, value, format, encodeValue, strict } = options;
  if (field.isArray) {
    if (strict && !Array.isArray(value)) {
      throw new FigBuildError(
        `Expected array for field "${field.name}", got ${typeof value}`
      );
    }
    const items = value as unknown[];
    buffer.writeVarUint(items?.length ?? 0);
    if (items) {
      for (const item of items) {
        encodeValue({
          buffer,
          schema,
          typeId: field.typeId,
          value: item,
          format,
          strict,
        });
      }
    }
  } else {
    encodeValue({
      buffer,
      schema,
      typeId: field.typeId,
      value,
      format,
      strict,
    });
  }
}
