/**
 * @file ByteBuffer unit tests
 */

import { ByteBuffer } from "./byte-buffer";

describe("ByteBuffer", () => {
  describe("VarUint encoding", () => {
    it("encodes and decodes small values", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarUint(0);
      buffer.writeVarUint(1);
      buffer.writeVarUint(127);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarUint()).toBe(0);
      expect(reader.readVarUint()).toBe(1);
      expect(reader.readVarUint()).toBe(127);
    });

    it("encodes and decodes multi-byte values", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarUint(128);
      buffer.writeVarUint(16384);
      buffer.writeVarUint(2097152);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarUint()).toBe(128);
      expect(reader.readVarUint()).toBe(16384);
      expect(reader.readVarUint()).toBe(2097152);
    });

    it("encodes and decodes max 32-bit value", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarUint(0xffffffff);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarUint()).toBe(0xffffffff);
    });
  });

  describe("VarInt encoding (zigzag)", () => {
    it("encodes and decodes positive values", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarInt(0);
      buffer.writeVarInt(1);
      buffer.writeVarInt(100);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarInt()).toBe(0);
      expect(reader.readVarInt()).toBe(1);
      expect(reader.readVarInt()).toBe(100);
    });

    it("encodes and decodes negative values", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarInt(-1);
      buffer.writeVarInt(-100);
      buffer.writeVarInt(-1000000);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarInt()).toBe(-1);
      expect(reader.readVarInt()).toBe(-100);
      expect(reader.readVarInt()).toBe(-1000000);
    });
  });

  describe("VarUint64 encoding", () => {
    it("encodes and decodes 64-bit values", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarUint64(0n);
      buffer.writeVarUint64(1n);
      buffer.writeVarUint64(0xffffffffffffffffn);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarUint64()).toBe(0n);
      expect(reader.readVarUint64()).toBe(1n);
      expect(reader.readVarUint64()).toBe(0xffffffffffffffffn);
    });
  });

  describe("VarInt64 encoding (zigzag)", () => {
    it("encodes and decodes 64-bit signed values", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarInt64(-1n);
      buffer.writeVarInt64(0x7fffffffffffffffn);
      buffer.writeVarInt64(-0x8000000000000000n);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarInt64()).toBe(-1n);
      expect(reader.readVarInt64()).toBe(0x7fffffffffffffffn);
      expect(reader.readVarInt64()).toBe(-0x8000000000000000n);
    });
  });

  describe("String encoding", () => {
    it("encodes and decodes strings", () => {
      const buffer = new ByteBuffer();
      buffer.writeString("hello");
      buffer.writeString("世界");
      buffer.writeString("");

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readString()).toBe("hello");
      expect(reader.readString()).toBe("世界");
      expect(reader.readString()).toBe("");
    });
  });

  describe("Byte array encoding", () => {
    it("encodes and decodes byte arrays", () => {
      const buffer = new ByteBuffer();
      buffer.writeByteArray(new Uint8Array([1, 2, 3, 4, 5]));
      buffer.writeByteArray(new Uint8Array([]));

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readByteArray()).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
      expect(reader.readByteArray()).toEqual(new Uint8Array([]));
    });
  });

  describe("Raw bytes", () => {
    it("reads and writes raw bytes", () => {
      const buffer = new ByteBuffer();
      buffer.writeBytes(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readBytes(4)).toEqual(
        new Uint8Array([0xde, 0xad, 0xbe, 0xef])
      );
    });
  });

  describe("Uint32LE", () => {
    it("reads and writes uint32 little-endian", () => {
      const buffer = new ByteBuffer();
      buffer.writeUint32LE(0x12345678);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readUint32LE()).toBe(0x12345678);
    });
  });

  describe("VarFloat encoding", () => {
    it("encodes and decodes floats", () => {
      const buffer = new ByteBuffer();
      buffer.writeVarFloat(0);
      buffer.writeVarFloat(1.5);
      buffer.writeVarFloat(-3.14159);

      const reader = new ByteBuffer(buffer.toUint8Array());
      expect(reader.readVarFloat()).toBe(0);
      expect(reader.readVarFloat()).toBeCloseTo(1.5);
      expect(reader.readVarFloat()).toBeCloseTo(-3.14159, 4);
    });
  });

  describe("Buffer operations", () => {
    it("tracks offset correctly", () => {
      const buffer = new ByteBuffer();
      expect(buffer.offset).toBe(0);
      expect(buffer.length).toBe(0);

      buffer.writeByte(1);
      buffer.writeByte(2);
      expect(buffer.length).toBe(2);
    });

    it("seek and skip work correctly", () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const buffer = new ByteBuffer(data);

      expect(buffer.readByte()).toBe(1);
      buffer.skip(2);
      expect(buffer.readByte()).toBe(4);

      buffer.seek(0);
      expect(buffer.readByte()).toBe(1);
    });

    it("remaining returns correct value", () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const buffer = new ByteBuffer(data);

      expect(buffer.remaining).toBe(5);
      buffer.readByte();
      expect(buffer.remaining).toBe(4);
    });

    it("slice returns correct portion", () => {
      const buffer = new ByteBuffer();
      buffer.writeBytes(new Uint8Array([1, 2, 3, 4, 5]));

      expect(buffer.slice(1, 4)).toEqual(new Uint8Array([2, 3, 4]));
      expect(buffer.slice(3)).toEqual(new Uint8Array([4, 5]));
    });
  });

  describe("Error handling", () => {
    it("throws on read past end", () => {
      const buffer = new ByteBuffer(new Uint8Array([1]));
      buffer.readByte();
      expect(() => buffer.readByte()).toThrow("Unexpected end of buffer");
    });

    it("throws on seek out of bounds", () => {
      const buffer = new ByteBuffer(new Uint8Array([1, 2, 3]));
      expect(() => buffer.seek(10)).toThrow("Seek out of bounds");
      expect(() => buffer.seek(-1)).toThrow("Seek out of bounds");
    });
  });
});
