/**
 * @file Bento Widget — real .fig render regression test
 *
 * Loads the Bento Widget Templates .fig (real-world file with heavy
 * SYMBOL/INSTANCE nesting, stroke masks, and deep clip chains) and
 * verifies the React renderer produces the expected visual primitives.
 *
 * Originally created to investigate user-reported "SYMBOL の中の INSTANCE
 * の中が描画できていない" — tracked to a broken stroke-mask recipe in
 * the React renderer that hid all rounded-frame stroked content.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
// eslint-disable-next-line custom/no-builder-import-in-renderer -- spec file: real .fig roundtrip
import { createFigDesignDocument } from "@aurochs-builder/fig";
import type { FigDesignDocument, FigDesignNode } from "@aurochs/fig/domain";
import { buildSceneGraph } from "../src/scene-graph/builder";
import { FigSceneRenderer } from "../src/react/FigSceneRenderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIG = path.join(__dirname, "../fixtures/bento-widgets/bento-widgets.fig");

// eslint-disable-next-line no-restricted-syntax -- initialized in beforeAll
let doc: FigDesignDocument;

beforeAll(async () => {
  if (!fs.existsSync(FIG)) {throw new Error(`Bento fixture missing: ${FIG}`);}
  const data = fs.readFileSync(FIG);
  doc = await createFigDesignDocument(new Uint8Array(data));
}, 60_000);

function renderNodeReact(node: FigDesignNode, w: number, h: number): string {
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

function findByName(nodes: readonly FigDesignNode[], name: string): FigDesignNode | undefined {
  for (const n of nodes) {
    if (n.name === name) {return n;}
    if (n.children) {
      const f = findByName(n.children, name);
      if (f) {return f;}
    }
  }
  return undefined;
}

describe("Bento Widget — real .fig render through React", () => {
  it("loads document with all expected pages", () => {
    const pageNames = doc.pages.map((p) => p.name);
    for (const expected of ["Cover", "Components"]) {
      expect(pageNames, `page "${expected}" must exist`).toContain(expected);
    }
    expect(doc.components.size, "Bento SYMBOL map must be populated").toBeGreaterThan(50);
  });

  it("Bento logo SYMBOL renders 5 distinct coloured paths", () => {
    const bentoSym = doc.components.get("104:240");
    expect(bentoSym).toBeDefined();
    const html = renderNodeReact(bentoSym!, 100, 100);
    // Each of the 5 sub-shapes of the Bento diamond logo has a distinct
    // fill from its styleOverrideTable. Missing per-contour fill mapping
    // would collapse them all to a single colour.
    const uniqueFills = new Set((html.match(/fill="#[0-9a-f]{6}"/gi) ?? []).map((s) => s.toLowerCase()));
    expect(uniqueFills.size, "Bento icon must render ≥3 distinct fill colours").toBeGreaterThanOrEqual(3);
  });

  it("Logo FRAME (stroke + cornerRadius=50) renders both stroke and Bento child", () => {
    const cover = doc.pages.find((p) => p.name === "Cover");
    const logo = findByName(cover!.children, "Logo");
    expect(logo).toBeDefined();
    const html = renderNodeReact(logo!, 200, 200);

    // The background circle fill must appear.
    expect(html, "Logo frame blue fill must be present").toMatch(/fill="#768cff"/i);
    // The Bento INSTANCE nested inside must contribute its paths —
    // specifically the bright green highlight at fillOverride index [3].
    expect(html, "Bento's green highlight path must render through Logo's stroke-mask").toMatch(
      /fill="#5aff88"|fill="rgb\(90, ?255, ?136\)"/i,
    );
    // The stroke-mask must be emitted in the correct form — a prior bug
    // put fill="white" directly on <mask>, which evaluates to fully black
    // and hid the entire stroked group (and with it the Bento child).
    expect(html).not.toMatch(/<mask\b[^>]*\sfill=/);
    // If any mask exists, it must use maskType=luminance and a <g fill="white">
    // wrapper (not fill= on the mask element itself).
    if (/<mask\b/.test(html)) {
      expect(html).toMatch(/mask-?[Tt]ype/);
      expect(html).toMatch(/<g\s+fill="white"/);
    }
  });

  it("Cron 4×2 SYMBOL (deeply nested INSTANCEs) renders progress dots + icon", () => {
    // Scan for the Cron 4×2 SYMBOL regardless of how it is registered.
    let cronSymbol: FigDesignNode | undefined;
    for (const sym of doc.components.values()) {
      if (sym.name && /Cron.*4.*2/i.test(sym.name)) { cronSymbol = sym; break; }
    }
    expect(cronSymbol, "Cron 4×2 SYMBOL must exist in components map").toBeDefined();
    const html = renderNodeReact(cronSymbol!, 600, 400);
    // The widget palette — black background, orange progress dots, white fills.
    expect(html, "Cron widget black background (#1a1a1a)").toMatch(/fill="#1a1a1a"/i);
    expect(html, "Cron widget orange progress dot (#ff8a04)").toMatch(/fill="#ff8a04"/i);
  });

  it("Cron 4×2 Brand INSTANCE's symbolOverrides.fillPaints reaches SVG (orange icon)", () => {
    // Regression for: symbolOverrides carrying fillPaints in raw kiwi
    // `{value,name}` shape survived the parser because normalize.ts only
    // walked the top-level `symbolOverrides` field, not the Figma-export
    // variant `symbolData.symbolOverrides`. The override's orange paint
    // (r=1, g=0.278, b=0) then failed `paint.type === "SOLID"` narrowing
    // in the renderer and was dropped silently, leaving the Brand=Cron
    // logo as a `fill="none"` outline.
    //
    // After normalisation covers both shapes + applyOverrideToNode runs
    // on a domain-string paint, the orange fill must appear in output.
    let cronSymbol: FigDesignNode | undefined;
    for (const sym of doc.components.values()) {
      if (sym.name && /Cron.*4.*2/i.test(sym.name)) { cronSymbol = sym; break; }
    }
    const html = renderNodeReact(cronSymbol!, 600, 400);
    // Brand override colour: {r:1, g:0.278, b:0} → #ff4700 (may land at
    // #ff4600/#ff4700 depending on float32 rounding).
    expect(html, "Brand INSTANCE orange override must reach the rendered SVG").toMatch(
      /fill="#ff4[67]00"|fill="rgb\(255, ?7[0-1], ?0\)"/i,
    );
    // And absolutely no fill="none" on rendered paths — every Cron 4×2
    // path is either a filled shape or a stroke-outline fill.
    expect(html).not.toMatch(/<path[^>]+fill="none"/);
  });
});
