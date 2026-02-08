/**
 * @file Shared internal types for kiwi codec operations
 */

import type { KiwiSchema, KiwiDefinition, KiwiField } from "../../types";
import type { ByteBuffer } from "../byte-buffer";

/** Primitive type name literals */
export type PrimitiveTypeName =
  | "bool"
  | "byte"
  | "int"
  | "uint"
  | "float"
  | "string"
  | "int64"
  | "uint64";

/** Format variant for encoding/decoding */
export type KiwiFormat = "standard" | "fig";

/** Buffer read operations interface */
export type BufferReader = {
  readByte(): number;
  readVarInt(): number;
  readVarUint(): number;
  readVarInt64(): bigint;
  readVarUint64(): bigint;
  readVarFloat(): number;
  readFloat32(): number;
  readString(): string;
  readNullString(): string;
};

/** Buffer write operations interface */
export type BufferWriter = {
  writeByte(value: number): void;
  writeVarInt(value: number): void;
  writeVarUint(value: number): void;
  writeVarInt64(value: bigint): void;
  writeVarUint64(value: bigint): void;
  writeVarFloat(value: number): void;
  writeString(value: string): void;
};

/** Options for value decoding */
export type DecodeValueOptions = {
  readonly buffer: ByteBuffer;
  readonly schema: KiwiSchema;
  readonly typeId: number;
  readonly format: KiwiFormat;
};

/** Options for value encoding */
export type EncodeValueOptions = {
  readonly buffer: ByteBuffer;
  readonly schema: KiwiSchema;
  readonly typeId: number;
  readonly value: unknown;
  readonly format: KiwiFormat;
  readonly strict: boolean;
};

/** Value decoder function type */
export type ValueDecoder = (options: DecodeValueOptions) => unknown;

/** Value encoder function type */
export type ValueEncoder = (options: EncodeValueOptions) => void;

/** Options for field decoding */
export type DecodeFieldOptions = {
  readonly buffer: ByteBuffer;
  readonly schema: KiwiSchema;
  readonly field: KiwiField;
  readonly format: KiwiFormat;
  readonly decodeValue: ValueDecoder;
};

/** Options for field encoding */
export type EncodeFieldOptions = {
  readonly buffer: ByteBuffer;
  readonly schema: KiwiSchema;
  readonly field: KiwiField;
  readonly value: unknown;
  readonly format: KiwiFormat;
  readonly encodeValue: ValueEncoder;
  readonly strict: boolean;
};

/** Options for definition decoding */
export type DecodeDefinitionOptions = {
  readonly buffer: ByteBuffer;
  readonly schema: KiwiSchema;
  readonly definition: KiwiDefinition;
  readonly format: KiwiFormat;
  readonly decodeValue: ValueDecoder;
};

/** Options for definition encoding */
export type EncodeDefinitionOptions = {
  readonly buffer: ByteBuffer;
  readonly schema: KiwiSchema;
  readonly definition: KiwiDefinition;
  readonly message: Record<string, unknown>;
  readonly format: KiwiFormat;
  readonly encodeValue: ValueEncoder;
  readonly strict: boolean;
};

/** Options for primitive decoding */
export type DecodePrimitiveOptions = {
  readonly buffer: BufferReader;
  readonly type: PrimitiveTypeName;
  readonly format: KiwiFormat;
};

/** Options for primitive encoding */
export type EncodePrimitiveOptions = {
  readonly buffer: ByteBuffer;
  readonly type: PrimitiveTypeName;
  readonly value: unknown;
  readonly format: KiwiFormat;
};
