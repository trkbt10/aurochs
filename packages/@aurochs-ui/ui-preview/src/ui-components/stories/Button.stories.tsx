/**
 * @file Button component stories
 */

import { useState } from "react";
import { Button, type ButtonSize } from "@aurochs-ui/ui-components/primitives/Button";
import type { ButtonVariant } from "@aurochs-ui/ui-components/types";
import { PlayIcon, DownloadIcon, SettingsIcon } from "@aurochs-ui/ui-components/icons";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story
// =============================================================================

type InteractiveProps = {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
};

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: ({ variant, size, disabled }) => (
    <Button variant={variant} size={size} disabled={disabled} onClick={() => alert("Clicked!")}>
      Click me
    </Button>
  ),
  controls: {
    variant: {
      label: "Variant",
      control: { type: "select", options: ["primary", "secondary", "ghost", "outline"] },
      defaultValue: "primary",
    },
    size: {
      label: "Size",
      control: { type: "select", options: ["sm", "md", "lg"] },
      defaultValue: "md",
    },
    disabled: {
      label: "Disabled",
      control: { type: "boolean" },
      defaultValue: false,
    },
  },
  defaultProps: {
    variant: "primary",
    size: "md",
    disabled: false,
  },
};

// =============================================================================
// Variant Gallery
// =============================================================================

const variantGalleryStory: Story = {
  name: "Variants",
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};

// =============================================================================
// Size Gallery
// =============================================================================

const sizeGalleryStory: Story = {
  name: "Sizes",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="md">Medium</Button>
      <Button variant="primary" size="lg">Large</Button>
    </div>
  ),
};

// =============================================================================
// With Icons
// =============================================================================

const withIconsStory: Story = {
  name: "With Icons",
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button variant="primary">
        <PlayIcon size={14} /> Play
      </Button>
      <Button variant="secondary">
        <DownloadIcon size={14} /> Download
      </Button>
      <Button variant="ghost">
        <SettingsIcon size={14} /> Settings
      </Button>
    </div>
  ),
};

// =============================================================================
// States
// =============================================================================

const statesStory: Story = {
  name: "States",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>NORMAL</div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>DISABLED</div>
        <div style={{ display: "flex", gap: 12 }}>
          <Button variant="primary" disabled>Primary</Button>
          <Button variant="secondary" disabled>Secondary</Button>
        </div>
      </div>
    </div>
  ),
};

// =============================================================================
// Export
// =============================================================================

export const ButtonStories: ComponentEntry = {
  name: "Button",
  description: "Primary action button with variants and sizes.",
  stories: [interactiveStory, variantGalleryStory, sizeGalleryStory, withIconsStory, statesStory],
};
