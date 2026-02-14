/**
 * @file NavigationControls component stories
 */

import { useState } from "react";
import { NavigationControls, type NavigationControlsVariant } from "@aurochs-ui/ui-components/viewer/NavigationControls";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story
// =============================================================================

type InteractiveProps = {
  variant: NavigationControlsVariant;
};

function InteractiveNav({ variant }: InteractiveProps) {
  const [current, setCurrent] = useState(3);
  const total = 10;

  return (
    <div
      style={{
        position: "relative",
        width: 400,
        height: 200,
        background: variant === "overlay" ? "#333" : "#f5f5f5",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: variant === "overlay" ? "#fff" : "#333", fontSize: 24 }}>
        {current} / {total}
      </span>
      <NavigationControls
        onPrev={() => setCurrent((c) => Math.max(1, c - 1))}
        onNext={() => setCurrent((c) => Math.min(total, c + 1))}
        canGoPrev={current > 1}
        canGoNext={current < total}
        variant={variant}
      />
    </div>
  );
}

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: (props) => <InteractiveNav {...props} />,
  controls: {
    variant: {
      label: "Variant",
      control: { type: "select", options: ["overlay", "inline", "minimal"] },
      defaultValue: "overlay",
    },
  },
  defaultProps: {
    variant: "overlay",
  },
};

// =============================================================================
// Overlay Variant
// =============================================================================

const overlayStory: Story = {
  name: "Overlay Variant",
  render: () => (
    <div
      style={{
        position: "relative",
        width: 400,
        height: 200,
        background: "#1a1a1a",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#fff", fontSize: 18 }}>Slide Content</span>
      <NavigationControls
        onPrev={() => {}}
        onNext={() => {}}
        canGoPrev={true}
        canGoNext={true}
        variant="overlay"
      />
    </div>
  ),
  darkBackground: true,
};

// =============================================================================
// Inline Variant
// =============================================================================

const inlineStory: Story = {
  name: "Inline Variant",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <NavigationControls
        onPrev={() => {}}
        onNext={() => {}}
        canGoPrev={true}
        canGoNext={true}
        variant="inline"
      />
      <span style={{ color: "#666" }}>3 / 10</span>
    </div>
  ),
};

// =============================================================================
// Minimal Variant
// =============================================================================

const minimalStory: Story = {
  name: "Minimal Variant",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <NavigationControls
        onPrev={() => {}}
        onNext={() => {}}
        canGoPrev={true}
        canGoNext={true}
        variant="minimal"
      />
      <span style={{ color: "#999", fontSize: 12 }}>Page 3 of 10</span>
    </div>
  ),
};

// =============================================================================
// Disabled States
// =============================================================================

const disabledStatesStory: Story = {
  name: "Disabled States",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>FIRST ITEM (prev disabled)</div>
        <NavigationControls
          onPrev={() => {}}
          onNext={() => {}}
          canGoPrev={false}
          canGoNext={true}
          variant="inline"
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>LAST ITEM (next disabled)</div>
        <NavigationControls
          onPrev={() => {}}
          onNext={() => {}}
          canGoPrev={true}
          canGoNext={false}
          variant="inline"
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>SINGLE ITEM (both disabled)</div>
        <NavigationControls
          onPrev={() => {}}
          onNext={() => {}}
          canGoPrev={false}
          canGoNext={false}
          variant="inline"
        />
      </div>
    </div>
  ),
};

// =============================================================================
// Export
// =============================================================================

export const NavigationControlsStories: ComponentEntry = {
  name: "NavigationControls",
  description: "Prev/Next navigation buttons for viewers.",
  stories: [interactiveStory, overlayStory, inlineStory, minimalStory, disabledStatesStory],
};
