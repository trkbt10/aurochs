/**
 * @file E2E test harness for TextEditController copy-paste
 *
 * Renders TextEditController with a two-paragraph TextBody where each
 * paragraph has a distinct style. This isolates the copy-paste style
 * preservation logic from any external editor state management.
 *
 * Paragraph 1: "Aurochs" — bold, 24pt, red (#C0392B)
 * Paragraph 2: "Office Document Toolkit" — italic, 12pt, blue (#2980B9)
 *
 * The test verifies that copying "Document" from paragraph 2 and pasting
 * it applies paragraph 2's style (italic, 12pt, blue), NOT paragraph 1's.
 *
 * Exposed on window for E2E inspection:
 * - window.__textBody: current TextBody (updated on every selection change)
 * - window.__lastComplete: last committed text (on Enter)
 */

import { StrictMode, useState, useCallback, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { TextBody, RunProperties } from "@aurochs-office/pptx/domain";
import { px, pt } from "@aurochs-office/drawing-ml/domain/units";
import { TextEditController } from "../../src/text-edit/coordinator/TextEditController";
import type { SelectionChangeEvent } from "../../src/text-edit/coordinator/types";

// =============================================================================
// Test fixtures
// =============================================================================

const STYLE_A: RunProperties = {
  bold: true,
  fontSize: pt(24),
  color: { spec: { type: "srgb", value: "C0392B" } },
};

const STYLE_B: RunProperties = {
  italic: true,
  fontSize: pt(12),
  color: { spec: { type: "srgb", value: "2980B9" } },
};

const INITIAL_TEXT_BODY: TextBody = {
  bodyProperties: {},
  paragraphs: [
    {
      properties: {},
      runs: [{ type: "text", text: "Aurochs", properties: STYLE_A }],
    },
    {
      properties: {},
      runs: [{ type: "text", text: "Office Document Toolkit", properties: STYLE_B }],
    },
  ],
};

const BOUNDS = {
  x: px(20),
  y: px(20),
  width: px(600),
  height: px(200),
  rotation: 0,
};

const COLOR_CONTEXT = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "1F497D",
    lt2: "EEECE1",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "9BBB59",
    accent4: "8064A2",
    accent5: "4BACC6",
    accent6: "F79646",
    hlink: "0000FF",
    folHlink: "800080",
  },
  colorMap: {
    tx1: "dk1" as const,
    tx2: "dk2" as const,
    bg1: "lt1" as const,
    bg2: "lt2" as const,
  },
};

// =============================================================================
// Window extensions for E2E inspection
// =============================================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, no-restricted-syntax -- interface required for global declaration merging
  interface Window {
    __textBody: TextBody;
    __lastComplete: string | null;
    __getRunsDebug: () => Array<{ text: string; properties: RunProperties | undefined }>;
  }
}

// =============================================================================
// App
// =============================================================================

function App() {
  const [textBody, setTextBody] = useState<TextBody>(INITIAL_TEXT_BODY);
  const [lastComplete, setLastComplete] = useState<string | null>(null);
  const textBodyRef = useRef(textBody);
  textBodyRef.current = textBody;

  // Expose for E2E
  useEffect(() => {
    window.__textBody = textBody;
    window.__getRunsDebug = () => {
      const body = textBodyRef.current;
      return body.paragraphs.flatMap((p, pi) =>
        p.runs
          .filter((r): r is { type: "text"; text: string; properties?: RunProperties } => r.type === "text")
          .map((r) => ({
            paragraph: pi,
            text: r.text,
            properties: r.properties,
          })),
      );
    };
  }, [textBody]);

  useEffect(() => {
    window.__lastComplete = lastComplete;
  }, [lastComplete]);

  const handleSelectionChange = useCallback((event: SelectionChangeEvent) => {
    setTextBody(event.textBody);
  }, []);

  const handleComplete = useCallback((text: string) => {
    setLastComplete(text);
  }, []);

  const handleCancel = useCallback(() => {}, []);

  return (
    <div style={{ width: 640, height: 240, position: "relative", border: "1px solid #ccc" }}>
      <TextEditController
        bounds={BOUNDS}
        textBody={textBody}
        colorContext={COLOR_CONTEXT}
        slideWidth={640}
        slideHeight={240}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

document.title = "ready";
