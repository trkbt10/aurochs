/**
 * @file Player component stories
 *
 * Player is a fully controlled component - all state is external.
 * The presence of callbacks determines available actions:
 * - onPause provided → playing state shows pause button
 * - onPause not provided → playing state shows running indicator
 */

import { useState, useCallback, useEffect } from "react";
import {
  Player,
  type PlayerState,
  type PlayerVariant,
  type PlayerAction,
} from "@aurochs-ui/ui-components/player";
import { SkipForwardIcon, SkipBackIcon } from "@aurochs-ui/ui-components/icons";
import type { ComponentEntry, Story } from "../types";

// =============================================================================
// Interactive Story - Simulates External State
// =============================================================================

type InteractiveProps = {
  variant: PlayerVariant;
  pausable: boolean;
  showActions: boolean;
};

/**
 * Simulates an external store/state manager.
 * In real usage, this would be Zustand, Redux, or React Context.
 */
function InteractivePlayer({ variant, pausable, showActions }: InteractiveProps) {
  // External state - in real app, this comes from a store
  const [state, setState] = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0);

  // Simulate async execution
  useEffect(() => {
    if (state !== "playing") return;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setState("completed");
          return 0;
        }
        return p + 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [state]);

  // Callbacks that modify external state
  const handlePlay = useCallback(() => {
    setState("playing");
    setProgress(0);
  }, []);

  const handlePause = useCallback(() => {
    setState("paused");
  }, []);

  const handleStop = useCallback(() => {
    setState("idle");
    setProgress(0);
  }, []);

  const leftActions: PlayerAction[] = showActions
    ? [{ id: "prev", icon: <SkipBackIcon size={18} />, label: "Previous", onClick: () => {} }]
    : [];

  const rightActions: PlayerAction[] = showActions
    ? [{ id: "next", icon: <SkipForwardIcon size={18} />, label: "Next", onClick: () => {} }]
    : [];

  return (
    <div>
      <Player
        state={state}
        media={{ title: "SampleMacro", subtitle: `State: ${state}` }}
        variant={variant}
        progress={state === "playing" ? progress : undefined}
        onPlay={handlePlay}
        onPause={pausable ? handlePause : undefined}
        onStop={handleStop}
        leftActions={leftActions}
        rightActions={rightActions}
      />
      <p style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        Progress: {progress}% | Pausable: {pausable ? "Yes" : "No"}
      </p>
    </div>
  );
}

const interactiveStory: Story<InteractiveProps> = {
  name: "Interactive",
  render: (props) => <InteractivePlayer {...props} />,
  controls: {
    variant: {
      label: "Variant",
      control: { type: "select", options: ["panel", "toolbar", "floating"] },
      defaultValue: "panel",
    },
    pausable: {
      label: "Pausable",
      control: { type: "boolean" },
      defaultValue: true,
    },
    showActions: {
      label: "Show Actions",
      control: { type: "boolean" },
      defaultValue: false,
    },
  },
  defaultProps: {
    variant: "panel",
    pausable: true,
    showActions: false,
  },
};

// =============================================================================
// State Gallery - Shows Each State
// =============================================================================

type StateGalleryProps = {
  pausable: boolean;
};

function StateGallery({ pausable }: StateGalleryProps) {
  const states: PlayerState[] = ["idle", "playing", "paused", "completed", "error"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {states.map((state) => (
        <div key={state}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 4, textTransform: "uppercase" }}>
            {state}
          </div>
          <Player
            state={state}
            media={{
              title: state === "error" ? "FailedMacro" : "SampleMacro",
              subtitle: `Module1`,
            }}
            error={state === "error" ? { message: "Runtime error 1004", detail: "Range not found" } : undefined}
            variant="panel"
            progress={state === "playing" ? 45 : undefined}
            onPlay={() => {}}
            onPause={pausable ? () => {} : undefined}
            onStop={() => {}}
          />
        </div>
      ))}
    </div>
  );
}

const stateGalleryStory: Story<StateGalleryProps> = {
  name: "State Gallery",
  render: (props) => <StateGallery {...props} />,
  controls: {
    pausable: {
      label: "Pausable (affects playing state)",
      control: { type: "boolean" },
      defaultValue: true,
    },
  },
  defaultProps: {
    pausable: true,
  },
};

// =============================================================================
// Variant Stories
// =============================================================================

const panelStory: Story = {
  name: "Panel Variant",
  render: () => (
    <Player
      state="idle"
      media={{ title: "CalculateTotal", subtitle: "SheetModule" }}
      variant="panel"
      onPlay={() => {}}
      onStop={() => {}}
    />
  ),
};

const toolbarStory: Story = {
  name: "Toolbar Variant",
  render: () => (
    <Player
      state="playing"
      media={{ title: "RefreshData", subtitle: "DataModule" }}
      variant="toolbar"
      onPlay={() => {}}
      onPause={() => {}}
      onStop={() => {}}
    />
  ),
};

const floatingStory: Story = {
  name: "Floating Variant",
  render: () => (
    <Player
      state="playing"
      media={{ title: "Animation Preview", subtitle: "Slide 1 of 10" }}
      variant="floating"
      progress={35}
      leftActions={[
        { id: "prev", icon: <SkipBackIcon size={18} />, label: "Previous", onClick: () => {} },
      ]}
      rightActions={[
        { id: "next", icon: <SkipForwardIcon size={18} />, label: "Next", onClick: () => {} },
      ]}
      onPlay={() => {}}
      onPause={() => {}}
      onStop={() => {}}
    />
  ),
  darkBackground: true,
};

// =============================================================================
// Non-pausable (VBA style)
// =============================================================================

const vbaStyleStory: Story = {
  name: "VBA Style (Non-pausable)",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>IDLE - Ready to run</div>
        <Player
          state="idle"
          media={{ title: "UpdateReport", subtitle: "ReportModule" }}
          variant="panel"
          onPlay={() => {}}
          onStop={() => {}}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>PLAYING - Running (no pause)</div>
        <Player
          state="playing"
          media={{ title: "UpdateReport", subtitle: "ReportModule" }}
          variant="panel"
          onPlay={() => {}}
          // No onPause - shows running indicator instead of pause button
          onStop={() => {}}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>COMPLETED - Can replay</div>
        <Player
          state="completed"
          media={{ title: "UpdateReport", subtitle: "Completed successfully" }}
          variant="panel"
          onPlay={() => {}}
          onStop={() => {}}
        />
      </div>
    </div>
  ),
};

// =============================================================================
// Music Player Style (Pausable)
// =============================================================================

const musicStyleStory: Story = {
  name: "Music Style (Pausable)",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>IDLE</div>
        <Player
          state="idle"
          media={{ title: "Bohemian Rhapsody", subtitle: "Queen" }}
          variant="panel"
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>PLAYING</div>
        <Player
          state="playing"
          media={{ title: "Bohemian Rhapsody", subtitle: "Queen" }}
          variant="panel"
          progress={33}
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>PAUSED</div>
        <Player
          state="paused"
          media={{ title: "Bohemian Rhapsody", subtitle: "Queen" }}
          variant="panel"
          progress={33}
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
        />
      </div>
    </div>
  ),
};

// =============================================================================
// Export
// =============================================================================

export const PlayerStories: ComponentEntry = {
  name: "Player",
  description: "Fully controlled music-player style UI. State is external, callbacks determine available actions.",
  stories: [
    interactiveStory,
    stateGalleryStory,
    vbaStyleStory,
    musicStyleStory,
    panelStory,
    toolbarStory,
    floatingStory,
  ],
};
