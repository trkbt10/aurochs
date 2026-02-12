/**
 * @file DOCX Drawing ML Adapter Tests
 */

import {
  createDrawingMLContextFromDocx,
  createEmptyDocxResourceResolver,
  createDocxResourceResolver,
  createEmptyColorContext,
  createDefaultDocxDrawingContext,
} from "./docx-drawing-ml-adapter";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { DocxDrawingRenderContext, DocxRenderWarning } from "./types";

// =============================================================================
// Helper: Simple call tracking
// =============================================================================

type CallRecord = { path: string };

function createCallTracker(): {
  calls: CallRecord[];
  fn: (path: string) => Uint8Array | null;
  calledWith: (path: string) => boolean;
} {
  const calls: CallRecord[] = [];
  return {
    calls,
    fn: (path: string) => {
      calls.push({ path });
      return null;
    },
    calledWith: (path: string) => calls.some((c) => c.path === path),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createEmptyDocxResourceResolver", () => {
  it("returns undefined for all methods", () => {
    const resolver = createEmptyDocxResourceResolver();

    expect(resolver.resolve("rId1")).toBeUndefined();
    expect(resolver.getMimeType("rId1")).toBeUndefined();
    expect(resolver.getTarget("rId1")).toBeUndefined();
  });
});

describe("createEmptyColorContext", () => {
  it("returns empty color scheme and map", () => {
    const context = createEmptyColorContext();

    expect(context.colorScheme).toEqual({});
    expect(context.colorMap).toEqual({});
  });
});

describe("createDefaultDocxDrawingContext", () => {
  it("creates context with empty resources and color context", () => {
    const context = createDefaultDocxDrawingContext();

    expect(context.colorContext.colorScheme).toEqual({});
    expect(context.resources.resolve("rId1")).toBeUndefined();
  });

  it("collects warnings", () => {
    const context = createDefaultDocxDrawingContext();

    context.warnings.add({
      type: "unsupported",
      message: "Test warning",
    });

    const warnings = context.warnings.getAll();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toBe("Test warning");
  });
});

describe("createDocxResourceResolver", () => {
  it("resolves relative path with word/ prefix", () => {
    const relationships = new Map([
      ["rId1", { target: "media/image1.png", type: "image" }],
    ]);

    const tracker = createCallTracker();
    const readFile = (path: string): Uint8Array | null => {
      tracker.fn(path);
      if (path === "word/media/image1.png") {
        return new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
      }
      return null;
    };

    const getMimeType = (): string => "image/png";

    const resolver = createDocxResourceResolver(relationships, readFile, getMimeType);

    const result = resolver.resolve("rId1");

    expect(tracker.calledWith("word/media/image1.png")).toBe(true);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("resolves absolute path without word/ prefix", () => {
    const relationships = new Map([
      ["rId1", { target: "/media/image1.png", type: "image" }],
    ]);

    const tracker = createCallTracker();
    const readFile = (path: string): Uint8Array | null => {
      tracker.fn(path);
      if (path === "media/image1.png") {
        return new Uint8Array([137, 80, 78, 71]);
      }
      return null;
    };

    const getMimeType = (): string => "image/png";

    const resolver = createDocxResourceResolver(relationships, readFile, getMimeType);

    resolver.resolve("rId1");

    expect(tracker.calledWith("media/image1.png")).toBe(true);
  });

  it("returns undefined for unknown relationship ID", () => {
    const relationships = new Map<string, { target: string; type: string }>();
    const tracker = createCallTracker();
    const getMimeType = (): string | undefined => undefined;

    const resolver = createDocxResourceResolver(relationships, tracker.fn, getMimeType);

    expect(resolver.resolve("unknown")).toBeUndefined();
    expect(tracker.calls).toHaveLength(0);
  });

  it("returns undefined when file read fails", () => {
    const relationships = new Map([
      ["rId1", { target: "media/missing.png", type: "image" }],
    ]);

    const readFile = (): Uint8Array | null => null;
    const getMimeType = (): string | undefined => undefined;

    const resolver = createDocxResourceResolver(relationships, readFile, getMimeType);

    expect(resolver.resolve("rId1")).toBeUndefined();
  });

  it("getTarget returns relationship target", () => {
    const relationships = new Map([
      ["rId1", { target: "media/image1.png", type: "image" }],
    ]);

    const noop = (): null => null;
    const noopMime = (): string | undefined => undefined;
    const resolver = createDocxResourceResolver(relationships, noop, noopMime);

    expect(resolver.getTarget("rId1")).toBe("media/image1.png");
    expect(resolver.getTarget("unknown")).toBeUndefined();
  });

  it("getMimeType returns mime type for relationship", () => {
    const relationships = new Map([
      ["rId1", { target: "media/image1.png", type: "image" }],
    ]);

    const mimeTypeCalls: string[] = [];
    const getMimeType = (path: string): string => {
      mimeTypeCalls.push(path);
      return "image/png";
    };
    const noop = (): null => null;
    const resolver = createDocxResourceResolver(relationships, noop, getMimeType);

    expect(resolver.getMimeType("rId1")).toBe("image/png");
    expect(mimeTypeCalls).toContain("word/media/image1.png");
  });
});

describe("createDrawingMLContextFromDocx", () => {
  it("adapts color context", () => {
    const docxContext = createDefaultDocxDrawingContext();

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    expect(drawingMLContext.colorContext).toBe(docxContext.colorContext);
  });

  it("adapts resource resolver", () => {
    const docxContext: DocxDrawingRenderContext = {
      colorContext: createEmptyColorContext(),
      resources: {
        resolve: () => "data:image/png;base64,test",
        getMimeType: () => "image/png",
        getTarget: () => "media/image.png",
      },
      warnings: {
        add: () => {},
        getAll: () => [],
      },
    };

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    expect(drawingMLContext.resolveResource?.("rId1")).toBe("data:image/png;base64,test");
  });

  it("adapts warnings collector", () => {
    const collectedWarnings: DocxRenderWarning[] = [];
    const docxContext: DocxDrawingRenderContext = {
      colorContext: createEmptyColorContext(),
      resources: createEmptyDocxResourceResolver(),
      warnings: {
        add: (warning) => collectedWarnings.push(warning),
        getAll: () => collectedWarnings,
      },
    };

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    drawingMLContext.warnings.warn("Test message", { key: "value" });

    expect(collectedWarnings).toHaveLength(1);
    expect(collectedWarnings[0]).toEqual({
      type: "unsupported",
      message: "Test message",
      details: '{"key":"value"}',
    });
  });

  it("generates unique IDs", () => {
    const docxContext = createDefaultDocxDrawingContext();

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    const id1 = drawingMLContext.getNextId("gradient");
    const id2 = drawingMLContext.getNextId("gradient");
    const id3 = drawingMLContext.getNextId("pattern");

    expect(id1).toBe("gradient-0");
    expect(id2).toBe("gradient-1");
    expect(id3).toBe("pattern-2");
  });

  it("creates render size from page size", () => {
    const docxContext: DocxDrawingRenderContext = {
      colorContext: createEmptyColorContext(),
      resources: createEmptyDocxResourceResolver(),
      warnings: {
        add: () => {},
        getAll: () => [],
      },
      pageSize: {
        width: px(816),
        height: px(1056),
      },
    };

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    expect(drawingMLContext.renderSize).toEqual({
      width: 816,
      height: 1056,
    });
  });

  it("returns undefined render size when page size is not provided", () => {
    const docxContext = createDefaultDocxDrawingContext();

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    expect(drawingMLContext.renderSize).toBeUndefined();
  });

  it("sets resolvedBackground to undefined", () => {
    const docxContext = createDefaultDocxDrawingContext();

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    expect(drawingMLContext.resolvedBackground).toBeUndefined();
  });
});
