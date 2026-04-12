/**
 * @file EditorShell responsive layout test page
 *
 * Provides a resizable container to exercise desktop / tablet / mobile
 * layout modes and verify drawer toggle integration in the toolbar.
 */

import { useState, useRef, useCallback, type CSSProperties } from "react";
import { EditorShell, useEditorShellContext, type EditorPanel } from "../editor-shell";
import { GalleryVerticalIcon, SettingsIcon } from "@aurochs-ui/ui-components/icons";

// =============================================================================
// Mock content
// =============================================================================

const slideListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 8,
};

const slideItemStyle: CSSProperties = {
  height: 56,
  borderRadius: 4,
  backgroundColor: "var(--bg-tertiary, #222)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  color: "var(--text-secondary, #888)",
};

function MockSlideList({ onSelect }: { readonly onSelect?: (index: number) => void }) {
  const shell = useEditorShellContext();
  const handleClick = useCallback(
    (index: number) => {
      onSelect?.(index);
      // Navigation action → dismiss drawer so canvas is revealed
      shell?.dismissDrawer("left");
    },
    [onSelect, shell],
  );

  return (
    <div style={slideListStyle}>
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          style={{ ...slideItemStyle, cursor: "pointer" }}
          onClick={() => handleClick(i)}
          role="button"
          tabIndex={0}
        >
          Slide {i + 1}
        </div>
      ))}
    </div>
  );
}

const inspectorStyle: CSSProperties = {
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  fontSize: 12,
  color: "var(--text-secondary, #888)",
};

function MockInspector() {
  return (
    <div style={inspectorStyle}>
      <div style={{ fontWeight: 600, color: "var(--text-primary, #fff)" }}>Properties</div>
      <div>Width: 960 px</div>
      <div>Height: 540 px</div>
      <div>X: 120 px</div>
      <div>Y: 80 px</div>
      <div style={{ borderTop: "1px solid var(--border-subtle, #333)", paddingTop: 8, marginTop: 4 }}>
        <div style={{ fontWeight: 600, color: "var(--text-primary, #fff)", marginBottom: 8 }}>Fill</div>
        <div>Solid: #4A90D9</div>
      </div>
    </div>
  );
}

function MockToolbar() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12 }}>
      <button type="button" style={mockBtnStyle}>Undo</button>
      <button type="button" style={mockBtnStyle}>Redo</button>
      <span style={{ width: 1, height: 16, backgroundColor: "var(--border-subtle, #333)" }} />
      <button type="button" style={mockBtnStyle}>Rect</button>
      <button type="button" style={mockBtnStyle}>Ellipse</button>
      <button type="button" style={mockBtnStyle}>Text</button>
      <span style={{ flex: 1 }} />
      <span style={{ color: "var(--text-tertiary, #666)", fontSize: 11 }}>100%</span>
    </div>
  );
}

const mockBtnStyle: CSSProperties = {
  padding: "4px 8px",
  border: "1px solid var(--border-subtle, #333)",
  borderRadius: 4,
  backgroundColor: "transparent",
  color: "var(--text-primary, #fff)",
  cursor: "pointer",
  fontSize: 11,
};

const canvasStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "var(--bg-tertiary, #1a1a1a)",
  color: "var(--text-tertiary, #666)",
  fontSize: 14,
};

function MockCanvas({ activeSlide }: { readonly activeSlide: number }) {
  return <div style={canvasStyle}>Canvas — Slide {activeSlide + 1}</div>;
}

// =============================================================================
// Resizable container
// =============================================================================

const INITIAL_WIDTH = 1100;
const MIN_WIDTH = 320;
const MAX_WIDTH = 1400;

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  height: "100%",
  minHeight: 0,
};

const controlBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexShrink: 0,
};

const widthLabelStyle: CSSProperties = {
  fontSize: 12,
  fontFamily: "var(--font-mono, monospace)",
  color: "var(--text-secondary, #888)",
  minWidth: 80,
};

const modeLabelStyle: CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 4,
  fontWeight: 600,
};

const previewContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  border: "2px dashed var(--border-subtle, #333)",
  borderRadius: 8,
  overflow: "hidden",
  position: "relative",
};

const resizeHandleStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  width: 8,
  height: "100%",
  cursor: "ew-resize",
  backgroundColor: "transparent",
  zIndex: 1000,
};

function getModeName(width: number): { mode: string; color: string } {
  if (width <= 768) return { mode: "mobile", color: "#e06c75" };
  if (width <= 1024) return { mode: "tablet", color: "#e5c07b" };
  return { mode: "desktop", color: "#98c379" };
}

// =============================================================================
// Page
// =============================================================================

/** Interactive test page for EditorShell responsive layout. */
export function EditorShellPage() {
  const [containerWidth, setContainerWidth] = useState(INITIAL_WIDTH);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: containerWidth };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startWidth + delta));
      setContainerWidth(next);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [containerWidth]);

  const { mode, color } = getModeName(containerWidth);
  const [activeSlide, setActiveSlide] = useState(0);

  const panels: EditorPanel[] = [
    {
      id: "slides",
      position: "left",
      content: <MockSlideList onSelect={setActiveSlide} />,
      drawerIcon: GalleryVerticalIcon,
      drawerLabel: "Slides",
      scrollable: true,
    },
    {
      id: "inspector",
      position: "right",
      content: <MockInspector />,
      drawerIcon: SettingsIcon,
      drawerLabel: "Inspector",
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={controlBarStyle}>
        <input
          type="range"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          value={containerWidth}
          onChange={(e) => setContainerWidth(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={widthLabelStyle}>{containerWidth}px</span>
        <span style={{ ...modeLabelStyle, backgroundColor: color, color: "#000" }}>{mode}</span>
      </div>
      <div style={{ ...previewContainerStyle, width: containerWidth, maxWidth: "100%" }}>
        <div style={{ width: "100%", height: "100%" }}>
          <EditorShell
            toolbar={<MockToolbar />}
            panels={panels}
          >
            <MockCanvas activeSlide={activeSlide} />
          </EditorShell>
        </div>
        <div style={resizeHandleStyle} onMouseDown={handleMouseDown} />
      </div>
    </div>
  );
}
