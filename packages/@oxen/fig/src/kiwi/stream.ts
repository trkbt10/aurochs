/**
 * @file Streaming Kiwi encoder/decoder for fig files
 */

import type { KiwiSchema, KiwiField } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { FigParseError } from "../errors";

// Import from core
import { decodeField, encodeField } from "./core/field-codec";
import { decodeDefinition, encodeDefinition } from "./core/definition-codec";
import { iterateMessageFields } from "./core/message-iterator";
import { createValueDecoder, createValueEncoder } from "./core/value-codec";
import { findDefinitionByName } from "./core/schema-utils";
import type { ValueDecoder, ValueEncoder } from "./core/types";

// =============================================================================
// Streaming Decoder
// =============================================================================

/** Decoded node change with metadata */
export type DecodedNodeChange = {
  readonly index: number;
  readonly total: number;
  readonly node: Record<string, unknown>;
};

/** Streaming decoder options */
export type StreamingDecoderOptions = {
  readonly schema: KiwiSchema;
  readonly rootType?: string;
  readonly nodeChangeType?: string;
};

/**
 * Streaming decoder for fig message data.
 */
// eslint-disable-next-line no-restricted-syntax -- Class appropriate for stateful decoder
export class StreamingFigDecoder {
  private readonly schema: KiwiSchema;
  private readonly rootType: string;
  private readonly nodeChangeType: string;
  private buffer: ByteBuffer | null = null;
  private readonly valueDecoder: ValueDecoder;

  constructor(options: StreamingDecoderOptions) {
    this.schema = options.schema;
    this.rootType = options.rootType ?? "Message";
    this.nodeChangeType = options.nodeChangeType ?? "NodeChange";
    this.valueDecoder = createValueDecoder("fig");
  }

  /**
   * Decode and yield node changes one at a time.
   */
  *decodeNodeChanges(data: Uint8Array): Generator<DecodedNodeChange> {
    this.buffer = new ByteBuffer(data);

    const rootDef = findDefinitionByName(this.schema, this.rootType);
    const nodeChangesField = rootDef.fields.find(
      (f) => f.name === "nodeChanges"
    );
    if (!nodeChangesField) {
      throw new FigParseError("No nodeChanges field in Message type");
    }

    for (const { field } of iterateMessageFields({
      buffer: this.buffer,
      definition: rootDef,
    })) {
      if (field.name === "nodeChanges") {
        const count = this.buffer.readVarUint();
        const nodeChangeDef = findDefinitionByName(
          this.schema,
          this.nodeChangeType
        );

        for (const i of Array(count).keys()) {
          const node = decodeDefinition({
            buffer: this.buffer,
            schema: this.schema,
            definition: nodeChangeDef,
            format: "fig",
            decodeValue: this.valueDecoder,
          }) as Record<string, unknown>;
          yield { index: i, total: count, node };
        }
        continue;
      }

      decodeField({
        buffer: this.buffer,
        schema: this.schema,
        field,
        format: "fig",
        decodeValue: this.valueDecoder,
      });
    }
  }

  /**
   * Decode the full message header (non-nodeChanges fields).
   */
  decodeHeader(data: Uint8Array): Record<string, unknown> {
    this.buffer = new ByteBuffer(data);

    const rootDef = findDefinitionByName(this.schema, this.rootType);
    const result: Record<string, unknown> = {};

    for (const { field } of iterateMessageFields({
      buffer: this.buffer,
      definition: rootDef,
    })) {
      if (field.name === "nodeChanges") {
        const count = this.buffer.readVarUint();
        result.nodeChangesCount = count;
        break;
      }

      result[field.name] = decodeField({
        buffer: this.buffer,
        schema: this.schema,
        field,
        format: "fig",
        decodeValue: this.valueDecoder,
      });
    }

    return result;
  }

  get offset(): number {
    return this.buffer?.offset ?? 0;
  }
}

// =============================================================================
// Streaming Encoder
// =============================================================================

/** Streaming encoder options */
export type StreamingEncoderOptions = {
  readonly schema: KiwiSchema;
  readonly rootType?: string;
  readonly nodeChangeType?: string;
};

/** Message header for streaming encoding */
export type MessageHeader = {
  readonly type?: { value: number };
  readonly sessionID?: number;
  readonly ackID?: number;
  readonly [key: string]: unknown;
};

/**
 * Streaming encoder for fig message data.
 */
// eslint-disable-next-line no-restricted-syntax -- Class appropriate for stateful encoder
export class StreamingFigEncoder {
  private readonly schema: KiwiSchema;
  private readonly rootType: string;
  private readonly nodeChangeType: string;
  private buffer: ByteBuffer;
  private nodeCountOffset: number = -1;
  private nodeCount: number = 0;
  private finalized: boolean = false;
  private readonly valueEncoder: ValueEncoder;
  // Fields to write after nodeChanges (e.g., blobs)
  private deferredFields: Array<{ field: KiwiField; value: unknown }> = [];

  constructor(options: StreamingEncoderOptions) {
    this.schema = options.schema;
    this.rootType = options.rootType ?? "Message";
    this.nodeChangeType = options.nodeChangeType ?? "NodeChange";
    this.buffer = new ByteBuffer();
    this.valueEncoder = createValueEncoder({ format: "fig", strict: true });
  }

  /**
   * Write the message header.
   * Fields that come after nodeChanges (field value > nodeChanges field value) are deferred.
   */
  writeHeader(header: MessageHeader): void {
    const rootDef = findDefinitionByName(this.schema, this.rootType);

    // Find nodeChanges field value to determine ordering
    const nodeChangesField = rootDef.fields.find(f => f.name === "nodeChanges");
    const nodeChangesFieldValue = nodeChangesField?.value ?? 4;

    for (const field of rootDef.fields) {
      if (field.name === "nodeChanges") {
        this.buffer.writeVarUint(field.value);
        this.nodeCountOffset = this.buffer.length;
        this.buffer.writeVarUint(0);
        continue;
      }

      const value = header[field.name];
      if (value !== undefined && value !== null) {
        // Fields with higher field value than nodeChanges should be written after nodeChanges
        if (field.value > nodeChangesFieldValue) {
          this.deferredFields.push({ field, value });
        } else {
          this.buffer.writeVarUint(field.value);
          encodeField({
            buffer: this.buffer,
            schema: this.schema,
            field,
            value,
            format: "fig",
            encodeValue: this.valueEncoder,
            strict: true,
          });
        }
      }
    }
  }

  /**
   * Write a single node change.
   */
  writeNodeChange(node: Record<string, unknown>): void {
    if (this.nodeCountOffset < 0) {
      throw new FigParseError("Must call writeHeader before writeNodeChange");
    }
    if (this.finalized) {
      throw new FigParseError("Encoder already finalized");
    }

    const nodeChangeDef = findDefinitionByName(this.schema, this.nodeChangeType);

    encodeDefinition({
      buffer: this.buffer,
      schema: this.schema,
      definition: nodeChangeDef,
      message: node,
      format: "fig",
      encodeValue: this.valueEncoder,
      strict: true,
    });
    this.nodeCount++;
  }

  /**
   * Finalize encoding and return the result.
   */
  finalize(): Uint8Array {
    if (this.finalized) {
      throw new FigParseError("Encoder already finalized");
    }
    this.finalized = true;

    // Write deferred fields (e.g., blobs) that come after nodeChanges
    for (const { field, value } of this.deferredFields) {
      this.buffer.writeVarUint(field.value);
      encodeField({
        buffer: this.buffer,
        schema: this.schema,
        field,
        value,
        format: "fig",
        encodeValue: this.valueEncoder,
        strict: true,
      });
    }

    // Write terminating 0
    this.buffer.writeVarUint(0);

    // Get the current buffer content
    const bufferContent = this.buffer.toUint8Array();

    // If we need to patch the node count
    if (this.nodeCountOffset >= 0) {
      const countBuffer = new ByteBuffer();
      countBuffer.writeVarUint(this.nodeCount);
      const countBytes = countBuffer.toUint8Array();

      if (countBytes.length === 1) {
        // Simple case: count fits in 1 byte
        bufferContent[this.nodeCountOffset] = countBytes[0];
        return bufferContent;
      } else {
        // Multi-byte case: need to rebuild the buffer with proper count
        // This is more complex because VarUint size changes
        const beforeCount = bufferContent.slice(0, this.nodeCountOffset);
        const afterCount = bufferContent.slice(this.nodeCountOffset + 1); // Skip the placeholder byte

        const result = new Uint8Array(beforeCount.length + countBytes.length + afterCount.length);
        result.set(beforeCount, 0);
        result.set(countBytes, beforeCount.length);
        result.set(afterCount, beforeCount.length + countBytes.length);
        return result;
      }
    }

    return bufferContent;
  }

  /**
   * Create an async generator for writing nodes from an async source.
   */
  async *encodeAsync(
    header: MessageHeader,
    nodes: AsyncIterable<Record<string, unknown>>
  ): AsyncGenerator<{ index: number; node: Record<string, unknown> }> {
    this.writeHeader(header);

    // eslint-disable-next-line no-restricted-syntax -- Async iteration
    let index = 0;
    for await (const node of nodes) {
      this.writeNodeChange(node);
      yield { index, node };
      index++;
    }
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a streaming decoder and yield node changes.
 */
export function* streamNodeChanges(
  schema: KiwiSchema,
  data: Uint8Array
): Generator<DecodedNodeChange> {
  const decoder = new StreamingFigDecoder({ schema });
  yield* decoder.decodeNodeChanges(data);
}

/**
 * Process node changes with a callback, returning results.
 */
export function processNodeChanges<T>(
  schema: KiwiSchema,
  data: Uint8Array,
  processor: (node: Record<string, unknown>, index: number, total: number) => T
): T[] {
  const results: T[] = [];
  for (const { node, index, total } of streamNodeChanges(schema, data)) {
    results.push(processor(node, index, total));
  }
  return results;
}
