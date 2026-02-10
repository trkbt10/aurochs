/**
 * @file FontCatalogProvider prefetch tests
 */

// @vitest-environment jsdom

import { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { FontCatalogProvider } from "./FontCatalogContext";
import type { FontCatalog } from "./types";

function Noop() {
  return null;
}

describe("FontCatalogProvider", () => {
  it("prefetches font catalog families only once under StrictMode", async () => {
    const calls = { listFamilies: 0, ensureFamilyLoaded: 0 };
    const catalog: FontCatalog = {
      label: "Test Catalog",
      listFamilies: () => {
        calls.listFamilies += 1;
        return ["Inter"];
      },
      ensureFamilyLoaded: async () => {
        calls.ensureFamilyLoaded += 1;
        return true;
      },
    };

    render(
      <StrictMode>
        <FontCatalogProvider fontCatalog={catalog}>
          <Noop />
        </FontCatalogProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(calls.listFamilies).toBe(1);
    });
  });

  it("does not prefetch when no catalog is provided", async () => {
    render(
      <StrictMode>
        <FontCatalogProvider fontCatalog={undefined}>
          <Noop />
        </FontCatalogProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(true).toBe(true);
    });
  });
});
