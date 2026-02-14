/**
 * @file Input component stories
 */

import { useState } from "react";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story
// =============================================================================

type InteractiveProps = {
  type: "text" | "number";
  disabled: boolean;
  showSuffix: boolean;
};

function InteractiveInput({ type, disabled, showSuffix }: InteractiveProps) {
  const [value, setValue] = useState<string | number>(type === "number" ? 50 : "Hello");

  return (
    <div style={{ maxWidth: 200 }}>
      <Input
        value={value}
        onChange={setValue}
        type={type}
        suffix={showSuffix ? (type === "number" ? "px" : "") : undefined}
        placeholder={type === "text" ? "Enter text..." : undefined}
        disabled={disabled}
      />
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        Value: {JSON.stringify(value)}
      </p>
    </div>
  );
}

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: (props) => <InteractiveInput {...props} />,
  controls: {
    type: {
      label: "Type",
      control: { type: "select", options: ["text", "number"] },
      defaultValue: "text",
    },
    disabled: {
      label: "Disabled",
      control: { type: "boolean" },
      defaultValue: false,
    },
    showSuffix: {
      label: "Show Suffix",
      control: { type: "boolean" },
      defaultValue: false,
    },
  },
  defaultProps: {
    type: "text",
    disabled: false,
    showSuffix: false,
  },
};

// =============================================================================
// Text Input
// =============================================================================

function TextInputDemo() {
  const [value, setValue] = useState("Sample text");
  return (
    <div style={{ maxWidth: 250 }}>
      <Input value={value} onChange={(v) => setValue(String(v))} placeholder="Enter text..." />
    </div>
  );
}

const textInputStory: Story = {
  name: "Text Input",
  render: () => <TextInputDemo />,
};

// =============================================================================
// Number Input with Suffix
// =============================================================================

function NumberInputDemo() {
  const [value, setValue] = useState(16);
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ width: 80 }}>
        <Input value={value} onChange={(v) => setValue(Number(v))} type="number" suffix="px" />
      </div>
      <div style={{ width: 80 }}>
        <Input value={50} onChange={() => {}} type="number" suffix="%" />
      </div>
      <div style={{ width: 80 }}>
        <Input value={1.5} onChange={() => {}} type="number" suffix="em" step={0.1} />
      </div>
    </div>
  );
}

const numberInputStory: Story = {
  name: "Number with Suffix",
  render: () => <NumberInputDemo />,
};

// =============================================================================
// Width Variants
// =============================================================================

const widthVariantsStory: Story = {
  name: "Width Variants",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>AUTO WIDTH (fills container)</div>
        <div style={{ width: 300 }}>
          <Input value="Full width" onChange={() => {}} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>FIXED WIDTH (100px)</div>
        <Input value="100px" onChange={() => {}} width={100} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>FIXED WIDTH (200px)</div>
        <Input value="200px" onChange={() => {}} width={200} />
      </div>
    </div>
  ),
};

// =============================================================================
// States
// =============================================================================

const statesStory: Story = {
  name: "States",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 200 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>NORMAL</div>
        <Input value="Normal input" onChange={() => {}} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>DISABLED</div>
        <Input value="Disabled input" onChange={() => {}} disabled />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>READ ONLY</div>
        <Input value="Read only input" onChange={() => {}} readOnly />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>PLACEHOLDER</div>
        <Input value="" onChange={() => {}} placeholder="Enter something..." />
      </div>
    </div>
  ),
};

// =============================================================================
// Export
// =============================================================================

export const InputStories: ComponentEntry = {
  name: "Input",
  description: "Text and number input with optional suffix.",
  stories: [interactiveStory, textInputStory, numberInputStory, widthVariantsStory, statesStory],
};
