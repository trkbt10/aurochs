/**
 * @file Editor Test Page
 *
 * Test page for visually verifying PPTX editor components.
 * Organized by editor category with tab navigation.
 */

import { useState, type CSSProperties } from "react";
import { Button } from "@lib/pptx-editor";
import {
  ColorEditorsTest,
  PrimitiveEditorsTest,
  TextEditorsTest,
  ShapeEditorsTest,
  TableEditorsTest,
  ChartEditorsTest,
  UIComponentsTest,
  SlideEditorTest,
  PresentationEditorTest,
  ThemeEditorTest,
} from "../components/editor-tests";

type EditorTestPageProps = {
  readonly onBack: () => void;
};

type TabId = "presentation" | "slide" | "primitives" | "colors" | "text" | "shapes" | "tables" | "charts" | "ui" | "theme";

type Tab = {
  readonly id: TabId;
  readonly label: string;
};

const tabs: readonly Tab[] = [
  { id: "presentation", label: "Presentation" },
  { id: "slide", label: "Slide Editor" },
  { id: "primitives", label: "Primitives" },
  { id: "colors", label: "Colors" },
  { id: "text", label: "Text" },
  { id: "shapes", label: "Shapes" },
  { id: "tables", label: "Tables" },
  { id: "charts", label: "Charts" },
  { id: "ui", label: "UI Components" },
  { id: "theme", label: "Theme" },
];

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
  padding: "24px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "24px",
  paddingBottom: "16px",
  borderBottom: "1px solid var(--border-subtle)",
};

const titleStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
};

const tabsContainerStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "24px",
};

const tabButtonStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
  transition: "all 150ms ease",
};

const tabButtonActiveStyle: CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: "var(--accent-blue, #0070f3)",
  color: "white",
};

const tabButtonInactiveStyle: CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: "var(--bg-tertiary)",
  color: "var(--text-secondary)",
};

/**
 * Tab button component
 */
function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={isActive ? tabButtonActiveStyle : tabButtonInactiveStyle}
      onClick={onClick}
    >
      {tab.label}
    </button>
  );
}

/**
 * Tab content renderer
 */
function TabContent({ activeTab }: { activeTab: TabId }) {
  switch (activeTab) {
    case "presentation":
      return <PresentationEditorTest />;
    case "slide":
      return <SlideEditorTest />;
    case "primitives":
      return <PrimitiveEditorsTest />;
    case "colors":
      return <ColorEditorsTest />;
    case "text":
      return <TextEditorsTest />;
    case "shapes":
      return <ShapeEditorsTest />;
    case "tables":
      return <TableEditorsTest />;
    case "charts":
      return <ChartEditorsTest />;
    case "ui":
      return <UIComponentsTest />;
    case "theme":
      return <ThemeEditorTest />;
  }
}

/**
 * Editor test page main component
 */
export function EditorTestPage({ onBack }: EditorTestPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("presentation");

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>Editor Components Test</h1>
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
      </header>

      {/* Tab Navigation */}
      <nav style={tabsContainerStyle}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {/* Tab Content */}
      <TabContent activeTab={activeTab} />
    </div>
  );
}
