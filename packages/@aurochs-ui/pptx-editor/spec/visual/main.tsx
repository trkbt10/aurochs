/**
 * @file Visual test entry point for SlideShareViewer and EmbeddableSlide
 */

import { createRoot } from "react-dom/client";
import { SlideShareViewer } from "../../src/viewer/SlideShareViewer";
import { EmbeddableSlide } from "../../src/viewer/EmbeddableSlide";

const mockSlideSize = { width: 960, height: 540 };

function getMockSlideContent(index: number): string {
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
  const color = colors[(index - 1) % colors.length];
  // Mimic real SVG output: fixed pixel dimensions with viewBox (no preserveAspectRatio)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <rect width="960" height="540" fill="${color}"/>
    <text x="480" y="270" text-anchor="middle" dominant-baseline="middle"
          font-size="72" fill="white" font-family="system-ui">
      Slide ${index}
    </text>
  </svg>`;
}

// Get component from URL params: ?component=embeddable
const params = new URLSearchParams(window.location.search);
const component = params.get("component") || "slideshare";

function App() {
  if (component === "embeddable") {
    return (
      <div style={{ padding: "20px", height: "100vh", boxSizing: "border-box" }}>
        <EmbeddableSlide
          slideCount={5}
          slideSize={mockSlideSize}
          getSlideContent={getMockSlideContent}
          showNavigation
          showIndicator
          showProgress
          maxWidth="100%"
          maxHeight="calc(100vh - 40px)"
        />
      </div>
    );
  }

  return (
    <SlideShareViewer
      slideCount={5}
      slideSize={mockSlideSize}
      getSlideContent={getMockSlideContent}
      title="Test Presentation"
      author="Visual Test"
      enableSlideshow
      enableFullscreen
      style={{ height: "100vh" }}
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
