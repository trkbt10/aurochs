/**
 * @file IconButton component stories
 */

import { IconButton, type IconButtonSize } from "@aurochs-ui/ui-components/primitives/IconButton";
import type { ButtonVariant } from "@aurochs-ui/ui-components/types";
import {
  PlayIcon,
  SettingsIcon,
  DownloadIcon,
  TrashIcon,
  EditIcon,
  AddIcon,
  CloseIcon,
} from "@aurochs-ui/ui-components/icons";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story
// =============================================================================

type InteractiveProps = {
  variant: ButtonVariant;
  size: IconButtonSize;
  showLabel: boolean;
  disabled: boolean;
};

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: ({ variant, size, showLabel, disabled }) => (
    <IconButton
      icon={<SettingsIcon size={size === "sm" ? 14 : size === "md" ? 16 : 18} />}
      label={showLabel ? "Settings" : undefined}
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={() => alert("Clicked!")}
    />
  ),
  controls: {
    variant: {
      label: "Variant",
      control: { type: "select", options: ["primary", "secondary", "ghost", "outline"] },
      defaultValue: "ghost",
    },
    size: {
      label: "Size",
      control: { type: "select", options: ["sm", "md", "lg"] },
      defaultValue: "md",
    },
    showLabel: {
      label: "Show Label",
      control: { type: "boolean" },
      defaultValue: false,
    },
    disabled: {
      label: "Disabled",
      control: { type: "boolean" },
      defaultValue: false,
    },
  },
  defaultProps: {
    variant: "ghost",
    size: "md",
    showLabel: false,
    disabled: false,
  },
};

// =============================================================================
// Icon Only Gallery
// =============================================================================

const iconOnlyStory: Story = {
  name: "Icon Only",
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <IconButton icon={<PlayIcon size={16} />} variant="primary" />
      <IconButton icon={<SettingsIcon size={16} />} variant="secondary" />
      <IconButton icon={<EditIcon size={16} />} variant="ghost" />
      <IconButton icon={<TrashIcon size={16} />} variant="outline" />
    </div>
  ),
};

// =============================================================================
// With Labels
// =============================================================================

const withLabelsStory: Story = {
  name: "With Labels",
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <IconButton icon={<AddIcon size={14} />} label="Add" variant="primary" />
      <IconButton icon={<DownloadIcon size={14} />} label="Download" variant="secondary" />
      <IconButton icon={<SettingsIcon size={14} />} label="Settings" variant="ghost" />
      <IconButton icon={<TrashIcon size={14} />} label="Delete" variant="outline" />
    </div>
  ),
};

// =============================================================================
// Size Comparison
// =============================================================================

const sizeComparisonStory: Story = {
  name: "Sizes",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>ICON ONLY</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconButton icon={<SettingsIcon size={12} />} size="sm" />
          <IconButton icon={<SettingsIcon size={14} />} size="md" />
          <IconButton icon={<SettingsIcon size={18} />} size="lg" />
          <span style={{ fontSize: 12, color: "#666", marginLeft: 8 }}>sm / md / lg</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>WITH LABEL</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconButton icon={<SettingsIcon size={12} />} label="Settings" size="sm" variant="secondary" />
          <IconButton icon={<SettingsIcon size={14} />} label="Settings" size="md" variant="secondary" />
          <IconButton icon={<SettingsIcon size={18} />} label="Settings" size="lg" variant="secondary" />
        </div>
      </div>
    </div>
  ),
};

// =============================================================================
// Toolbar Example
// =============================================================================

const toolbarExampleStory: Story = {
  name: "Toolbar Example",
  render: () => (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "4px 8px",
        background: "#f5f5f5",
        borderRadius: 4,
        width: "fit-content",
      }}
    >
      <IconButton icon={<EditIcon size={16} />} variant="ghost" />
      <IconButton icon={<TrashIcon size={16} />} variant="ghost" />
      <div style={{ width: 1, background: "#ddd", margin: "4px 4px" }} />
      <IconButton icon={<DownloadIcon size={16} />} variant="ghost" />
      <IconButton icon={<SettingsIcon size={16} />} variant="ghost" />
    </div>
  ),
};

// =============================================================================
// Export
// =============================================================================

export const IconButtonStories: ComponentEntry = {
  name: "IconButton",
  description: "Button with icon, optionally with label text.",
  stories: [interactiveStory, iconOnlyStory, withLabelsStory, sizeComparisonStory, toolbarExampleStory],
};
