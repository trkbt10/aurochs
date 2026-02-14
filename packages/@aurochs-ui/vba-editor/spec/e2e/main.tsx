/**
 * @file E2E test entry point
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import {
  VbaEditor,
  HtmlCodeRenderer,
  SvgCodeRenderer,
  CanvasCodeRenderer,
  type CodeRendererComponent,
  type RendererType,
} from "@aurochs-ui/vba-editor";
import type { VbaProgramIr, VbaModule } from "@aurochs-office/vba";

injectCSSVariables();

// =============================================================================
// URL Parameter Parsing
// =============================================================================

/** Test-level renderer mapping for URL-based selection. */
const RENDERER_MAP: Record<RendererType, CodeRendererComponent> = {
  html: HtmlCodeRenderer,
  svg: SvgCodeRenderer,
  canvas: CanvasCodeRenderer,
};

function getRendererFromUrl(): { type: RendererType; component: CodeRendererComponent } {
  const params = new URLSearchParams(window.location.search);
  const renderer = params.get("renderer");
  if (renderer === "svg" || renderer === "canvas" || renderer === "html") {
    return { type: renderer, component: RENDERER_MAP[renderer] };
  }
  return { type: "html", component: HtmlCodeRenderer };
}

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

const linkStyle: CSSProperties = {
  color: "#0066cc",
  textDecoration: "none",
};

const activeLinkStyle: CSSProperties = {
  ...linkStyle,
  fontWeight: "bold",
  color: "#000",
};

const editorContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
};

// =============================================================================
// Root Component
// =============================================================================

const RENDERER_TYPES: RendererType[] = ["html", "svg", "canvas"];

function App() {
  const { type: currentType, component: CurrentRenderer } = getRendererFromUrl();

  return (
    <div style={containerStyle} data-testid="vba-editor-container">
      {/* Editor */}
      <div style={editorContainerStyle}>
        <VbaEditor program={testProgram} Renderer={CurrentRenderer} />
      </div>

      {/* Renderer navigation - bottom */}
      <nav style={navStyle}>
        <span>Renderer:</span>
        {RENDERER_TYPES.map((r) => (
          <a
            key={r}
            href={`?renderer=${r}`}
            style={r === currentType ? activeLinkStyle : linkStyle}
          >
            {r.toUpperCase()}
          </a>
        ))}
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
