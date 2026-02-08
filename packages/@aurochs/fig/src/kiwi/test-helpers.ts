/**
 * @file Test helpers for creating fig test data without external files
 */

import { deflateRaw } from "pako";
import type { KiwiSchema, KiwiDefinition } from "../types";
import { KIWI_TYPE } from "./schema";
import { ByteBuffer } from "./byte-buffer";
import { StreamingFigEncoder } from "./stream";

// =============================================================================
// Minimal Test Schema
// =============================================================================

/**
 * Create a minimal schema for testing fig encoding/decoding.
 * This schema is sufficient to test all basic functionality.
 */
export function createTestSchema(): KiwiSchema {
  return {
    definitions: [
      // 0: MessageType enum
      createEnumDef("MessageType", [
        ["JOIN_START", 0],
        ["NODE_CHANGES", 1],
        ["USER_CHANGES", 2],
      ]),
      // 1: NodeType enum
      createEnumDef("NodeType", [
        ["NONE", 0],
        ["DOCUMENT", 1],
        ["CANVAS", 2],
        ["FRAME", 3],
        ["GROUP", 4],
        ["VECTOR", 5],
        ["TEXT", 6],
        ["ELLIPSE", 7],
        ["RECTANGLE", 8],
      ]),
      // 2: NodePhase enum
      createEnumDef("NodePhase", [
        ["CREATED", 0],
        ["REMOVED", 1],
      ]),
      // 3: BlendMode enum
      createEnumDef("BlendMode", [
        ["PASS_THROUGH", 0],
        ["NORMAL", 1],
        ["MULTIPLY", 2],
      ]),
      // 4: GUID struct
      {
        name: "GUID",
        kind: "STRUCT",
        fields: [
          { name: "sessionID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 1 },
          { name: "localID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 2 },
        ],
      },
      // 5: Vector struct
      {
        name: "Vector",
        kind: "STRUCT",
        fields: [
          { name: "x", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 1 },
          { name: "y", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 2 },
        ],
      },
      // 6: Matrix struct
      {
        name: "Matrix",
        kind: "STRUCT",
        fields: [
          { name: "m00", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 1 },
          { name: "m01", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 2 },
          { name: "m02", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 3 },
          { name: "m10", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 4 },
          { name: "m11", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 5 },
          { name: "m12", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 6 },
        ],
      },
      // 7: Color struct
      {
        name: "Color",
        kind: "STRUCT",
        fields: [
          { name: "r", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 1 },
          { name: "g", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 2 },
          { name: "b", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 3 },
          { name: "a", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 4 },
        ],
      },
      // 8: NodeChange message
      {
        name: "NodeChange",
        kind: "MESSAGE",
        fields: [
          { name: "guid", type: "GUID", typeId: 4, isArray: false, value: 1 },
          { name: "phase", type: "NodePhase", typeId: 2, isArray: false, value: 2 },
          { name: "type", type: "NodeType", typeId: 1, isArray: false, value: 4 },
          { name: "name", type: "string", typeId: KIWI_TYPE.STRING, isArray: false, value: 5 },
          { name: "visible", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 6 },
          { name: "opacity", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 8 },
          { name: "blendMode", type: "BlendMode", typeId: 3, isArray: false, value: 9 },
          { name: "transform", type: "Matrix", typeId: 6, isArray: false, value: 12 },
          { name: "size", type: "Vector", typeId: 5, isArray: false, value: 11 },
        ],
      },
      // 9: Message (root type)
      {
        name: "Message",
        kind: "MESSAGE",
        fields: [
          { name: "type", type: "MessageType", typeId: 0, isArray: false, value: 1 },
          { name: "sessionID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 2 },
          { name: "ackID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 3 },
          { name: "nodeChanges", type: "NodeChange", typeId: 8, isArray: true, value: 4 },
        ],
      },
    ],
  };
}

/** Helper to create enum definition */
function createEnumDef(name: string, values: [string, number][]): KiwiDefinition {
  return {
    name,
    kind: "ENUM",
    fields: values.map(([fieldName, value]) => ({
      name: fieldName,
      type: "uint",
      typeId: KIWI_TYPE.UINT,
      isArray: false,
      value,
    })),
  };
}

// =============================================================================
// Test Data Builders
// =============================================================================

/** Identity matrix */
export const IDENTITY_MATRIX = {
  m00: 1, m01: 0, m02: 0,
  m10: 0, m11: 1, m12: 0,
};

/** Create a test node change */
export function createTestNode(options: {
  sessionID?: number;
  localID: number;
  type: number;
  name: string;
  visible?: boolean;
  opacity?: number;
  size?: { x: number; y: number };
}): Record<string, unknown> {
  return {
    guid: { sessionID: options.sessionID ?? 0, localID: options.localID },
    phase: { value: 0, name: "CREATED" },
    type: { value: options.type, name: getNodeTypeName(options.type) },
    name: options.name,
    visible: options.visible ?? true,
    opacity: options.opacity ?? 1,
    blendMode: { value: 0, name: "PASS_THROUGH" },
    transform: IDENTITY_MATRIX,
    ...(options.size ? { size: options.size } : {}),
  };
}

/** Get node type name from value */
function getNodeTypeName(value: number): string {
  const names = ["NONE", "DOCUMENT", "CANVAS", "FRAME", "GROUP", "VECTOR", "TEXT", "ELLIPSE", "RECTANGLE"];
  return names[value] ?? "NONE";
}

/** Create a test message with nodes */
export function createTestMessage(nodes: Record<string, unknown>[]): Record<string, unknown> {
  return {
    type: { value: 1, name: "NODE_CHANGES" },
    sessionID: 0,
    ackID: 0,
    nodeChanges: nodes,
  };
}

// =============================================================================
// Schema Encoding (for fig format)
// =============================================================================

/**
 * Encode schema in fig-kiwi format (null-terminated strings).
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

/** Write null-terminated string to buffer */
function writeNullString(buffer: ByteBuffer, value: string): void {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  for (const byte of bytes) {
    buffer.writeByte(byte);
  }
  buffer.writeByte(0);
}

// =============================================================================
// Full Fig File Building
// =============================================================================

/**
 * Build a complete fig file from schema and message data.
 *
 * @param schema - Kiwi schema
 * @param messageData - Uncompressed message data
 * @returns Complete fig file bytes
 */
export function buildTestFigFile(
  schema: KiwiSchema,
  messageData: Uint8Array
): Uint8Array {
  // Encode and compress schema
  const schemaData = encodeFigSchema(schema);
  const compressedSchema = deflateRaw(schemaData);

  // Compress message data
  const compressedMessage = deflateRaw(messageData);

  // Build data chunk with 4-byte LE size prefix
  const dataChunk = new Uint8Array(4 + compressedMessage.length);
  const dataView = new DataView(dataChunk.buffer);
  dataView.setUint32(0, compressedMessage.length, true);
  dataChunk.set(compressedMessage, 4);

  // Build header
  const header = new Uint8Array(16);
  const headerText = new TextEncoder().encode("fig-kiwi0");
  header.set(headerText);
  // payloadSize at offset 12 (4 bytes LE)
  const headerView = new DataView(header.buffer);
  headerView.setUint32(12, compressedSchema.length, true);

  // Combine all parts
  const totalSize = header.length + compressedSchema.length + dataChunk.length;
  const result = new Uint8Array(totalSize);
  result.set(header, 0);
  result.set(compressedSchema, header.length);
  result.set(dataChunk, header.length + compressedSchema.length);

  return result;
}

/**
 * Create a complete test fig file with sample document structure.
 *
 * @returns Complete fig file bytes ready for testing
 */
export function createSampleFigFile(): {
  file: Uint8Array;
  schema: KiwiSchema;
  expectedNodes: { name: string; type: string }[];
} {
  const schema = createTestSchema();

  const nodes = [
    createTestNode({ localID: 0, type: 1, name: "Document" }),
    createTestNode({ localID: 1, type: 2, name: "Page 1" }),
    createTestNode({ localID: 2, type: 3, name: "Frame 1", size: { x: 100, y: 100 } }),
    createTestNode({ localID: 3, type: 6, name: "Hello World" }),
    createTestNode({ localID: 4, type: 5, name: "Vector Shape" }),
  ];

  // Encode message using streaming encoder
  const encoder = new StreamingFigEncoder({ schema });

  encoder.writeHeader({
    type: { value: 1 },
    sessionID: 0,
    ackID: 0,
  });

  for (const node of nodes) {
    encoder.writeNodeChange(node);
  }

  const messageData = encoder.finalize();
  const file = buildTestFigFile(schema, messageData);

  return {
    file,
    schema,
    expectedNodes: [
      { name: "Document", type: "DOCUMENT" },
      { name: "Page 1", type: "CANVAS" },
      { name: "Frame 1", type: "FRAME" },
      { name: "Hello World", type: "TEXT" },
      { name: "Vector Shape", type: "VECTOR" },
    ],
  };
}
