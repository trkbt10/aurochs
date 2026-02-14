/**
 * @file Main App component for ui-components preview
 */

import { useState, useMemo, useCallback, type CSSProperties, type ReactNode } from "react";
import type { Story } from "./types";
import { catalog } from "./stories";
import { Sidebar } from "./components/Sidebar";
import { StoryViewer } from "./components/StoryViewer";

// =============================================================================
// Styles
// =============================================================================

const appStyle: CSSProperties = {
  display: "flex",
  height: "100vh",
  width: "100vw",
  fontFamily: "system-ui, -apple-system, sans-serif",
  overflow: "hidden",
};

// =============================================================================
// URL State
// =============================================================================

function getInitialSelection(): { component: string | null; story: string | null } {
  const params = new URLSearchParams(window.location.search);
  const component = params.get("component");
  const story = params.get("story");

  // Validate that the component/story exists
  if (component) {
    for (const category of catalog) {
      const found = category.components.find((c) => c.name === component);
      if (found) {
        const storyExists = story && found.stories.some((s) => s.name === story);
        return {
          component,
          story: storyExists ? story : found.stories[0]?.name ?? null,
        };
      }
    }
  }

  // Default to first component
  const firstComponent = catalog[0]?.components[0];
  if (firstComponent) {
    return {
      component: firstComponent.name,
      story: firstComponent.stories[0]?.name ?? null,
    };
  }

  return { component: null, story: null };
}

function updateUrl(component: string, story: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("component", component);
  url.searchParams.set("story", story);
  window.history.replaceState(null, "", url.toString());
}

// =============================================================================
// Component
// =============================================================================

export function App(): ReactNode {
  const initial = useMemo(() => getInitialSelection(), []);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(initial.component);
  const [selectedStory, setSelectedStory] = useState<string | null>(initial.story);

  const handleSelect = useCallback((componentName: string, storyName: string) => {
    setSelectedComponent(componentName);
    setSelectedStory(storyName);
    updateUrl(componentName, storyName);
  }, []);

  // Find current story
  const currentStory = useMemo((): Story | null => {
    if (!selectedComponent || !selectedStory) return null;

    for (const category of catalog) {
      const component = category.components.find((c) => c.name === selectedComponent);
      if (component) {
        const story = component.stories.find((s) => s.name === selectedStory);
        return (story as Story) ?? null;
      }
    }
    return null;
  }, [selectedComponent, selectedStory]);

  return (
    <div style={appStyle}>
      <Sidebar
        catalog={catalog}
        selectedComponent={selectedComponent}
        selectedStory={selectedStory}
        onSelect={handleSelect}
      />
      <StoryViewer story={currentStory} componentName={selectedComponent} />
    </div>
  );
}
