/**
 * @file Slider component stories
 */

import { useState } from "react";
import { Slider } from "@aurochs-ui/ui-components/primitives/Slider";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story
// =============================================================================

type InteractiveProps = {
  min: number;
  max: number;
  step: number;
  showValue: boolean;
};

function InteractiveSlider({ min, max, step, showValue }: InteractiveProps) {
  const [value, setValue] = useState(50);

  return (
    <div style={{ maxWidth: 300 }}>
      <Slider
        value={value}
        onChange={setValue}
        min={min}
        max={max}
        step={step}
        showValue={showValue}
      />
    </div>
  );
}

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: (props) => <InteractiveSlider {...props} />,
  controls: {
    min: {
      label: "Min",
      control: { type: "number" },
      defaultValue: 0,
    },
    max: {
      label: "Max",
      control: { type: "number" },
      defaultValue: 100,
    },
    step: {
      label: "Step",
      control: { type: "number" },
      defaultValue: 1,
    },
    showValue: {
      label: "Show Value",
      control: { type: "boolean" },
      defaultValue: true,
    },
  },
  defaultProps: {
    min: 0,
    max: 100,
    step: 1,
    showValue: true,
  },
};

// =============================================================================
// With Suffix
// =============================================================================

function SliderWithSuffix() {
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(16);
  const [zoom, setZoom] = useState(100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 300 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>OPACITY</div>
        <Slider value={opacity} onChange={setOpacity} min={0} max={100} suffix="%" />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>FONT SIZE</div>
        <Slider value={fontSize} onChange={setFontSize} min={8} max={72} suffix="px" />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>ZOOM</div>
        <Slider value={zoom} onChange={setZoom} min={25} max={400} step={25} suffix="%" />
      </div>
    </div>
  );
}

const withSuffixStory: Story = {
  name: "With Suffix",
  render: () => <SliderWithSuffix />,
};

// =============================================================================
// Without Value Display
// =============================================================================

function SliderWithoutValue() {
  const [value, setValue] = useState(50);

  return (
    <div style={{ maxWidth: 200 }}>
      <Slider value={value} onChange={setValue} showValue={false} />
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        Current: {value}
      </p>
    </div>
  );
}

const withoutValueStory: Story = {
  name: "Without Value Display",
  render: () => <SliderWithoutValue />,
};

// =============================================================================
// States
// =============================================================================

const statesStory: Story = {
  name: "States",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 300 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>NORMAL</div>
        <Slider value={50} onChange={() => {}} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>DISABLED</div>
        <Slider value={50} onChange={() => {}} disabled />
      </div>
    </div>
  ),
};

// =============================================================================
// Export
// =============================================================================

export const SliderStories: ComponentEntry = {
  name: "Slider",
  description: "Range slider with optional value display and suffix.",
  stories: [interactiveStory, withSuffixStory, withoutValueStory, statesStory],
};
