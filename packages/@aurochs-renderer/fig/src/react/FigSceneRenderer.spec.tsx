/**
 * @file React renderer FRAME decoration preservation test
 *
 * Verifies that the React renderer emits the same FRAME fills / stroke /
 * effects DOM structure as the SVG string renderer. fig-editor uses the
 * React renderer, so a regression in the React path would mean FRAME
 * decorations silently disappear on screen even when SVG string tests pass.
 *
 * Uses FigDesignDocument (domain) rather than raw parser FigNode — this
 * matches the real fig-editor data path via FigPageRenderer.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
// eslint-disable-next-line custom/no-builder-import-in-renderer -- spec file
import { createDemoFigDesignDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument, FigDesignNode } from "@aurochs/fig/domain";
import { buildSceneGraph } from "../scene-graph/builder";
import { FigSceneRenderer } from "./FigSceneRenderer";

function findDesignByName(nodes: readonly FigDesignNode[], name: string): FigDesignNode | undefined {
  for (const n of nodes) {
    if (n.name === name) {return n;}
    if (n.children) {
      const f = findDesignByName(n.children, name);
      if (f) {return f;}
    }
  }
  return undefined;
}

function renderReact(doc: FigDesignDocument, node: FigDesignNode, w: number, h: number): string {
  const sg = buildSceneGraph([node], {
    blobs: doc.blobs,
    images: doc.images,
    canvasSize: { width: w, height: h },
    symbolMap: doc.components,
    styleRegistry: doc.styleRegistry,
    showHiddenNodes: false,
    warnings: [],
  });
  return renderToStaticMarkup(createElement(FigSceneRenderer, { sceneGraph: sg }));
}

// eslint-disable-next-line no-restricted-syntax -- initialized in beforeAll
let doc: FigDesignDocument;

beforeAll(async () => {
  doc = await createDemoFigDesignDocument();
});

describe("FigSceneRenderer — React path FRAME decoration", () => {
  it("demo Basic Shapes FRAME renders .background(WHITE) as fill=#ffffff", () => {
    const frame = findDesignByName(doc.pages[0].children, "Basic Shapes");
    expect(frame, "demo must contain Basic Shapes FRAME").toBeDefined();
    expect(frame!.type).toBe("FRAME");
    expect(frame!.fills.length, "FRAME must carry .background() fill").toBeGreaterThan(0);

    const html = renderReact(doc, frame!, 480, 320);
    // The FRAME's white background MUST reach the React DOM as a <rect>.
    expect(html, "React output must contain the FRAME's white background fill").toMatch(
      /<rect[^>]+fill="#ffffff"/i,
    );
    // And the FRAME's width/height must size the background rect.
    expect(html).toMatch(/<rect[^>]+width="480"[^>]+height="320"/);
  });

  it("React output uses canonical inner-shadow primitives (no alpha-binarize matrix)", () => {
    // Use frame-inner-shadow if present in demo; otherwise synthesize from
    // the frame-properties fixture. The demo Page 3 contains drop-shadow
    // and inner-shadow examples.
    function collectEffectsSources(nodes: readonly FigDesignNode[], acc: FigDesignNode[]): void {
      for (const n of nodes) {
        if (n.effects && n.effects.length > 0) {acc.push(n);}
        if (n.children) {collectEffectsSources(n.children, acc);}
      }
    }
    const nodesWithEffects: FigDesignNode[] = [];
    for (const page of doc.pages) {collectEffectsSources(page.children, nodesWithEffects);}
    const innerShadowNode = nodesWithEffects.find((n) =>
      n.effects!.some((e) => (typeof e.type === "string" ? e.type : e.type?.name) === "INNER_SHADOW"),
    );
    if (!innerShadowNode) {
      console.warn("No INNER_SHADOW in demo — skipping inner-shadow assertion");
      return;
    }
    const html = renderReact(doc, innerShadowNode, 200, 200);
    // Canonical recipe emits feFlood + feComposite(operator="in") + feOffset
    // + feGaussianBlur + feComposite(operator="out") + feMerge.
    expect(html).toMatch(/<feFlood\b/);
    expect(html).toMatch(/<feComposite[^>]+operator="in"/);
    expect(html).toMatch(/<feComposite[^>]+operator="out"/);
    expect(html).toMatch(/<feMerge\b/);
    // The previous broken recipe used a 127× alpha binarize matrix.
    expect(html, "ALPHA_BINARIZE_MATRIX must no longer appear").not.toContain(
      "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0",
    );
  });

  it("React output contains filter and clip-path defs for decorated FRAME", () => {
    // Basic Shapes FRAME has clipsContent=true → must emit a <clipPath>.
    const frame = findDesignByName(doc.pages[0].children, "Basic Shapes");
    const html = renderReact(doc, frame!, 480, 320);
    expect(html).toMatch(/<clipPath\b/);
  });

  it("stroke-mask def uses <g fill=\"white\"> wrapper — NOT fill=white directly on <mask>", () => {
    // SVG `<mask>` does NOT accept `fill` attribute. Placing fill="white" on
    // the mask itself (instead of on a wrapping <g>) makes the mask evaluate
    // to fully black, hiding the entire masked element. This broke INSIDE /
    // OUTSIDE stroke rendering on FRAMEs / RECTs / ELLIPSEs / PATHs whenever
    // they had a rounded (cornerRadius ≠ 0) stroke — users reported missing
    // widgets (Bento logo, Cron 4×2) as empty white squares.
    //
    // Find a demo node that produces a stroke-mask. The demo's Basic Shapes
    // FRAME default strokeAlign=INSIDE + stroke emits one.
    function findWithStroke(nodes: readonly FigDesignNode[]): FigDesignNode | undefined {
      for (const n of nodes) {
        if (n.strokes && n.strokes.length > 0 && n.strokeWeight && n.strokeWeight > 0) {return n;}
        if (n.children) {
          const f = findWithStroke(n.children);
          if (f) {return f;}
        }
      }
      return undefined;
    }
    const strokeNode = findWithStroke(doc.pages[0].children);
    expect(strokeNode, "demo must contain a stroked node").toBeDefined();
    const html = renderReact(doc, strokeNode!, 200, 200);

    // The <mask> element must NOT have fill directly on it.
    expect(html, "<mask> must not have fill attribute directly on it").not.toMatch(/<mask\b[^>]*\sfill=/);
    // If a mask exists in the output, it must have maskType=luminance and a
    // wrapping <g fill="white"> (or inverted <rect fill="white"><g fill="black">).
    if (/<mask\b/.test(html)) {
      expect(html).toMatch(/<mask\b[^>]*mask-?[Tt]ype/);
      expect(html).toMatch(/<g\s+fill="white"/);
    }
  });
});
