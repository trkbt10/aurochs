/**
 * @file E2E test entry point
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { VbaEditor } from "@aurochs-ui/vba-editor";
import type { VbaProgramIr, VbaModule } from "@aurochs-office/vba";

injectCSSVariables();

// =============================================================================
// Simple Test Module
// =============================================================================

/**
 * Generate test source code with enough lines to exceed a 720px viewport.
 * At 21px per line, 720px / 21 ≈ 34 lines visible. With EditorShell
 * chrome (toolbar, status bar, panels) the visible area is smaller.
 * 60+ lines ensures scrollability in all layouts.
 */
function generateTestSource(): string {
  const lines: string[] = [
    "Sub Test()",
    "    ' This is a comment line",
    "    Dim x As Integer",
    "    Dim y As Long",
    "    Dim z As String",
    "    x = 1",
    "    y = 2",
    '    z = "Hello World"',
    "    ' Japanese: 日本語テスト",
    "    ' Korean: 한글 테스트",
    "    ' Chinese: 中文测试",
    "    If x > 0 Then",
    "        y = x * 2",
    "    End If",
    "    MsgBox z",
  ];
  // Pad with numbered comment lines to exceed viewport
  for (let i = 1; i <= 50; i++) {
    lines.push(`    ' Line ${i}: padding for scroll test`);
  }
  lines.push("End Sub");
  return lines.join("\n");
}

const testModuleSource = generateTestSource();

const testModule: VbaModule = {
  name: "TestModule",
  type: "standard",
  sourceCode: testModuleSource,
  streamOffset: 0,
  procedures: [
    {
      name: "Test",
      type: "sub",
      visibility: "public",
      parameters: [],
      returnType: null,
    },
  ],
};

const testProgram: VbaProgramIr = {
  project: {
    name: "TestProject",
    helpFile: null,
    helpContext: 0,
    constants: null,
    version: { major: 1, minor: 0 },
  },
  modules: [testModule],
  references: [],
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
};

const navStyle: CSSProperties = {
  display: "flex",
  gap: "16px",
  padding: "8px 16px",
  background: "#f0f0f0",
  borderTop: "1px solid #ccc",
  fontFamily: "sans-serif",
  fontSize: "14px",
  flexShrink: 0,
};

const editorContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
};

// =============================================================================
// Root Component
// =============================================================================

/**
 * E2E test application.
 */
function App() {
  return (
    <div style={containerStyle} data-testid="vba-editor-container">
      <div style={editorContainerStyle}>
        <VbaEditor
          program={testProgram}
          onRun={(name) => console.log(`Running: ${name}`)}
          onStop={() => console.log("Execution stopped")}
        />
      </div>

      <nav style={navStyle}>
        <span>VBA Editor E2E</span>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
