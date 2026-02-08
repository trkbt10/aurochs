/**
 * @file useSvgFontLoader behavior tests
 */

// @vitest-environment jsdom

import { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { EditorConfigProvider, type FontCatalog } from "@aurochs-ui/pptx-editor";
import { useSvgFontLoader } from "./useSvgFontLoader";

function Harness({ svg }: { readonly svg: string }) {
  const loadSvgFonts = useSvgFontLoader();

  useEffect(() => {
    if (!loadSvgFonts) {
      return;
    }
    void loadSvgFonts(svg);
  }, [loadSvgFonts, svg]);

  return null;
}

describe("useSvgFontLoader", () => {
  it("loads only families that exist in the catalog", async () => {
    const calls: string[] = [];
    const catalog: FontCatalog = {
      label: "Test Catalog",
      listFamilies: async () => ["Inter", "Roboto"],
      ensureFamilyLoaded: async (family: string) => {
        calls.push(family);
        return true;
      },
    };

    render(
      <EditorConfigProvider config={{ fontCatalog: catalog }}>
        <Harness svg={`<svg><text font-family="Inter, serif">Hello</text></svg>`} />
      </EditorConfigProvider>,
    );

    await waitFor(() => {
      expect(calls).toEqual(["Inter"]);
    });
  });

  it("ignores generic families and deduplicates in-flight requests", async () => {
    const calls: string[] = [];
    const catalog: FontCatalog = {
      label: "Test Catalog",
      listFamilies: async () => ["Inter"],
      ensureFamilyLoaded: async (family: string) => {
        calls.push(family);
        await Promise.resolve();
        return true;
      },
    };

    function DoubleHarness({ svg }: { readonly svg: string }) {
      const loadSvgFonts = useSvgFontLoader();
      useEffect(() => {
        if (!loadSvgFonts) {
          return;
        }
        void loadSvgFonts(svg);
        void loadSvgFonts(svg);
      }, [loadSvgFonts, svg]);
      return null;
    }

    render(
      <EditorConfigProvider config={{ fontCatalog: catalog }}>
        <DoubleHarness svg={`<svg><text style="font-family: system-ui, Inter, serif">Hi</text></svg>`} />
      </EditorConfigProvider>,
    );

    await waitFor(() => {
      expect(calls).toEqual(["Inter"]);
    });
  });
});
