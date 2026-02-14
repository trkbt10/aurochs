/**
 * @file CFB Builder tests
 */

import { describe, it, expect } from "bun:test";
import { createCfbBuilder } from "./cfb-builder";
import { openCfb } from "../index";

describe("createCfbBuilder", () => {
  it("creates empty CFB with just root entry", () => {
    const builder = createCfbBuilder();
    const bytes = builder.build();

    // Should be at least header + one sector
    expect(bytes.length).toBeGreaterThanOrEqual(512 + 512);

    // Should be valid CFB
    const cfb = openCfb(bytes);
    expect(cfb.directory[0].name).toBe("Root Entry");
    expect(cfb.directory[0].type).toBe("root");
  });

  it("round-trips a single stream in root", () => {
    const builder = createCfbBuilder();
    const testData = new TextEncoder().encode("Hello, CFB!");
    builder.addStream(["TestStream"], testData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    const streamData = cfb.readStream(["TestStream"]);
    expect(streamData).toEqual(testData);
  });

  it("round-trips multiple streams in root", () => {
    const builder = createCfbBuilder();
    const data1 = new TextEncoder().encode("Stream 1 content");
    const data2 = new TextEncoder().encode("Stream 2 content");
    const data3 = new TextEncoder().encode("Stream 3 content");

    builder.addStream(["Alpha"], data1);
    builder.addStream(["Beta"], data2);
    builder.addStream(["Gamma"], data3);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["Alpha"])).toEqual(data1);
    expect(cfb.readStream(["Beta"])).toEqual(data2);
    expect(cfb.readStream(["Gamma"])).toEqual(data3);
  });

  it("round-trips nested storage structure", () => {
    const builder = createCfbBuilder();
    const dirData = new TextEncoder().encode("dir stream data");
    const moduleData = new TextEncoder().encode("module source code");

    builder.addStream(["VBA", "dir"], dirData);
    builder.addStream(["VBA", "Module1"], moduleData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["VBA", "dir"])).toEqual(dirData);
    expect(cfb.readStream(["VBA", "Module1"])).toEqual(moduleData);

    // Verify storage exists
    const entries = cfb.list();
    const vbaEntry = entries.find((e) => e.name === "VBA");
    expect(vbaEntry).toBeDefined();
    expect(vbaEntry?.type).toBe("storage");
  });

  it("round-trips deeply nested structure", () => {
    const builder = createCfbBuilder();
    const data = new TextEncoder().encode("Deep data");

    builder.addStream(["Level1", "Level2", "Level3", "DeepStream"], data);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["Level1", "Level2", "Level3", "DeepStream"])).toEqual(data);
  });

  it("round-trips mini stream (< 4096 bytes)", () => {
    const builder = createCfbBuilder();
    // Small data goes to mini stream
    const smallData = new Uint8Array(100).fill(0x42);
    builder.addStream(["SmallStream"], smallData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["SmallStream"])).toEqual(smallData);
  });

  it("round-trips regular stream (>= 4096 bytes)", () => {
    const builder = createCfbBuilder();
    // Large data goes to regular sectors
    const largeData = new Uint8Array(5000).fill(0x43);
    builder.addStream(["LargeStream"], largeData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["LargeStream"])).toEqual(largeData);
  });

  it("round-trips mixed mini and regular streams", () => {
    const builder = createCfbBuilder();
    const smallData = new Uint8Array(100).fill(0x41);
    const largeData = new Uint8Array(5000).fill(0x42);

    builder.addStream(["Small"], smallData);
    builder.addStream(["Large"], largeData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["Small"])).toEqual(smallData);
    expect(cfb.readStream(["Large"])).toEqual(largeData);
  });

  it("handles empty stream", () => {
    const builder = createCfbBuilder();
    const emptyData = new Uint8Array(0);
    builder.addStream(["Empty"], emptyData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    // Empty stream exists but may not be readable with some CFB implementations
    // Check that the entry exists with correct size
    const entry = cfb.directory.find((e) => e.name === "Empty");
    expect(entry).toBeDefined();
    expect(entry?.streamSize).toBe(0n);
  });

  it("handles stream with exactly mini stream cutoff size", () => {
    const builder = createCfbBuilder();
    // Exactly 4096 bytes goes to regular sectors
    const exactData = new Uint8Array(4096).fill(0x44);
    builder.addStream(["Exact"], exactData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["Exact"])).toEqual(exactData);
  });

  it("handles case-insensitive stream names", () => {
    const builder = createCfbBuilder();
    const data = new TextEncoder().encode("test data");
    builder.addStream(["TestStream"], data);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    // Should be readable with different case
    expect(cfb.readStream(["TESTSTREAM"])).toEqual(data);
    expect(cfb.readStream(["teststream"])).toEqual(data);
  });

  it("creates explicit storage", () => {
    const builder = createCfbBuilder();
    builder.addStorage(["EmptyStorage"]);
    builder.addStream(["EmptyStorage", "File"], new TextEncoder().encode("data"));

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    const entries = cfb.list();
    const storageEntry = entries.find((e) => e.name === "EmptyStorage");
    expect(storageEntry).toBeDefined();
    expect(storageEntry?.type).toBe("storage");
  });

  it("replaces existing stream data", () => {
    const builder = createCfbBuilder();
    const data1 = new TextEncoder().encode("original");
    const data2 = new TextEncoder().encode("replaced");

    builder.addStream(["Test"], data1);
    builder.addStream(["Test"], data2);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["Test"])).toEqual(data2);
  });

  it("throws when replacing storage with stream", () => {
    const builder = createCfbBuilder();
    builder.addStorage(["Folder"]);
    builder.addStream(["Folder", "File"], new TextEncoder().encode("data"));

    expect(() => {
      builder.addStream(["Folder"], new TextEncoder().encode("should fail"));
    }).toThrow();
  });

  it("round-trips VBA project structure", () => {
    const builder = createCfbBuilder();

    // Typical vbaProject.bin structure
    const projectData = new TextEncoder().encode('ID="{GUID}"\nName="VBAProject"\n');
    const dirData = new Uint8Array(200).fill(0x01); // Simulated compressed dir
    const vbaProjectData = new Uint8Array(50).fill(0x02);
    const module1Data = new Uint8Array(1000).fill(0x03);
    const thisDocumentData = new Uint8Array(500).fill(0x04);

    builder.addStream(["PROJECT"], projectData);
    builder.addStream(["VBA", "dir"], dirData);
    builder.addStream(["VBA", "_VBA_PROJECT"], vbaProjectData);
    builder.addStream(["VBA", "Module1"], module1Data);
    builder.addStream(["VBA", "ThisDocument"], thisDocumentData);

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    expect(cfb.readStream(["PROJECT"])).toEqual(projectData);
    expect(cfb.readStream(["VBA", "dir"])).toEqual(dirData);
    expect(cfb.readStream(["VBA", "_VBA_PROJECT"])).toEqual(vbaProjectData);
    expect(cfb.readStream(["VBA", "Module1"])).toEqual(module1Data);
    expect(cfb.readStream(["VBA", "ThisDocument"])).toEqual(thisDocumentData);
  });

  it("handles many streams", () => {
    const builder = createCfbBuilder();
    const streams = new Map<string, Uint8Array>();

    for (let i = 0; i < 20; i++) {
      const name = `Stream${i.toString().padStart(2, "0")}`;
      const data = new Uint8Array(50 + i * 10).fill(i);
      streams.set(name, data);
      builder.addStream([name], data);
    }

    const bytes = builder.build();
    const cfb = openCfb(bytes);

    for (const [name, expectedData] of streams) {
      expect(cfb.readStream([name])).toEqual(expectedData);
    }
  });
});
