/**
 * @file Unit tests for schema-encoder.ts
 */

import { encodeFigSchema } from "./schema-encoder";
import type { KiwiSchema } from "../../types";

describe("encodeFigSchema", () => {
  it("encodes empty schema", () => {
    const schema: KiwiSchema = {
      definitions: [],
    };

    const result = encodeFigSchema(schema);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(0); // 0 definitions
  });

  it("encodes schema with enum definition", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "TestEnum",
          kind: "ENUM",
          fields: [
            { name: "VALUE_A", type: "int32", typeId: 0, isArray: false, value: 0 },
            { name: "VALUE_B", type: "int32", typeId: 0, isArray: false, value: 1 },
          ],
        },
      ],
    };

    const result = encodeFigSchema(schema);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("encodes schema with struct definition", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "TestStruct",
          kind: "STRUCT",
          fields: [
            { name: "x", type: "float", typeId: 4, isArray: false, value: 1 },
            { name: "y", type: "float", typeId: 4, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const result = encodeFigSchema(schema);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("encodes schema with message definition", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "TestMessage",
          kind: "MESSAGE",
          fields: [
            { name: "id", type: "int32", typeId: 3, isArray: false, value: 1 },
            { name: "items", type: "string", typeId: 5, isArray: true, value: 2 },
          ],
        },
      ],
    };

    const result = encodeFigSchema(schema);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("encodes schema with multiple definitions", () => {
    const schema: KiwiSchema = {
      definitions: [
        {
          name: "Phase",
          kind: "ENUM",
          fields: [
            { name: "CREATED", type: "int32", typeId: 0, isArray: false, value: 0 },
            { name: "DELETED", type: "int32", typeId: 0, isArray: false, value: 1 },
          ],
        },
        {
          name: "Vector2",
          kind: "STRUCT",
          fields: [
            { name: "x", type: "float", typeId: 4, isArray: false, value: 1 },
            { name: "y", type: "float", typeId: 4, isArray: false, value: 2 },
          ],
        },
        {
          name: "Node",
          kind: "MESSAGE",
          fields: [
            { name: "id", type: "int32", typeId: 3, isArray: false, value: 1 },
            { name: "position", type: "Vector2", typeId: 2, isArray: false, value: 2 },
          ],
        },
      ],
    };

    const result = encodeFigSchema(schema);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(3); // 3 definitions
  });
});
