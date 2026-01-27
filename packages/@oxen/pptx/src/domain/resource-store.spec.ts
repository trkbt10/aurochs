import { describe, expect, it } from "vitest";
import {
  createResourceStore,
  createEmptyResourceStore,
  type ResolvedResourceEntry,
} from "./resource-store";

describe("createResourceStore", () => {
  it("should create an empty store", () => {
    const store = createResourceStore();
    expect(store.has("rId1")).toBe(false);
    expect(store.get("rId1")).toBeUndefined();
  });

  it("should set and get a resource", () => {
    const store = createResourceStore();
    const entry: ResolvedResourceEntry = {
      kind: "image",
      source: "parsed",
      data: new ArrayBuffer(8),
      mimeType: "image/png",
    };

    store.set("rId1", entry);

    expect(store.has("rId1")).toBe(true);
    expect(store.get("rId1")).toEqual(entry);
  });

  it("should preserve generic type on get", () => {
    type TestParsed = { name: string };
    const store = createResourceStore();

    const entry: ResolvedResourceEntry<TestParsed> = {
      kind: "chart",
      source: "parsed",
      data: new ArrayBuffer(0),
      parsed: { name: "test-chart" },
    };

    store.set("rId1", entry);

    const retrieved = store.get<TestParsed>("rId1");
    expect(retrieved?.parsed?.name).toBe("test-chart");
  });

  it("should return all keys", () => {
    const store = createResourceStore();
    store.set("rId1", { kind: "image", source: "parsed", data: new ArrayBuffer(0) });
    store.set("rId2", { kind: "ole", source: "uploaded", data: new ArrayBuffer(0) });

    const keys = Array.from(store.keys());
    expect(keys).toContain("rId1");
    expect(keys).toContain("rId2");
    expect(keys.length).toBe(2);
  });

  describe("toDataUrl", () => {
    it("should convert to data URL when mimeType is present", () => {
      const store = createResourceStore();
      const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;

      store.set("rId1", {
        kind: "image",
        source: "parsed",
        data,
        mimeType: "image/png",
      });

      const url = store.toDataUrl("rId1");
      expect(url?.startsWith("data:image/png;base64,")).toBe(true);
    });

    it("should return undefined when mimeType is missing", () => {
      const store = createResourceStore();
      store.set("rId1", {
        kind: "image",
        source: "parsed",
        data: new ArrayBuffer(8),
      });

      expect(store.toDataUrl("rId1")).toBeUndefined();
    });

    it("should return undefined for non-existent resource", () => {
      const store = createResourceStore();
      expect(store.toDataUrl("rId1")).toBeUndefined();
    });
  });

  describe("getBySlide", () => {
    it("should filter resources by slideId", () => {
      const store = createResourceStore();
      store.set("rId1", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide1" });
      store.set("rId2", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide2" });
      store.set("rId3", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide1" });

      const slide1Resources = Array.from(store.getBySlide("slide1"));
      expect(slide1Resources).toContain("rId1");
      expect(slide1Resources).toContain("rId3");
      expect(slide1Resources).not.toContain("rId2");
      expect(slide1Resources.length).toBe(2);
    });

    it("should return empty for non-existent slideId", () => {
      const store = createResourceStore();
      store.set("rId1", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide1" });

      const resources = Array.from(store.getBySlide("slide999"));
      expect(resources.length).toBe(0);
    });
  });

  describe("releaseSlide", () => {
    it("should remove all resources for a slide", () => {
      const store = createResourceStore();
      store.set("rId1", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide1" });
      store.set("rId2", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide2" });
      store.set("rId3", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide1" });

      store.releaseSlide("slide1");

      expect(store.has("rId1")).toBe(false);
      expect(store.has("rId2")).toBe(true);
      expect(store.has("rId3")).toBe(false);
    });

    it("should not affect resources without slideId", () => {
      const store = createResourceStore();
      store.set("rId1", { kind: "image", source: "parsed", data: new ArrayBuffer(0) });
      store.set("rId2", { kind: "image", source: "parsed", data: new ArrayBuffer(0), slideId: "slide1" });

      store.releaseSlide("slide1");

      expect(store.has("rId1")).toBe(true);
      expect(store.has("rId2")).toBe(false);
    });
  });
});

describe("createEmptyResourceStore", () => {
  it("should create an empty store", () => {
    const store = createEmptyResourceStore();
    expect(store.has("rId1")).toBe(false);
    expect(Array.from(store.keys()).length).toBe(0);
  });
});
