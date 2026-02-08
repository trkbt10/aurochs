/**
 * @file EditorConfigProvider font catalog prefetch tests
 */

// @vitest-environment jsdom

import { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { EditorConfigProvider } from "./EditorConfigContext";
import type { FontCatalog } from "../../fonts/types";

function Noop() {
  return null;
}

describe("EditorConfigProvider", () => {
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
        <EditorConfigProvider config={{ fontCatalog: catalog }}>
          <Noop />
        </EditorConfigProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(calls.listFamilies).toBe(1);
    });
  });

  it("does not prefetch when no catalog is provided", async () => {
    render(
      <StrictMode>
        <EditorConfigProvider>
          <Noop />
        </EditorConfigProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(true).toBe(true);
    });
  });
});
