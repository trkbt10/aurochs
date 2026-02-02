/**
 * @file Binary buffer for reading/writing Kiwi format
 */

import { FigParseError } from "../errors";

/** Text decoder for UTF-8 strings */
const textDecoder = new TextDecoder("utf-8");

/** Text encoder for UTF-8 strings */
const textEncoder = new TextEncoder();

/**
 * Binary buffer for reading/writing Kiwi format.
 * Supports variable-length integer encoding used by Kiwi.
 */
// eslint-disable-next-line no-restricted-syntax -- Class is appropriate for mutable buffer with state
export class ByteBuffer {
  private data: Uint8Array;
  private view: DataView;
  private _offset: number = 0;
  private _length: number;

  constructor(data?: Uint8Array) {
    if (data) {
      this.data = data;
      this._length = data.length;
    } else {
      this.data = new Uint8Array(256);
      this._length = 0;
    }
    this.view = new DataView(
      this.data.buffer,
      this.data.byteOffset,
      this.data.byteLength
    );
  }

  /** Current read/write position */
  get offset(): number {
    return this._offset;
  }

  /** Total length of data */
  get length(): number {
    return this._length;
  }

  /** Remaining bytes to read */
  get remaining(): number {
    return this._length - this._offset;
  }

  /** Seek to a position */
  seek(offset: number): void {
    if (offset < 0 || offset > this._length) {
      throw new FigParseError(`Seek out of bounds: ${offset}`, this._offset);
    }
    this._offset = offset;
  }

  /** Skip bytes */
  skip(count: number): void {
    this.seek(this._offset + count);
  }

  // =========================================================================
  // Reading
  // =========================================================================

  /** Read a single byte */
  readByte(): number {
    if (this._offset >= this._length) {
      throw new FigParseError("Unexpected end of buffer", this._offset);
    }
    return this.data[this._offset++];
  }

  /** Read a byte array (length-prefixed with VarUint) */
  readByteArray(): Uint8Array {
    const length = this.readVarUint();
    if (this._offset + length > this._length) {
      throw new FigParseError(
        `Byte array length ${length} exceeds buffer`,
        this._offset
      );
    }
    const result = this.data.slice(this._offset, this._offset + length);
    this._offset += length;
    return result;
  }

  /** Read raw bytes without length prefix */
  readBytes(count: number): Uint8Array {
    if (this._offset + count > this._length) {
      throw new FigParseError(
        `Cannot read ${count} bytes from buffer`,
        this._offset
      );
    }
    const result = this.data.slice(this._offset, this._offset + count);
    this._offset += count;
    return result;
  }

  /** Read a variable-length signed integer */
  readVarInt(): number {
    const value = this.readVarUint();
    // ZigZag decoding: (value >>> 1) ^ -(value & 1)
    return (value >>> 1) ^ -(value & 1);
  }

  /** Read a variable-length unsigned integer */
  readVarUint(): number {
    // eslint-disable-next-line no-restricted-syntax -- Performance-critical loop
    let result = 0;
    // eslint-disable-next-line no-restricted-syntax -- Performance-critical loop
    let shift = 0;

    while (true) {
      if (this._offset >= this._length) {
        throw new FigParseError(
          "Unexpected end of buffer reading VarUint",
          this._offset
        );
      }

      const byte = this.data[this._offset++];
      result |= (byte & 0x7f) << shift;

      if ((byte & 0x80) === 0) {
        return result >>> 0; // Ensure unsigned
      }

      shift += 7;
      if (shift > 35) {
        throw new FigParseError("VarUint too large", this._offset);
      }
    }
  }

  /** Read a variable-length signed 64-bit integer */
  readVarInt64(): bigint {
    const value = this.readVarUint64();
    // ZigZag decoding for bigint
    return (value >> 1n) ^ -(value & 1n);
  }

  /** Read a variable-length unsigned 64-bit integer */
  readVarUint64(): bigint {
    // eslint-disable-next-line no-restricted-syntax -- Performance-critical loop
    let result = 0n;
    // eslint-disable-next-line no-restricted-syntax -- Performance-critical loop
    let shift = 0n;

    while (true) {
      if (this._offset >= this._length) {
        throw new FigParseError(
          "Unexpected end of buffer reading VarUint64",
          this._offset
        );
      }

      const byte = BigInt(this.data[this._offset++]);
      result |= (byte & 0x7fn) << shift;

      if ((byte & 0x80n) === 0n) {
        return result;
      }

      shift += 7n;
      if (shift > 63n) {
        throw new FigParseError("VarUint64 too large", this._offset);
      }
    }
  }

  /** Read a variable-length float (Kiwi format) */
  readVarFloat(): number {
    // Kiwi stores floats as 32-bit IEEE 754 with byte-swapped variable encoding
    const bits = this.readVarUint();
    // Convert to float32
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, bits, true);
    return view.getFloat32(0, true);
  }

  /** Read a 32-bit float with Kiwi encoding (zero compression + bit rotation) */
  readFloat32(): number {
    if (this._offset >= this._length) {
      throw new FigParseError("Cannot read Float32", this._offset);
    }

    // First byte determines if it's zero or a 4-byte float
    const first = this.data[this._offset];

    // Zero is encoded as a single 0x00 byte
    if (first === 0) {
      this._offset++;
      return 0;
    }

    // Non-zero float needs 4 bytes
    if (this._offset + 4 > this._length) {
      throw new FigParseError("Cannot read Float32", this._offset);
    }

    // Read 4 bytes as uint32 LE
    const bits = this.view.getUint32(this._offset, true);
    this._offset += 4;

    // Kiwi float rotation: (bits << 23) | (bits >>> 9)
    // This reverses the encoding that compresses leading zeros
    const rotated = ((bits << 23) | (bits >>> 9)) >>> 0;

    // Convert to float32
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, rotated, true);
    return view.getFloat32(0, true);
  }

  /** Read a length-prefixed UTF-8 string */
  readString(): string {
    const bytes = this.readByteArray();
    return textDecoder.decode(bytes);
  }

  /** Read a null-terminated UTF-8 string (fig-kiwi format) */
  readNullString(): string {
    const start = this._offset;
    while (this._offset < this._length && this.data[this._offset] !== 0) {
      this._offset++;
    }
    const str = textDecoder.decode(this.data.slice(start, this._offset));
    if (this._offset < this._length) {
      this._offset++; // skip null terminator
    }
    return str;
  }

  /** Read a 32-bit unsigned integer (little-endian) */
  readUint32LE(): number {
    if (this._offset + 4 > this._length) {
      throw new FigParseError("Cannot read Uint32", this._offset);
    }
    const value = this.view.getUint32(this._offset, true);
    this._offset += 4;
    return value;
  }

  // =========================================================================
  // Writing
  // =========================================================================

  /** Ensure capacity for writing */
  private ensureCapacity(additionalBytes: number): void {
    const required = this._length + additionalBytes;
    if (required <= this.data.length) {
      return;
    }

    // eslint-disable-next-line no-restricted-syntax -- Calculating buffer size
    let newSize = this.data.length;
    while (newSize < required) {
      newSize *= 2;
    }

    const newData = new Uint8Array(newSize);
    newData.set(this.data);
    this.data = newData;
    this.view = new DataView(
      this.data.buffer,
      this.data.byteOffset,
      this.data.byteLength
    );
  }

  /** Write a single byte */
  writeByte(value: number): void {
    this.ensureCapacity(1);
    this.data[this._length++] = value & 0xff;
  }

  /** Write a byte array (length-prefixed with VarUint) */
  writeByteArray(value: Uint8Array): void {
    this.writeVarUint(value.length);
    this.writeBytes(value);
  }

  /** Write raw bytes without length prefix */
  writeBytes(value: Uint8Array): void {
    this.ensureCapacity(value.length);
    this.data.set(value, this._length);
    this._length += value.length;
  }

  /** Write a variable-length signed integer */
  writeVarInt(value: number): void {
    // ZigZag encoding: (value << 1) ^ (value >> 31)
    this.writeVarUint((value << 1) ^ (value >> 31));
  }

  /** Write a variable-length unsigned integer */
  writeVarUint(value: number): void {
    value = value >>> 0; // Ensure unsigned

    while (value >= 0x80) {
      this.writeByte((value & 0x7f) | 0x80);
      value >>>= 7;
    }
    this.writeByte(value);
  }

  /** Write a variable-length signed 64-bit integer */
  writeVarInt64(value: bigint): void {
    // ZigZag encoding for bigint
    this.writeVarUint64((value << 1n) ^ (value >> 63n));
  }

  /** Write a variable-length unsigned 64-bit integer */
  writeVarUint64(value: bigint): void {
    while (value >= 0x80n) {
      this.writeByte(Number((value & 0x7fn) | 0x80n));
      value >>= 7n;
    }
    this.writeByte(Number(value));
  }

  /** Write a variable-length float (Kiwi format) */
  writeVarFloat(value: number): void {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, value, true);
    const bits = view.getUint32(0, true);
    this.writeVarUint(bits);
  }

  /** Write a length-prefixed UTF-8 string */
  writeString(value: string): void {
    const bytes = textEncoder.encode(value);
    this.writeByteArray(bytes);
  }

  /** Write a 32-bit unsigned integer (little-endian) */
  writeUint32LE(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this._length, value, true);
    this._length += 4;
  }

  // =========================================================================
  // Utility
  // =========================================================================

  /** Get the buffer contents as Uint8Array */
  toUint8Array(): Uint8Array {
    return this.data.slice(0, this._length);
  }

  /** Get a slice of the buffer */
  slice(start: number, end?: number): Uint8Array {
    return this.data.slice(start, end ?? this._length);
  }
}
