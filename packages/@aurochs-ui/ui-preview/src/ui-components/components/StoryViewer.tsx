/**
 * @file Story viewer component
 */

import { useState, useMemo, useCallback, type CSSProperties, type ReactNode } from "react";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { Story, ControlDef } from "../types";
import { Controls } from "./Controls";

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  padding: "12px 20px",
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  background: colorTokens.background.primary,
};

const storyNameStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  color: colorTokens.text.primary,
};

const canvasContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
};

const lightCanvasStyle: CSSProperties = {
  ...canvasContainerStyle,
  background: colorTokens.background.primary,
};

const darkCanvasStyle: CSSProperties = {
  ...canvasContainerStyle,
  background: "#1a1a1a",
};

const storyWrapperStyle: CSSProperties = {
  maxWidth: "100%",
};

const emptyStateStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: colorTokens.text.tertiary,
  fontSize: 14,
};

// =============================================================================
// Types
// =============================================================================

export type StoryViewerProps = {
  readonly story: Story | null;
  readonly componentName: string | null;
};

// =============================================================================
// Component
// =============================================================================

export function StoryViewer({ story, componentName }: StoryViewerProps): ReactNode {
  // Initialize props from controls
  const initialProps = useMemo(() => {
    if (!story?.controls) return {};

    const props: Record<string, unknown> = { ...story.defaultProps };
    for (const [key, def] of Object.entries(story.controls)) {
      if (def && props[key] === undefined) {
        props[key] = def.defaultValue;
      }
    }
    return props;
  }, [story]);

  const [props, setProps] = useState<Record<string, unknown>>(initialProps);

  // Reset props when story changes
  useMemo(() => {
    setProps(initialProps);
  }, [initialProps]);

  const handleControlChange = useCallback((key: string, value: unknown) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (!story || !componentName) {
    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>Select a component from the sidebar</div>
      </div>
    );
  }

  const canvasStyle = story.darkBackground ? darkCanvasStyle : lightCanvasStyle;
  const controls = (story.controls ?? {}) as Record<string, ControlDef<unknown>>;

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h2 style={storyNameStyle}>
          {componentName} / {story.name}
        </h2>
      </header>

      <div style={canvasStyle}>
        <div style={storyWrapperStyle}>{story.render(props)}</div>
      </div>

      <Controls controls={controls} values={props} onChange={handleControlChange} />
    </div>
  );
}
