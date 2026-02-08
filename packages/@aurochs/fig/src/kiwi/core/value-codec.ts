/**
 * @file Value encoder/decoder factories
 */

import type { KiwiFormat, ValueDecoder, ValueEncoder } from "./types";
import { decodePrimitive, encodePrimitive, encodePrimitiveStrict } from "./primitive-codec";
import { decodeDefinition, encodeDefinition } from "./definition-codec";
import { getPrimitiveTypeName, isPrimitiveTypeId } from "./primitives";
import { getDefinitionByIndex } from "./schema-utils";
import { FigBuildError } from "../../errors";

/**
 * Create a ValueDecoder for the given format.
 */
export function createValueDecoder(format: KiwiFormat): ValueDecoder {
  const decode: ValueDecoder = (options) => {
    const { buffer, schema, typeId } = options;

    if (isPrimitiveTypeId(typeId)) {
      const typeName = getPrimitiveTypeName(typeId)!;
      return decodePrimitive({ buffer, type: typeName, format });
    }

    const definition = getDefinitionByIndex(schema, typeId);
    return decodeDefinition({
      buffer,
      schema,
      definition,
      format,
      decodeValue: decode,
    });
  };
  return decode;
}

/** Options for creating a ValueEncoder */
export type CreateValueEncoderOptions = {
  readonly format: KiwiFormat;
  readonly strict: boolean;
};

/**
 * Create a ValueEncoder for the given format.
 */
export function createValueEncoder(options: CreateValueEncoderOptions): ValueEncoder {
  const { format, strict } = options;

  const encode: ValueEncoder = (encodeOptions) => {
    const { buffer, schema, typeId, value, strict: fieldStrict } = encodeOptions;

    if (isPrimitiveTypeId(typeId)) {
      const typeName = getPrimitiveTypeName(typeId)!;
      if (strict) {
        encodePrimitiveStrict({ buffer, type: typeName, value, format });
      } else {
        encodePrimitive({ buffer, type: typeName, value, format });
      }
      return;
    }

    const definition = getDefinitionByIndex(schema, typeId);

    if (strict && (typeof value !== "object" || value === null)) {
      throw new FigBuildError(
        `Expected object for type "${definition.name}", got ${value === null ? "null" : typeof value}`
      );
    }

    encodeDefinition({
      buffer,
      schema,
      definition,
      message: value as Record<string, unknown>,
      format,
      encodeValue: encode,
      strict: fieldStrict,
    });
  };
  return encode;
}
