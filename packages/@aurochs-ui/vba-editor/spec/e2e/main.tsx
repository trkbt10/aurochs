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

const testModuleSource = `Sub Test()
    ' This is a comment line
    Dim x As Integer
    Dim y As Long
    Dim z As String
    x = 1
    y = 2
    z = "Hello World"
    ' Japanese: 日本語テスト
    ' Korean: 한글 테스트
    ' Chinese: 中文测试
    If x > 0 Then
        y = x * 2
    End If
    MsgBox z
End Sub
`;

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
// Root Component
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
};

function App() {
  return (
    <div style={containerStyle} data-testid="vba-editor-container">
      <VbaEditor program={testProgram} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
