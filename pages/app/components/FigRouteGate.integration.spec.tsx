/**
 * @file Integration test: FigRouteGate + useFig + demo load flow
 *
 * Simulates the actual flow:
 * 1. User clicks "Fig Editor Demo" → fig.load("demo.fig", asyncFn) + navigate
 * 2. FigRouteGate sees loading → shows loading content
 * 3. Async load completes → FigRouteGate sees loaded → shows children
 *
 * Also tests the direct URL flow:
 * 1. User navigates directly to /fig/editor (fig is idle)
 * 2. FigRouteGate triggers onLoadDemo → fig.load starts
 * 3. Shows loading → then loaded
 */

// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { FigRouteGate } from "./FigRouteGate";
import { useFileLoader } from "../hooks/useFileLoader";
import type { FigDesignDocument } from "@aurochs/fig/domain";

afterEach(cleanup);

function createMockDocument(): FigDesignDocument {
  return {
    pages: [{ id: "p1" as never, name: "Page 1", backgroundColor: { r: 1, g: 1, b: 1, a: 1 }, children: [] }],
    components: new Map(),
    images: new Map(),
    metadata: null,
  } as FigDesignDocument;
}

/**
 * Test harness that wires up a real useFileLoader with FigRouteGate.
 * The demoFactory controls when/how the demo resolves.
 */
function TestHarness({
  demoFactory,
  initialEntries = ["/fig"],
}: {
  demoFactory: () => Promise<FigDesignDocument>;
  initialEntries?: string[];
}) {
  const loader = useFileLoader<FigDesignDocument>("Failed");

  const handleLoadDemo = () => {
    loader.load("demo.fig", demoFactory);
  };

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/fig"
          element={
            <FigRouteGate
              fig={{ status: loader.status, document: loader.data }}
              onLoadDemo={handleLoadDemo}
              loadingContent={<div data-testid="loading">Loading…</div>}
              errorRedirect="/"
            >
              {(doc) => (
                <div data-testid="editor">
                  pages={doc.pages.length}
                </div>
              )}
            </FigRouteGate>
          }
        />
        <Route path="/" element={<div data-testid="home">Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("FigRouteGate integration with useFileLoader", () => {
  it("direct URL: idle → triggers demo → loading → loaded", async () => {
    const doc = createMockDocument();
    const demoFactory = () => Promise.resolve(doc);

    render(<TestHarness demoFactory={demoFactory} />);

    // Initially shows loading (idle → FigRouteGate shows loadingContent and triggers onLoadDemo)
    expect(screen.getByTestId("loading")).toBeDefined();

    // Wait for async load to complete
    await waitFor(() => {
      expect(screen.getByTestId("editor")).toBeDefined();
    });

    expect(screen.getByTestId("editor").textContent).toContain("pages=1");
  });

  it("direct URL: demo factory error → redirects to home", async () => {
    const demoFactory = () => Promise.reject(new Error("build failed"));

    render(<TestHarness demoFactory={demoFactory} />);

    // Shows loading first
    expect(screen.getByTestId("loading")).toBeDefined();

    // Wait for error → redirect
    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeDefined();
    });
  });

  it("gate does NOT re-trigger onLoadDemo when already loading", async () => {
    // eslint-disable-next-line no-restricted-syntax -- mutation counter in closure, cannot be const
    let callCount = 0;
    const onLoadDemo = () => { callCount += 1; };

    // Render with "loading" status (simulating: button clicked, load started, then navigated)
    render(
      <MemoryRouter initialEntries={["/fig"]}>
        <Routes>
          <Route
            path="/fig"
            element={
              <FigRouteGate
                fig={{ status: "loading", document: null }}
                onLoadDemo={onLoadDemo}
                loadingContent={<div data-testid="loading">Loading…</div>}
                errorRedirect="/"
              >
                {(d) => <div data-testid="editor">pages={d.pages.length}</div>}
              </FigRouteGate>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("loading")).toBeDefined();
    expect(callCount).toBe(0);
  });
});
