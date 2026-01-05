/**
 * @file DrawingML Test Page
 *
 * Comprehensive test page for DrawingML rendering features.
 * Serves as a visual checklist for all DrawingML capabilities.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

import { useState } from "react";
import { RenderProvider } from "@lib/pptx/render/react/context";
import { SvgDefsProvider } from "@lib/pptx/render/react/hooks/useSvgDefs";
import {
  ColorTest,
  FillTest,
  LineTest,
  LineEndTest,
  EffectsTest,
  ShapesTest,
  CombinedTest,
  testSlideSize,
  testColorContext,
} from "./drawing-ml-tests";
import "./DrawingMLTestPage.css";

// =============================================================================
// Types
// =============================================================================

type DrawingMLTestPageProps = {
  readonly onBack: () => void;
};

type TestSection = "colors" | "fills" | "lines" | "lineEnds" | "effects" | "shapes" | "combined";

// =============================================================================
// Main Component
// =============================================================================

/**
 * DrawingML Test Page component.
 */
export function DrawingMLTestPage({ onBack }: DrawingMLTestPageProps) {
  const [activeSection, setActiveSection] = useState<TestSection>("colors");

  const sections: { id: TestSection; label: string }[] = [
    { id: "colors", label: "Colors" },
    { id: "fills", label: "Fills" },
    { id: "lines", label: "Lines" },
    { id: "lineEnds", label: "Arrows" },
    { id: "effects", label: "Effects" },
    { id: "shapes", label: "Shapes" },
    { id: "combined", label: "Combined" },
  ];

  return (
    <RenderProvider slideSize={testSlideSize} colorContext={testColorContext}>
      <SvgDefsProvider>
        <div className="drawingml-test-page">
          <header className="test-header">
            <button className="back-button" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
            <div className="header-info">
              <h1 className="test-title">DrawingML Coverage Checklist</h1>
              <span className="section-indicator">
                {sections.find((s) => s.id === activeSection)?.label} ({sections.findIndex((s) => s.id === activeSection) + 1}/{sections.length})
              </span>
            </div>
          </header>

          <nav className="test-nav" role="tablist" aria-label="Test sections">
            {sections.map((section) => (
              <button
                key={section.id}
                role="tab"
                aria-selected={activeSection === section.id}
                className={`nav-button ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <main className="test-content">
            {activeSection === "colors" && <ColorTest />}
            {activeSection === "fills" && <FillTest />}
            {activeSection === "lines" && <LineTest />}
            {activeSection === "lineEnds" && <LineEndTest />}
            {activeSection === "effects" && <EffectsTest />}
            {activeSection === "shapes" && <ShapesTest />}
            {activeSection === "combined" && <CombinedTest />}
          </main>
        </div>
      </SvgDefsProvider>
    </RenderProvider>
  );
}
