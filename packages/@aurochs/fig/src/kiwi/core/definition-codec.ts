/**
 * @file Definition encoding and decoding logic
 */

import type { DecodeDefinitionOptions, EncodeDefinitionOptions } from "./types";
import { decodeField, encodeField } from "./field-codec";
import { extractEnumValue, extractEnumValueStrict } from "./enum-utils";
import { iterateMessageFields } from "./message-iterator";

/**
 * Decode a definition (STRUCT/MESSAGE/ENUM).
 */
export function decodeDefinition(options: DecodeDefinitionOptions): unknown {
  const { buffer, schema, definition, format, decodeValue } = options;
  const result: Record<string, unknown> = {};

  if (definition.kind === "STRUCT") {
    for (const field of definition.fields) {
      result[field.name] = decodeField({
        buffer,
        schema,
        field,
        format,
        decodeValue,
      });
    }
  } else if (definition.kind === "MESSAGE") {
    for (const { field } of iterateMessageFields({ buffer, definition })) {
      result[field.name] = decodeField({
        buffer,
        schema,
        field,
        format,
        decodeValue,
      });
    }
  } else if (definition.kind === "ENUM") {
    const value = buffer.readVarUint();
    const field = definition.fields.find((f) => f.value === value);
    return { value, name: field?.name ?? `unknown(${value})` };
  }

  return result;
}

/**
 * Encode a definition (STRUCT/MESSAGE/ENUM).
 */
export function encodeDefinition(options: EncodeDefinitionOptions): void {
  const { buffer, schema, definition, message, format, encodeValue, strict } =
    options;

  if (definition.kind === "STRUCT") {
    for (const field of definition.fields) {
      const value = message[field.name];
      encodeField({ buffer, schema, field, value, format, encodeValue, strict });
    }
  } else if (definition.kind === "MESSAGE") {
    for (const field of definition.fields) {
      const value = message[field.name];
      if (value !== undefined && value !== null) {
        buffer.writeVarUint(field.value);
        encodeField({
          buffer,
          schema,
          field,
          value,
          format,
          encodeValue,
          strict,
        });
      }
    }
    buffer.writeVarUint(0); // End marker
  } else if (definition.kind === "ENUM") {
    const enumValue = strict ? extractEnumValueStrict(message) : extractEnumValue(message);
    buffer.writeVarUint(enumValue);
  }
}
