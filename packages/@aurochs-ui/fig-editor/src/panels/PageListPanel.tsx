/**
 * @file Page list panel
 *
 * Left panel showing the list of pages with add/select actions.
 * Uses shared UI components from ui-components.
 */

import { useCallback, type CSSProperties } from "react";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { Button } from "@aurochs-ui/ui-components/primitives/Button";
import { AddIcon } from "@aurochs-ui/ui-components/icons";
import { colorTokens, fontTokens, spacingTokens, radiusTokens, iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import { useFigEditor } from "../context/FigEditorContext";

// =============================================================================
// Styles
// =============================================================================

const pageItemStyle = (active: boolean): CSSProperties => ({
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  fontSize: fontTokens.size.md,
  cursor: "pointer",
  borderRadius: radiusTokens.sm,
  backgroundColor: active
    ? `var(--selection-primary, ${colorTokens.selection.primary})`
    : "transparent",
  color: active
    ? "#ffffff"
    : `var(--text-primary, ${colorTokens.text.primary})`,
  transition: "background-color 150ms ease",
});

// =============================================================================
// Component
// =============================================================================

/**
 * Page list panel for the fig editor.
 */
export function PageListPanel() {
  const { document, activePageId, dispatch } = useFigEditor();

  const handleAddPage = useCallback(() => {
    dispatch({ type: "ADD_PAGE" });
  }, [dispatch]);

  return (
    <OptionalPropertySection title="Pages" badge={document.pages.length} defaultExpanded>
      <div style={{ display: "flex", flexDirection: "column", gap: spacingTokens["2xs"] }}>
        {document.pages.map((page) => (
          <div
            key={page.id}
            onClick={() => dispatch({ type: "SELECT_PAGE", pageId: page.id })}
            style={pageItemStyle(page.id === activePageId)}
          >
            {page.name}
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={handleAddPage}>
        <AddIcon size={iconTokens.size.sm} strokeWidth={iconTokens.strokeWidth} />
        <span>Add Page</span>
      </Button>
    </OptionalPropertySection>
  );
}
