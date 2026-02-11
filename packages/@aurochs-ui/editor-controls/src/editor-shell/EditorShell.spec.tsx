/**
 * @file EditorShell.spec
 *
 * Basic rendering tests for EditorShell.
 * Uses real react-panel-layout (no mocks). In jsdom, useContainerWidth returns 0,
 * which resolveEditorLayoutMode treats as "desktop".
 */
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { EditorShell } from "./EditorShell";

describe("EditorShell", () => {
  it("renders center content only", () => {
    render(
      <EditorShell>
        <div>Center Content</div>
      </EditorShell>,
    );

    expect(screen.getByText("Center Content")).toBeDefined();
  });

  it("renders toolbar when provided", () => {
    render(
      <EditorShell toolbar={<div>My Toolbar</div>}>
        <div>Content</div>
      </EditorShell>,
    );

    expect(screen.getByText("My Toolbar")).toBeDefined();
  });

  it("renders left and right panels", () => {
    render(
      <EditorShell
        panels={[
          { id: "left", position: "left", content: <div>Left Panel</div> },
          { id: "right", position: "right", content: <div>Right Panel</div> },
        ]}
      >
        <div>Center</div>
      </EditorShell>,
    );

    expect(screen.getByText("Left Panel")).toBeDefined();
    expect(screen.getByText("Right Panel")).toBeDefined();
  });

  it("renders bottomBar when provided", () => {
    render(
      <EditorShell bottomBar={<div>Bottom Bar</div>}>
        <div>Content</div>
      </EditorShell>,
    );

    expect(screen.getByText("Bottom Bar")).toBeDefined();
  });

  it("does not render overlay buttons in desktop mode", () => {
    render(
      <EditorShell
        panels={[
          { id: "left", position: "left", content: <div>Left</div>, drawerLabel: "Slides" },
          { id: "right", position: "right", content: <div>Right</div>, drawerLabel: "Inspector" },
        ]}
      >
        <div>Content</div>
      </EditorShell>,
    );

    // Desktop mode (width=0 fallback) — no drawer toggle buttons
    expect(screen.queryByTitle("Toggle Slides")).toBeNull();
    expect(screen.queryByTitle("Toggle Inspector")).toBeNull();
  });
});
