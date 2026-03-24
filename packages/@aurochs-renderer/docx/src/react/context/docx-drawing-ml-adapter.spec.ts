/**
 * @file DOCX Drawing ML Adapter Tests
 */

import {
  createDrawingMLContextFromDocx,
  createEmptyColorContext,
  createDefaultDocxDrawingContext,
} from "./docx-drawing-ml-adapter";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { DocxDrawingRenderContext, DocxRenderWarning } from "./types";

// =============================================================================
// Tests
// =============================================================================

describe("createEmptyColorContext", () => {
  it("returns empty color scheme and map", () => {
    const context = createEmptyColorContext();

    expect(context.colorScheme).toEqual({});
    expect(context.colorMap).toEqual({});
  });
});

describe("createDefaultDocxDrawingContext", () => {
  it("creates context with empty resourceStore and color context", () => {
    const context = createDefaultDocxDrawingContext();

    expect(context.colorContext.colorScheme).toEqual({});
    expect(context.resourceStore.toDataUrl("rId1")).toBeUndefined();
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

describe("createDrawingMLContextFromDocx", () => {
  it("adapts color context", () => {
    const docxContext = createDefaultDocxDrawingContext();

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    expect(drawingMLContext.colorContext).toBe(docxContext.colorContext);
  });

  it("adapts resource store to resolveResource", () => {
    const store = createResourceStore();
    const pngBytes = new Uint8Array([137, 80, 78, 71]).buffer;
    store.set("rId1", {
      kind: "image",
      source: "parsed",
      data: pngBytes,
      mimeType: "image/png",
    });

    const docxContext: DocxDrawingRenderContext = {
      colorContext: createEmptyColorContext(),
      resourceStore: store,
      warnings: {
        add: () => {},
        getAll: () => [],
      },
    };

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    const result = drawingMLContext.resolveResource?.("rId1");
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("returns undefined for unknown resource ID", () => {
    const docxContext = createDefaultDocxDrawingContext();

    const drawingMLContext = createDrawingMLContextFromDocx(docxContext);

    expect(drawingMLContext.resolveResource?.("unknown")).toBeUndefined();
  });

  it("adapts warnings collector", () => {
    const collectedWarnings: DocxRenderWarning[] = [];
    const docxContext: DocxDrawingRenderContext = {
      colorContext: createEmptyColorContext(),
      resourceStore: createResourceStore(),
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
      resourceStore: createResourceStore(),
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
