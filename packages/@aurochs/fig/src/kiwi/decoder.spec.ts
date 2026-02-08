/**
 * @file Kiwi decoder unit tests
 */

import { decodeSchema, decodeMessage, splitChunks } from "./decoder";
import { encodeSchema, encodeMessage, combineChunks } from "./encoder";
import type { KiwiSchema } from "../types";
import { KIWI_TYPE } from "./schema";

describe("decodeSchema / encodeSchema roundtrip", () => {
  it("handles simple schema", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "Point",
          kind: "STRUCT",
          fields: [
            { name: "x", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 1 },
            { name: "y", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const encoded = encodeSchema(schema);
    const decoded = decodeSchema(encoded);

    expect(decoded.definitions.length).toBe(1);
    expect(decoded.definitions[0].name).toBe("Point");
    expect(decoded.definitions[0].kind).toBe("STRUCT");
    expect(decoded.definitions[0].fields.length).toBe(2);
    expect(decoded.definitions[0].fields[0].name).toBe("x");
    expect(decoded.definitions[0].fields[0].type).toBe("float");
  });

  it("handles message with arrays", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "Container",
          kind: "MESSAGE",
          fields: [
            { name: "items", type: "string", typeId: KIWI_TYPE.STRING, isArray: true, value: 1 },
            { name: "count", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const encoded = encodeSchema(schema);
    const decoded = decodeSchema(encoded);

    expect(decoded.definitions[0].fields[0].isArray).toBe(true);
    expect(decoded.definitions[0].fields[1].isArray).toBe(false);
  });

  it("handles enum", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "Color",
          kind: "ENUM",
          fields: [
            { name: "RED", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 0 },
            { name: "GREEN", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 1 },
            { name: "BLUE", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const encoded = encodeSchema(schema);
    const decoded = decodeSchema(encoded);

    expect(decoded.definitions[0].kind).toBe("ENUM");
    expect(decoded.definitions[0].fields.length).toBe(3);
  });

  it("handles nested types", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "Point",
          kind: "STRUCT",
          fields: [
            { name: "x", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 1 },
            { name: "y", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 2 },
          ],
        },
        {
          name: "Line",
          kind: "STRUCT",
          fields: [
            { name: "start", type: "Point", typeId: 0, isArray: false, value: 1 },
            { name: "end", type: "Point", typeId: 0, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const encoded = encodeSchema(schema);
    const decoded = decodeSchema(encoded);

    expect(decoded.definitions.length).toBe(2);
    expect(decoded.definitions[1].fields[0].type).toBe("Point");
  });
});

describe("decodeMessage / encodeMessage roundtrip", () => {
  const pointSchema: KiwiSchema = {
    definitions: [
      {
        name: "Point",
        kind: "STRUCT",
        fields: [
          { name: "x", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 1 },
          { name: "y", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 2 },
        ],
      },
    ],
  };

  it("handles struct", () => {
    const message = { x: 1.5, y: 2.5 };
    const encoded = encodeMessage(pointSchema, message, "Point");
    const decoded = decodeMessage(pointSchema, encoded, "Point");

    expect(decoded.x).toBeCloseTo(1.5);
    expect(decoded.y).toBeCloseTo(2.5);
  });

  it("handles message type", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "Config",
          kind: "MESSAGE",
          fields: [
            { name: "name", type: "string", typeId: KIWI_TYPE.STRING, isArray: false, value: 1 },
            { name: "count", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const message = { name: "test", count: 42 };
    const encoded = encodeMessage(schema, message, "Config");
    const decoded = decodeMessage(schema, encoded, "Config");

    expect(decoded.name).toBe("test");
    expect(decoded.count).toBe(42);
  });

  it("handles arrays", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "List",
          kind: "STRUCT",
          fields: [
            { name: "items", type: "uint", typeId: KIWI_TYPE.UINT, isArray: true, value: 1 },
          ],
        },
      ],
    };

    const message = { items: [1, 2, 3, 4, 5] };
    const encoded = encodeMessage(schema, message, "List");
    const decoded = decodeMessage(schema, encoded, "List");

    expect(decoded.items).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles nested structs", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "Point",
          kind: "STRUCT",
          fields: [
            { name: "x", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 1 },
            { name: "y", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 2 },
          ],
        },
        {
          name: "Line",
          kind: "STRUCT",
          fields: [
            { name: "start", type: "Point", typeId: 0, isArray: false, value: 1 },
            { name: "end", type: "Point", typeId: 0, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const message = {
      start: { x: 0, y: 0 },
      end: { x: 10, y: 10 },
    };
    const encoded = encodeMessage(schema, message, "Line");
    const decoded = decodeMessage(schema, encoded, "Line");

    const start = decoded.start as Record<string, unknown>;
    const end = decoded.end as Record<string, unknown>;
    expect(start.x).toBeCloseTo(0);
    expect(start.y).toBeCloseTo(0);
    expect(end.x).toBeCloseTo(10);
    expect(end.y).toBeCloseTo(10);
  });
});

describe("splitChunks / combineChunks", () => {
  it("splits and combines chunks", () => {
    const schemaData = new Uint8Array([1, 2, 3]);
    const messageData = new Uint8Array([4, 5, 6, 7]);

    const combined = combineChunks(schemaData, messageData);
    const { schema, data } = splitChunks(combined);

    expect(schema).toEqual(schemaData);
    expect(data).toEqual(messageData);
  });

  it("handles larger chunks", () => {
    const schemaData = new Uint8Array(1000);
    const messageData = new Uint8Array(2000);
    for (const [i] of schemaData.entries()) {
      schemaData[i] = i % 256;
    }
    for (const [i] of messageData.entries()) {
      messageData[i] = (i * 2) % 256;
    }

    const combined = combineChunks(schemaData, messageData);
    const { schema, data } = splitChunks(combined);

    expect(schema).toEqual(schemaData);
    expect(data).toEqual(messageData);
  });
});
