/**
 * @file Primitive value encoding and decoding
 */

import type {
  DecodePrimitiveOptions,
  EncodePrimitiveOptions,
} from "./types";
import { ByteBuffer } from "../byte-buffer";
import { FigBuildError } from "../../errors";

/**
 * Decode a primitive value from buffer.
 */
export function decodePrimitive(options: DecodePrimitiveOptions): unknown {
  const { buffer, type, format } = options;
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
      return format === "standard" ? buffer.readVarFloat() : buffer.readFloat32();
    case "string":
      return format === "standard" ? buffer.readString() : buffer.readNullString();
    case "int64":
      return buffer.readVarInt64();
    case "uint64":
      return buffer.readVarUint64();
  }
}

/**
 * Encode a primitive value to buffer (lenient version).
 */
export function encodePrimitive(options: EncodePrimitiveOptions): void {
  const { buffer, type, value, format } = options;
  switch (type) {
    case "bool":
      buffer.writeByte(value ? 1 : 0);
      break;
    case "byte":
      buffer.writeByte(value as number);
      break;
    case "int":
      buffer.writeVarInt(value as number);
      break;
    case "uint":
      buffer.writeVarUint(value as number);
      break;
    case "float":
      if (format === "standard") {
        buffer.writeVarFloat(value as number);
      } else {
        writeFloat32Fig(buffer, value as number);
      }
      break;
    case "string":
      if (format === "standard") {
        buffer.writeString(value as string);
      } else {
        writeNullString(buffer, value as string);
      }
      break;
    case "int64":
      buffer.writeVarInt64(value as bigint);
      break;
    case "uint64":
      buffer.writeVarUint64(value as bigint);
      break;
  }
}

/**
 * Encode primitive with strict type validation.
 * Throws FigBuildError on type mismatch.
 */
export function encodePrimitiveStrict(options: EncodePrimitiveOptions): void {
  const { buffer, type, value, format } = options;
  switch (type) {
    case "bool":
      if (typeof value !== "boolean" && typeof value !== "number") {
        throw new FigBuildError(
          `Expected boolean for type "bool", got ${typeof value}`
        );
      }
      buffer.writeByte(value ? 1 : 0);
      break;
    case "byte":
      assertNumber(value, "byte");
      buffer.writeByte(value);
      break;
    case "int":
      assertNumber(value, "int");
      buffer.writeVarInt(value);
      break;
    case "uint":
      assertNumber(value, "uint");
      buffer.writeVarUint(value);
      break;
    case "float":
      assertNumber(value, "float");
      if (format === "standard") {
        buffer.writeVarFloat(value);
      } else {
        writeFloat32Fig(buffer, value);
      }
      break;
    case "string":
      if (typeof value !== "string") {
        throw new FigBuildError(
          `Expected string for type "string", got ${typeof value}`
        );
      }
      if (format === "standard") {
        buffer.writeString(value);
      } else {
        writeNullString(buffer, value);
      }
      break;
    case "int64":
      assertBigint(value, "int64");
      buffer.writeVarInt64(value);
      break;
    case "uint64":
      assertBigint(value, "uint64");
      buffer.writeVarUint64(value);
      break;
  }
}

/** Write fig-format float32 with bit rotation */
function writeFloat32Fig(buffer: ByteBuffer, value: number): void {
  if (value === 0) {
    buffer.writeByte(0);
    return;
  }

  const floatBuffer = new ArrayBuffer(4);
  const floatView = new DataView(floatBuffer);
  floatView.setFloat32(0, value, true);
  const bits = floatView.getUint32(0, true);

  // Rotate bits: (bits >> 23) | (bits << 9)
  const rotated = ((bits >>> 23) | (bits << 9)) >>> 0;

  buffer.writeByte(rotated & 0xff);
  buffer.writeByte((rotated >> 8) & 0xff);
  buffer.writeByte((rotated >> 16) & 0xff);
  buffer.writeByte((rotated >> 24) & 0xff);
}

/** Write null-terminated string */
function writeNullString(buffer: ByteBuffer, value: string): void {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  for (const byte of bytes) {
    buffer.writeByte(byte);
  }
  buffer.writeByte(0); // null terminator
}

function assertNumber(value: unknown, type: string): asserts value is number {
  if (typeof value !== "number") {
    throw new FigBuildError(
      `Expected number for type "${type}", got ${typeof value}`
    );
  }
}

function assertBigint(value: unknown, type: string): asserts value is bigint {
  if (typeof value !== "bigint") {
    throw new FigBuildError(
      `Expected bigint for type "${type}", got ${typeof value}`
    );
  }
}
