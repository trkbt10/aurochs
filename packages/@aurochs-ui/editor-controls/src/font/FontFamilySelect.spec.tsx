/**
 * @file FontFamilySelect rendering tests
 */

// @vitest-environment jsdom

import { render, fireEvent, waitFor } from "@testing-library/react";
import { FontCatalogProvider } from "./FontCatalogContext";
import { FontFamilySelect } from "./FontFamilySelect";
import type { FontCatalog } from "./types";

function ensureScrollIntoView() {
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: () => undefined,
      writable: true,
    });
  }
}

describe("FontFamilySelect", () => {
  it("shows catalog hint even before searching", async () => {
    ensureScrollIntoView();

    const catalog: FontCatalog = {
      label: "Google Fonts",
      listFamilies: () => ["Inter", "Roboto"],
      ensureFamilyLoaded: async () => true,
    };

    const { getByRole, getByText } = render(
      <FontCatalogProvider fontCatalog={catalog}>
        <FontFamilySelect value="" onChange={() => undefined} />
      </FontCatalogProvider>
    );

    await waitFor(() => {
      // Wait for the listFamilies effect to settle (even though hint is immediate)
      expect(true).toBe(true);
    });

    fireEvent.click(getByRole("button"));
    expect(getByText("Google Fonts: Ready (2)")).toBeTruthy();
    expect(getByText("Google Fonts")).toBeTruthy();
    expect(getByText("Scroll or type to search…")).toBeTruthy();
  });
});
