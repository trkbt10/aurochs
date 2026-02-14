/**
 * @file Tabs component stories
 */

import { useState } from "react";
import { Tabs, type TabItem } from "@aurochs-ui/ui-components/primitives/Tabs";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story
// =============================================================================

type InteractiveProps = {
  size: "sm" | "md";
  tabCount: number;
};

function InteractiveTabs({ size, tabCount }: InteractiveProps) {
  const [activeTab, setActiveTab] = useState("tab1");

  const items: TabItem[] = Array.from({ length: tabCount }, (_, i) => ({
    id: `tab${i + 1}`,
    label: `Tab ${i + 1}`,
    content: (
      <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 4 }}>
        Content for Tab {i + 1}
      </div>
    ),
  }));

  return (
    <div style={{ maxWidth: 400 }}>
      <Tabs items={items} value={activeTab} onChange={setActiveTab} size={size} />
    </div>
  );
}

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: (props) => <InteractiveTabs {...props} />,
  controls: {
    size: {
      label: "Size",
      control: { type: "select", options: ["sm", "md"] },
      defaultValue: "md",
    },
    tabCount: {
      label: "Tab Count",
      control: { type: "number", min: 2, max: 5 },
      defaultValue: 3,
    },
  },
  defaultProps: {
    size: "md",
    tabCount: 3,
  },
};

// =============================================================================
// Basic Example
// =============================================================================

const basicItems: TabItem[] = [
  { id: "general", label: "General", content: <div style={{ padding: 16 }}>General settings content</div> },
  { id: "appearance", label: "Appearance", content: <div style={{ padding: 16 }}>Appearance settings content</div> },
  { id: "advanced", label: "Advanced", content: <div style={{ padding: 16 }}>Advanced settings content</div> },
];

function BasicTabs() {
  const [tab, setTab] = useState("general");
  return (
    <div style={{ maxWidth: 400 }}>
      <Tabs items={basicItems} value={tab} onChange={setTab} />
    </div>
  );
}

const basicStory: Story = {
  name: "Basic",
  render: () => <BasicTabs />,
};

// =============================================================================
// With Disabled Tab
// =============================================================================

const itemsWithDisabled: TabItem[] = [
  { id: "active", label: "Active", content: <div style={{ padding: 16 }}>Active tab content</div> },
  { id: "disabled", label: "Disabled", content: <div style={{ padding: 16 }}>Disabled tab content</div>, disabled: true },
  { id: "another", label: "Another", content: <div style={{ padding: 16 }}>Another tab content</div> },
];

function TabsWithDisabled() {
  const [tab, setTab] = useState("active");
  return (
    <div style={{ maxWidth: 400 }}>
      <Tabs items={itemsWithDisabled} value={tab} onChange={setTab} />
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        The middle tab is disabled and cannot be selected.
      </p>
    </div>
  );
}

const withDisabledStory: Story = {
  name: "With Disabled Tab",
  render: () => <TabsWithDisabled />,
};

// =============================================================================
// Size Comparison
// =============================================================================

const sizeComparisonStory: Story = {
  name: "Sizes",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 400 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>SMALL</div>
        <Tabs
          items={[
            { id: "a", label: "Tab A", content: <div style={{ padding: 8 }}>Small tab content</div> },
            { id: "b", label: "Tab B", content: null },
          ]}
          defaultValue="a"
          size="sm"
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>MEDIUM (default)</div>
        <Tabs
          items={[
            { id: "a", label: "Tab A", content: <div style={{ padding: 8 }}>Medium tab content</div> },
            { id: "b", label: "Tab B", content: null },
          ]}
          defaultValue="a"
          size="md"
        />
      </div>
    </div>
  ),
};

// =============================================================================
// Export
// =============================================================================

export const TabsStories: ComponentEntry = {
  name: "Tabs",
  description: "Tab panel for switching between content sections.",
  stories: [interactiveStory, basicStory, withDisabledStory, sizeComparisonStory],
};
