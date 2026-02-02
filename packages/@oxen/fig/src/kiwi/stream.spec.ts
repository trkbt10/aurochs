/**
 * @file Streaming encoder/decoder unit tests
 */

import { inflateRaw } from "pako";
import {
  StreamingFigDecoder,
  StreamingFigEncoder,
  streamNodeChanges,
  processNodeChanges,
} from "./stream";
import { decodeFigSchema, splitFigChunks } from "./decoder";
import { parseFigHeader, getPayload } from "../parser";
import {
  createTestSchema,
  createTestNode,
  createSampleFigFile,
  buildTestFigFile,
} from "./test-helpers";

describe("StreamingFigDecoder", () => {
  it("yields node changes one at a time", () => {
    const { file, expectedNodes } = createSampleFigFile();

    const header = parseFigHeader(file);
    const payload = getPayload(file);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const decoder = new StreamingFigDecoder({ schema });
    const nodes: Record<string, unknown>[] = [];

    for (const { node, index, total } of decoder.decodeNodeChanges(msgData)) {
      expect(index).toBe(nodes.length);
      expect(total).toBe(expectedNodes.length);
      nodes.push(node);
    }

    expect(nodes.length).toBe(expectedNodes.length);

    // Check nodes match expected
    for (const [i, expected] of expectedNodes.entries()) {
      expect(nodes[i].name).toBe(expected.name);
      const nodeType = nodes[i].type as { name: string };
      expect(nodeType.name).toBe(expected.type);
    }
  });

  it("decodes header separately", () => {
    const { file } = createSampleFigFile();

    const header = parseFigHeader(file);
    const payload = getPayload(file);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const decoder = new StreamingFigDecoder({ schema });
    const msgHeader = decoder.decodeHeader(msgData);

    expect(msgHeader.type).toBeDefined();
    const msgType = msgHeader.type as { name: string };
    expect(msgType.name).toBe("NODE_CHANGES");
    expect(msgHeader.nodeChangesCount).toBe(5);
  });

  it("handles empty node list", () => {
    const schema = createTestSchema();
    const encoder = new StreamingFigEncoder({ schema });
    encoder.writeHeader({ type: { value: 1 }, sessionID: 0, ackID: 0 });
    const messageData = encoder.finalize();

    const decoder = new StreamingFigDecoder({ schema });
    const nodes: Record<string, unknown>[] = [];

    for (const { node } of decoder.decodeNodeChanges(messageData)) {
      nodes.push(node);
    }

    expect(nodes.length).toBe(0);
  });
});

describe("streamNodeChanges helper", () => {
  it("streams node changes with generator", () => {
    const { file, expectedNodes } = createSampleFigFile();

    const header = parseFigHeader(file);
    const payload = getPayload(file);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const names: string[] = [];
    for (const { node } of streamNodeChanges(schema, msgData)) {
      names.push(node.name as string);
    }

    expect(names).toEqual(expectedNodes.map((n) => n.name));
  });
});

describe("processNodeChanges helper", () => {
  it("processes nodes with callback", () => {
    const { file, expectedNodes } = createSampleFigFile();

    const header = parseFigHeader(file);
    const payload = getPayload(file);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const results = processNodeChanges(schema, msgData, (node, index, total) => {
      return {
        index,
        total,
        name: node.name as string,
        type: (node.type as { name: string }).name,
      };
    });

    expect(results.length).toBe(expectedNodes.length);

    for (const [i, expected] of expectedNodes.entries()) {
      expect(results[i]).toEqual({
        index: i,
        total: expectedNodes.length,
        name: expected.name,
        type: expected.type,
      });
    }
  });
});

describe("StreamingFigEncoder", () => {
  it("encodes nodes one at a time", () => {
    const schema = createTestSchema();
    const encoder = new StreamingFigEncoder({ schema });

    encoder.writeHeader({
      type: { value: 1 },
      sessionID: 0,
    });

    encoder.writeNodeChange(
      createTestNode({ localID: 0, type: 1, name: "Test Node 1" })
    );
    encoder.writeNodeChange(
      createTestNode({ localID: 1, type: 2, name: "Test Node 2" })
    );

    const result = encoder.finalize();
    expect(result.length).toBeGreaterThan(0);

    // Decode and verify
    const decoder = new StreamingFigDecoder({ schema });
    const nodes: Record<string, unknown>[] = [];

    for (const { node } of decoder.decodeNodeChanges(result)) {
      nodes.push(node);
    }

    expect(nodes.length).toBe(2);
    expect(nodes[0].name).toBe("Test Node 1");
    expect(nodes[1].name).toBe("Test Node 2");
  });

  it("encodes with various node types", () => {
    const schema = createTestSchema();
    const encoder = new StreamingFigEncoder({ schema });

    encoder.writeHeader({ type: { value: 1 }, sessionID: 0 });

    const testNodes = [
      createTestNode({ localID: 0, type: 1, name: "Document" }),
      createTestNode({ localID: 1, type: 2, name: "Canvas" }),
      createTestNode({ localID: 2, type: 3, name: "Frame", size: { x: 200, y: 150 } }),
      createTestNode({ localID: 3, type: 6, name: "Text", visible: false }),
      createTestNode({ localID: 4, type: 7, name: "Ellipse", opacity: 0.5 }),
    ];

    for (const node of testNodes) {
      encoder.writeNodeChange(node);
    }

    const result = encoder.finalize();

    // Decode and verify all nodes
    const decoder = new StreamingFigDecoder({ schema });
    const decoded: Record<string, unknown>[] = [];

    for (const { node } of decoder.decodeNodeChanges(result)) {
      decoded.push(node);
    }

    expect(decoded.length).toBe(5);
    expect(decoded[0].name).toBe("Document");
    expect(decoded[2].name).toBe("Frame");
    expect(decoded[3].visible).toBe(false);
    expect(decoded[4].opacity).toBeCloseTo(0.5);
  });

  it("throws when finalized twice", () => {
    const schema = createTestSchema();
    const encoder = new StreamingFigEncoder({ schema });
    encoder.writeHeader({ type: { value: 1 } });
    encoder.finalize();

    expect(() => encoder.finalize()).toThrow("already finalized");
  });

  it("throws when writing node before header", () => {
    const schema = createTestSchema();
    const encoder = new StreamingFigEncoder({ schema });

    expect(() =>
      encoder.writeNodeChange(createTestNode({ localID: 0, type: 1, name: "Test" }))
    ).toThrow("writeHeader");
  });
});

describe("Full fig file roundtrip", () => {
  it("creates and parses a complete fig file", () => {
    const schema = createTestSchema();

    const originalNodes = [
      createTestNode({ localID: 0, type: 1, name: "My Document" }),
      createTestNode({ localID: 1, type: 2, name: "My Page" }),
      createTestNode({ localID: 2, type: 8, name: "Rectangle", size: { x: 50, y: 50 } }),
    ];

    // Encode message
    const encoder = new StreamingFigEncoder({ schema });
    encoder.writeHeader({ type: { value: 1 }, sessionID: 42, ackID: 0 });
    for (const node of originalNodes) {
      encoder.writeNodeChange(node);
    }
    const messageData = encoder.finalize();

    // Build complete fig file
    const figFile = buildTestFigFile(schema, messageData);

    // Parse it back
    const header = parseFigHeader(figFile);
    expect(header.magic).toBe("fig-kiwi");

    const payload = getPayload(figFile);
    const chunks = splitFigChunks(payload, header.payloadSize);

    const decodedSchemaData = inflateRaw(chunks.schema);
    const decodedMsgData = inflateRaw(chunks.data);

    const decodedSchema = decodeFigSchema(decodedSchemaData);
    expect(decodedSchema.definitions.length).toBe(schema.definitions.length);

    // Decode nodes
    const decoder = new StreamingFigDecoder({ schema: decodedSchema });
    const decodedNodes: Record<string, unknown>[] = [];

    for (const { node } of decoder.decodeNodeChanges(decodedMsgData)) {
      decodedNodes.push(node);
    }

    expect(decodedNodes.length).toBe(3);
    expect(decodedNodes[0].name).toBe("My Document");
    expect(decodedNodes[1].name).toBe("My Page");
    expect(decodedNodes[2].name).toBe("Rectangle");
  });
});
