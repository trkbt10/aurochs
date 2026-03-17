/**
 * @file OptionalPropertySection - Accordion section for optional shape properties
 *
 * Renders the editor when the property exists, or an "Add" button when undefined.
 * Single source of truth for the "optional property with default creation" pattern.
 */

import type { ReactNode, CSSProperties } from "react";
import { Accordion } from "@aurochs-ui/ui-components/layout";
import { Button } from "@aurochs-ui/ui-components/primitives";

// =============================================================================
// Types
// =============================================================================

export type OptionalPropertySectionProps<T> = {
  /** Accordion title */
  readonly title: string;
  /** Current property value (undefined = not set) */
  readonly value: T | undefined;
  /** Factory function to create default value when "Add" is clicked */
  readonly createDefault: () => T;
  /** Called when property is added or updated */
  readonly onChange: (value: T) => void;
  /** Render the editor for the property value */
  readonly renderEditor: (value: T, onChange: (value: T) => void) => ReactNode;
  /** Whether the accordion is expanded by default */
  readonly defaultExpanded?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const addButtonContainerStyle: CSSProperties = {
  padding: "12px 16px",
  textAlign: "center",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Accordion section that handles optional properties.
 * Shows the editor when the property exists, or an "Add" button to create it with defaults.
 */
export function OptionalPropertySection<T>({
  title,
  value,
  createDefault,
  onChange,
  renderEditor,
  defaultExpanded = false,
}: OptionalPropertySectionProps<T>) {
  function renderContent() {
    if (value !== undefined) {
      return renderEditor(value, onChange);
    }
    return (
      <div style={addButtonContainerStyle}>
        <Button variant="secondary" size="sm" onClick={() => onChange(createDefault())}>
          Add {title}
        </Button>
      </div>
    );
  }

  return (
    <Accordion title={title} defaultExpanded={defaultExpanded}>
      {renderContent()}
    </Accordion>
  );
}
