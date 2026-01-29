/**
 * @file Layout Editor - Full graphical editor for slide layouts
 *
 * Refactored to use SvgEditorCanvas infrastructure for consistent
 * editing experience with the main slide editor.
 */

import { useCallback, useMemo, useEffect, type CSSProperties } from "react";
import type { PresentationFile, SlideSize, Shape } from "@oxen-office/pptx/domain";
import type { ColorScheme } from "@oxen-office/ooxml/domain/color-context";
import type { SlideLayoutOption } from "@oxen-office/pptx/app";
import { loadSlideLayoutBundle } from "@oxen-office/pptx/app";
import { parseShapeTree } from "@oxen-office/pptx/parser";
import { getByPath, getChild } from "@oxen/xml";
import { useLayoutThumbnails, LayoutThumbnail } from "../../thumbnail";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@oxen-ui/ui-components/design-tokens";
import { px } from "@oxen-office/ooxml/domain/units";
import { CheckIcon, AddIcon } from "@oxen-ui/ui-components/icons";
import { Button } from "@oxen-ui/ui-components/primitives/Button";
import { usePresentationEditor } from "../../context/presentation/PresentationEditorContext";
import { LayoutEditorCanvas } from "./LayoutEditorCanvas";

// =============================================================================
// Types
// =============================================================================

export type LayoutEditorProps = {
  readonly presentationFile?: PresentationFile;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly currentLayoutPath?: string;
  readonly slideSize?: SlideSize;
  readonly onLayoutSelect?: (layoutPath: string) => void;
  readonly onImportTemplate?: () => void;
  /** Color scheme from theme editor - overrides theme bundle colors */
  readonly colorScheme?: ColorScheme;
};

const DEFAULT_SLIDE_SIZE: SlideSize = { width: px(9144000 / 914.4), height: px(6858000 / 914.4) };

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  height: "100%",
  width: "100%",
  overflow: "hidden",
  backgroundColor: colorTokens.background.secondary,
};

const sidebarStyle: CSSProperties = {
  width: "200px",
  minWidth: "200px",
  borderRight: `1px solid ${colorTokens.border.subtle}`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  backgroundColor: colorTokens.background.primary,
};

const sidebarHeaderStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  color: colorTokens.text.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const layoutListStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: spacingTokens.xs,
};

const layoutItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: spacingTokens.xs,
  borderRadius: radiusTokens.md,
  cursor: "pointer",
  marginBottom: "2px",
  transition: "background-color 150ms ease",
};

const layoutItemActiveStyle: CSSProperties = {
  ...layoutItemStyle,
  backgroundColor: `${colorTokens.accent.primary}20`,
  border: `1px solid ${colorTokens.accent.primary}`,
};

const layoutItemInactiveStyle: CSSProperties = {
  ...layoutItemStyle,
  backgroundColor: "transparent",
  border: "1px solid transparent",
};

const canvasContainerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const canvasToolbarStyle: CSSProperties = {
  padding: spacingTokens.sm,
  borderBottom: `1px solid ${colorTokens.border.subtle}`,
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.md,
  backgroundColor: colorTokens.background.primary,
};

const canvasAreaStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  backgroundColor: colorTokens.background.tertiary,
};

const emptyStateStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: colorTokens.text.tertiary,
  gap: spacingTokens.md,
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Layout editor component for editing slide layouts.
 * Uses SvgEditorCanvas infrastructure for consistent editing experience.
 */
export function LayoutEditor({
  presentationFile,
  layoutOptions,
  currentLayoutPath,
  slideSize = DEFAULT_SLIDE_SIZE,
  onLayoutSelect,
  onImportTemplate,
  colorScheme,
}: LayoutEditorProps) {
  const { state, dispatch } = usePresentationEditor();
  const { layoutEdit } = state;

  // Load layout thumbnails for sidebar
  const layoutThumbnails = useLayoutThumbnails({
    presentationFile,
    layoutOptions,
    slideSize,
  });

  // Get available layouts from presentation file
  const availableLayouts = useMemo(() => {
    if (presentationFile && layoutThumbnails.length > 0) {
      return layoutThumbnails.map((lt) => ({
        id: lt.value,
        name: lt.label,
        shapes: lt.shapes,
      }));
    }
    return layoutOptions.map((opt) => ({
      id: opt.value,
      name: opt.label,
      shapes: [],
    }));
  }, [presentationFile, layoutThumbnails, layoutOptions]);

  // Load layout shapes when layout is selected
  const loadLayoutShapes = useCallback(
    (layoutPath: string) => {
      if (!presentationFile) {
        return;
      }

      try {
        // Dispatch selection first to update UI immediately
        dispatch({ type: "SELECT_LAYOUT", layoutPath });

        // Load layout bundle
        const bundle = loadSlideLayoutBundle(presentationFile, layoutPath);

        // Extract spTree from layout
        const layoutContent = getByPath(bundle.layout, ["p:sldLayout"]);
        const cSld = layoutContent ? getChild(layoutContent, "p:cSld") : undefined;
        const spTree = cSld ? getChild(cSld, "p:spTree") : undefined;

        if (!spTree) {
          console.warn("No spTree found in layout:", layoutPath);
          return;
        }

        // Parse shapes
        const shapes = parseShapeTree({ spTree });

        // Dispatch loaded shapes
        dispatch({
          type: "LOAD_LAYOUT_SHAPES",
          layoutPath,
          shapes,
          bundle,
        });
      } catch (error) {
        console.error("Failed to load layout:", error);
      }
    },
    [presentationFile, dispatch]
  );

  // Handle layout selection from sidebar
  const handleSelectLayout = useCallback(
    (layoutPath: string) => {
      loadLayoutShapes(layoutPath);
      onLayoutSelect?.(layoutPath);
    },
    [loadLayoutShapes, onLayoutSelect]
  );

  // Auto-select first layout on mount if none selected
  useEffect(() => {
    if (
      presentationFile &&
      availableLayouts.length > 0 &&
      !layoutEdit.activeLayoutPath
    ) {
      const firstLayout = availableLayouts[0];
      handleSelectLayout(firstLayout.id);
    }
  }, [presentationFile, availableLayouts, layoutEdit.activeLayoutPath, handleSelectLayout]);

  // Get selected layout info for toolbar
  const selectedLayout = useMemo(
    () => availableLayouts.find((l) => l.id === layoutEdit.activeLayoutPath),
    [availableLayouts, layoutEdit.activeLayoutPath]
  );

  // Helper to get layout item style based on active state
  const getLayoutItemStyle = useCallback(
    (layoutId: string) => (layoutEdit.activeLayoutPath === layoutId ? layoutItemActiveStyle : layoutItemInactiveStyle),
    [layoutEdit.activeLayoutPath]
  );

  // Helper to render layout thumbnail or placeholder
  const renderThumbnailContent = useCallback(
    (shapes: readonly Shape[] | undefined) => {
      const hasShapes = shapes && shapes.length > 0;
      return hasShapes ? <LayoutThumbnail shapes={shapes as Shape[]} slideSize={slideSize} width={40} /> : <span>...</span>;
    },
    [slideSize]
  );

  // Show empty state if no presentation file
  if (!presentationFile) {
    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>
          <span style={{ fontSize: fontTokens.size.md }}>No presentation loaded</span>
          <span style={{ fontSize: fontTokens.size.sm }}>
            Load a presentation to edit layouts
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Left Sidebar - Layout List */}
      <div style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          <span>Layouts</span>
          {onImportTemplate && (
            <Button variant="ghost" size="sm" onClick={onImportTemplate} title="Import template">
              <AddIcon size={14} />
            </Button>
          )}
        </div>
        <div style={layoutListStyle}>
          {availableLayouts.map((layout) => (
            <div
              key={layout.id}
              style={getLayoutItemStyle(layout.id)}
              onClick={() => handleSelectLayout(layout.id)}
            >
              {/* Mini thumbnail */}
              <div
                style={{
                  width: 40,
                  height: 30,
                  backgroundColor: "#f0f0f0",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  color: colorTokens.text.tertiary,
                  overflow: "hidden",
                }}
              >
                {renderThumbnailContent(layout.shapes)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: fontTokens.size.xs,
                    color: colorTokens.text.primary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {layout.name}
                </div>
              </div>
              {currentLayoutPath === layout.id && (
                <CheckIcon size={12} style={{ color: colorTokens.accent.primary }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center - Layout Canvas */}
      <div style={canvasContainerStyle}>
        <div style={canvasToolbarStyle}>
          <span style={{ fontSize: fontTokens.size.sm, color: colorTokens.text.secondary }}>
            {selectedLayout?.name ?? "Select a layout"}
          </span>
          <div style={{ flex: 1 }} />
          {layoutEdit.isDirty && (
            <span
              style={{
                fontSize: fontTokens.size.xs,
                color: colorTokens.text.tertiary,
                padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
                backgroundColor: colorTokens.background.secondary,
                borderRadius: radiusTokens.sm,
              }}
            >
              Unsaved changes
            </span>
          )}
        </div>
        <div style={canvasAreaStyle}>
          <LayoutEditorCanvas slideSize={slideSize} colorScheme={colorScheme} />
        </div>
      </div>
    </div>
  );
}
