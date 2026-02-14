/**
 * @file Sidebar navigation for component catalog
 */

import type { CSSProperties, ReactNode } from "react";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { Category } from "../types";

// =============================================================================
// Styles
// =============================================================================

const sidebarStyle: CSSProperties = {
  width: 240,
  height: "100%",
  background: colorTokens.background.secondary,
  borderRight: `1px solid ${colorTokens.border.subtle}`,
  overflow: "auto",
  flexShrink: 0,
};

const headerStyle: CSSProperties = {
  padding: "16px 16px 12px",
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: colorTokens.text.primary,
};

const subtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 11,
  color: colorTokens.text.tertiary,
};

const categoryStyle: CSSProperties = {
  padding: "12px 0",
};

const categoryTitleStyle: CSSProperties = {
  padding: "0 16px 8px",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: colorTokens.text.tertiary,
};

const componentItemStyle: CSSProperties = {
  padding: "6px 16px 6px 24px",
  fontSize: 13,
  color: colorTokens.text.secondary,
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};

const componentItemActiveStyle: CSSProperties = {
  ...componentItemStyle,
  background: colorTokens.accent.primary,
  color: colorTokens.text.inverse,
};

const storyItemStyle: CSSProperties = {
  padding: "4px 16px 4px 40px",
  fontSize: 12,
  color: colorTokens.text.tertiary,
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};

const storyItemActiveStyle: CSSProperties = {
  ...storyItemStyle,
  background: colorTokens.background.hover,
  color: colorTokens.text.primary,
};

// =============================================================================
// Types
// =============================================================================

export type SidebarProps = {
  readonly catalog: readonly Category[];
  readonly selectedComponent: string | null;
  readonly selectedStory: string | null;
  readonly onSelect: (componentName: string, storyName: string) => void;
};

// =============================================================================
// Component
// =============================================================================

export function Sidebar({
  catalog,
  selectedComponent,
  selectedStory,
  onSelect,
}: SidebarProps): ReactNode {
  return (
    <aside style={sidebarStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>UI Components</h1>
        <p style={subtitleStyle}>@aurochs-ui/ui-components</p>
      </header>

      {catalog.map((category) => (
        <div key={category.name} style={categoryStyle}>
          <div style={categoryTitleStyle}>{category.name}</div>

          {category.components.map((component) => {
            const isComponentActive = selectedComponent === component.name;

            return (
              <div key={component.name}>
                <div
                  style={isComponentActive ? componentItemActiveStyle : componentItemStyle}
                  onClick={() => onSelect(component.name, component.stories[0]?.name ?? "")}
                >
                  {component.name}
                </div>

                {isComponentActive &&
                  component.stories.map((story) => (
                    <div
                      key={story.name}
                      style={
                        selectedStory === story.name ? storyItemActiveStyle : storyItemStyle
                      }
                      onClick={() => onSelect(component.name, story.name)}
                    >
                      {story.name}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
