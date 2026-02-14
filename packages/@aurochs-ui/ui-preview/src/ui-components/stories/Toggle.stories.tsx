/**
 * @file Toggle component stories
 */

import { useState } from "react";
import { Toggle } from "@aurochs-ui/ui-components/primitives/Toggle";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story
// =============================================================================

type InteractiveProps = {
  showLabel: boolean;
  disabled: boolean;
};

function InteractiveToggle({ showLabel, disabled }: InteractiveProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div>
      <Toggle
        checked={checked}
        onChange={setChecked}
        label={showLabel ? "Enable feature" : undefined}
        disabled={disabled}
      />
      <p style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
        State: {checked ? "ON" : "OFF"}
      </p>
    </div>
  );
}

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: (props) => <InteractiveToggle {...props} />,
  controls: {
    showLabel: {
      label: "Show Label",
      control: { type: "boolean" },
      defaultValue: true,
    },
    disabled: {
      label: "Disabled",
      control: { type: "boolean" },
      defaultValue: false,
    },
  },
  defaultProps: {
    showLabel: true,
    disabled: false,
  },
};

// =============================================================================
// States Gallery
// =============================================================================

const statesGalleryStory: Story = {
  name: "States",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>OFF</div>
        <Toggle checked={false} onChange={() => {}} label="Disabled feature" />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>ON</div>
        <Toggle checked={true} onChange={() => {}} label="Enabled feature" />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>DISABLED (OFF)</div>
        <Toggle checked={false} onChange={() => {}} label="Cannot toggle" disabled />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>DISABLED (ON)</div>
        <Toggle checked={true} onChange={() => {}} label="Locked on" disabled />
      </div>
    </div>
  ),
};

// =============================================================================
// Without Label
// =============================================================================

const withoutLabelStory: Story = {
  name: "Without Label",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Toggle checked={false} onChange={() => {}} />
      <Toggle checked={true} onChange={() => {}} />
    </div>
  ),
};

// =============================================================================
// Settings Example
// =============================================================================

function SettingsExample() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Toggle checked={darkMode} onChange={setDarkMode} label="Dark mode" />
      <Toggle checked={notifications} onChange={setNotifications} label="Enable notifications" />
      <Toggle checked={autoSave} onChange={setAutoSave} label="Auto-save" />
    </div>
  );
}

const settingsExampleStory: Story = {
  name: "Settings Example",
  render: () => <SettingsExample />,
};

// =============================================================================
// Export
// =============================================================================

export const ToggleStories: ComponentEntry = {
  name: "Toggle",
  description: "Toggle switch for boolean settings.",
  stories: [interactiveStory, statesGalleryStory, withoutLabelStory, settingsExampleStory],
};
