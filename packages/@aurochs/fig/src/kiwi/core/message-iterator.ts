/**
 * @file MESSAGE type field iteration
 */

import type { KiwiDefinition, KiwiField } from "../../types";
import type { ByteBuffer } from "../byte-buffer";
import { FigParseError } from "../../errors";

/** Entry yielded by message field iterator */
export type MessageFieldEntry = {
  readonly field: KiwiField;
  readonly fieldIndex: number;
};

/** Options for message field iteration */
export type IterateMessageFieldsOptions = {
  readonly buffer: ByteBuffer;
  readonly definition: KiwiDefinition;
};

/**
 * Iterate over MESSAGE fields until sentinel (0).
 * Throws on unknown field index.
 */
export function* iterateMessageFields(
  options: IterateMessageFieldsOptions
): Generator<MessageFieldEntry> {
  const { buffer, definition } = options;
  const fieldMap = new Map(definition.fields.map((f) => [f.value, f]));

  // eslint-disable-next-line no-restricted-syntax -- Loop until sentinel
  let fieldIndex: number;
  while ((fieldIndex = buffer.readVarUint()) !== 0) {
    const field = fieldMap.get(fieldIndex);
    if (!field) {
      throw new FigParseError(
        `Unknown field index ${fieldIndex} in message type "${definition.name}"`
      );
    }
    yield { field, fieldIndex };
  }
}
