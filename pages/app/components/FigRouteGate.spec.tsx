/**
 * @file Tests for FigRouteGate
 *
 * Verifies state-transition behaviour:
 * - idle → triggers onLoadDemo, shows loading content
 * - loading → shows loading content
 * - loaded → renders children with document
 * - error → redirects
 */

// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { FigRouteGate } from "./FigRouteGate";
import type { FigDesignDocument } from "@aurochs/fig/domain";

afterEach(cleanup);

/** Minimal fixture satisfying FigDesignDocument shape */
function createMockDocument(): FigDesignDocument {
  return {
    pages: [],
    components: new Map(),
    images: new Map(),
    metadata: null,
  } as FigDesignDocument;
}

function renderGate(
  status: "idle" | "loading" | "loaded" | "error",
  document: FigDesignDocument | null,
  onLoadDemo = () => {},
) {
  return render(
    <MemoryRouter initialEntries={["/fig"]}>
      <Routes>
        <Route
          path="/fig"
          element={
            <FigRouteGate
              fig={{ status, document }}
              onLoadDemo={onLoadDemo}
              loadingContent={<div data-testid="loading">Loading…</div>}
              errorRedirect="/"
            >
              {(doc) => (
                <div data-testid="content">
                  pages={doc.pages.length}
                </div>
              )}
            </FigRouteGate>
          }
        />
        <Route path="/" element={<div data-testid="home">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FigRouteGate", () => {
  it("calls onLoadDemo when status is idle", () => {
    // eslint-disable-next-line no-restricted-syntax -- mutable counter: tracks callback invocation count in test
    let callCount = 0;
    const onLoadDemo = () => { callCount += 1; };
    renderGate("idle", null, onLoadDemo);
    expect(callCount).toBe(1);
  });

  it("shows loading content when status is idle", () => {
    renderGate("idle", null);
    expect(screen.getByTestId("loading")).toBeDefined();
  });

  it("shows loading content when status is loading", () => {
    renderGate("loading", null);
    expect(screen.getByTestId("loading")).toBeDefined();
  });

  it("does NOT call onLoadDemo when status is loading", () => {
    // eslint-disable-next-line no-restricted-syntax -- mutable counter: tracks callback invocation count in test
    let callCount = 0;
    const onLoadDemo = () => { callCount += 1; };
    renderGate("loading", null, onLoadDemo);
    expect(callCount).toBe(0);
  });

  it("renders children with document when status is loaded", () => {
    const doc = createMockDocument();
    renderGate("loaded", doc);
    expect(screen.getByTestId("content")).toBeDefined();
    expect(screen.getByTestId("content").textContent).toContain("pages=0");
  });

  it("redirects to errorRedirect when status is error", () => {
    renderGate("error", null);
    expect(screen.getByTestId("home")).toBeDefined();
  });

  it("redirects when loaded but document is null (should not happen but defensive)", () => {
    renderGate("loaded", null);
    expect(screen.getByTestId("home")).toBeDefined();
  });

  it("does not call onLoadDemo more than once on re-render", () => {
    // eslint-disable-next-line no-restricted-syntax -- mutation counter in closure, cannot be const
    let callCount = 0;
    const onLoadDemo = () => { callCount += 1; };
    const { rerender } = render(
      <MemoryRouter initialEntries={["/fig"]}>
        <Routes>
          <Route
            path="/fig"
            element={
              <FigRouteGate
                fig={{ status: "idle", document: null }}
                onLoadDemo={onLoadDemo}
                loadingContent={<div>Loading</div>}
                errorRedirect="/"
              >
                {() => <div />}
              </FigRouteGate>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Re-render with loading (simulating what happens after onLoadDemo triggers load)
    rerender(
      <MemoryRouter initialEntries={["/fig"]}>
        <Routes>
          <Route
            path="/fig"
            element={
              <FigRouteGate
                fig={{ status: "loading", document: null }}
                onLoadDemo={onLoadDemo}
                loadingContent={<div>Loading</div>}
                errorRedirect="/"
              >
                {() => <div />}
              </FigRouteGate>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(callCount).toBe(1);
  });
});
