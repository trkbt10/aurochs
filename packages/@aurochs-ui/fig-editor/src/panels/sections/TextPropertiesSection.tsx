/**
 * @file Text properties section
 *
 * Edits text-specific properties of a TEXT node using shared editor controls:
 * - TextFormattingEditor: font family, size, bold, italic, underline, strikethrough, letter spacing
 * - TextJustifySection (react-editor-ui): horizontal alignment — same component as PPTX
 * - Vertical alignment (fig-specific, not in shared controls)
 * - Auto resize mode (fig-specific)
 *
 * Uses the same adapter pattern as pptx-editor:
 * FigDesignNode.textData ↔ generic TextFormatting ↔ shared editor
 */

import { useCallback, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { TextData } from "@aurochs/fig/domain";
import type { KiwiEnumValue } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting, TextFormattingFeatures } from "@aurochs-ui/editor-controls/text";
import { TextJustifySection } from "react-editor-ui/sections/TextJustifySection";
import type { TextJustifyData } from "@aurochs-ui/editor-core/adapter-types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  AlignTopIcon,
  AlignMiddleIcon,
  AlignBottomIcon,
} from "@aurochs-ui/ui-components/icons";
import {
  figTextToFormatting,
  applyFormattingUpdate,
  getAutoResize,
  makeAutoResizeEnum,
  type FigTextAutoResize,
} from "./fig-text-adapter";

// =============================================================================
// Feature flags — fig supports a subset of text formatting
// =============================================================================

const FIG_TEXT_FEATURES: TextFormattingFeatures = {
  showFontFamily: true,
  showFontSize: true,
  showBold: true,
  showItalic: true,
  showUnderline: true,
  showStrikethrough: true,
  showTextColor: false,
  showHighlight: false,
  showSuperSubscript: false,
  showUnderlineStyle: false,
  showStrikeStyle: false,
  showCaps: false,
  showSpacing: true,
};

// =============================================================================
// H-align mapping (Figma enum names ↔ TextJustify values)
// =============================================================================

type TextJustify = "left" | "center" | "right" | "justify";

const H_ALIGN_TO_JUSTIFY: Record<string, TextJustify> = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
  JUSTIFIED: "justify",
};

const JUSTIFY_TO_H_ALIGN: Record<string, { name: string; value: number }> = {
  left: { name: "LEFT", value: 0 },
  center: { name: "CENTER", value: 1 },
  right: { name: "RIGHT", value: 2 },
  justify: { name: "JUSTIFIED", value: 3 },
};

// =============================================================================
// KiwiEnumValue helpers
// =============================================================================

function kiwiName(value: unknown): string {
  if (!value) {return "";}
  if (typeof value === "string") {return value;}
  if (typeof value === "object" && value !== null && "name" in value) {
    return (value as { name: string }).name ?? "";
  }
  return "";
}

function makeKiwiEnum(name: string, value: number) {
  return { value, name } as KiwiEnumValue;
}

type KiwiLineHeight = { readonly value: number; readonly units: KiwiEnumValue };
const PIXELS_UNITS = { value: 0, name: "PIXELS" } as KiwiEnumValue;

function mergeTextDataLineHeight(existing: KiwiLineHeight | undefined, newValue: number): KiwiLineHeight {
  return existing ? { ...existing, value: newValue } : { value: newValue, units: PIXELS_UNITS };
}

// =============================================================================
// Styles
// =============================================================================

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "3lh",
  resize: "vertical",
  fontFamily: "inherit",
  fontSize: "var(--font-size-md, 13px)",
  border: `1px solid ${colorTokens.border.strong}`,
  borderRadius: 4,
  padding: 6,
  boxSizing: "border-box",
};

const alignButtonGroupStyle: CSSProperties = {
  display: "flex",
  gap: 2,
};

const alignButtonStyle = (active: boolean): CSSProperties => ({
  background: active ? colorTokens.accent.primary : "transparent",
  color: active ? "#fff" : colorTokens.text.secondary,
  border: `1px solid ${active ? colorTokens.accent.primary : colorTokens.border.primary}`,
  borderRadius: 4,
  padding: "3px 5px",
  cursor: "pointer",
  lineHeight: 0,
});

// =============================================================================
// Props
// =============================================================================

type TextPropertiesSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================






/** Panel section for editing text formatting and layout properties of a Figma text node. */
export function TextPropertiesSection({ node, dispatch }: TextPropertiesSectionProps) {
  const textData = node.textData;
  if (!textData) {
    return null;
  }

  const updateTextData = useCallback(
    (updater: (td: TextData) => TextData) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => {
          if (!n.textData) {return n;}
          return { ...n, textData: updater(n.textData) };
        },
      });
    },
    [dispatch, node.id],
  );

  // --- Shared editor: text run formatting ---
  const textFormatting = figTextToFormatting(textData);
  const handleFormattingChange = useCallback(
    (update: Partial<TextFormatting>) => {
      updateTextData((td) => applyFormattingUpdate(td, update));
    },
    [updateTextData],
  );

  // --- Horizontal alignment via TextJustifySection (same component as PPTX) ---
  const hAlign = kiwiName(textData.textAlignHorizontal);
  const justifyData: TextJustifyData = { align: H_ALIGN_TO_JUSTIFY[hAlign] ?? "left" };
  const handleJustifyChange = useCallback(
    (data: TextJustifyData) => {
      const mapped = JUSTIFY_TO_H_ALIGN[data.align];
      if (mapped) {
        updateTextData((td) => ({
          ...td,
          textAlignHorizontal: makeKiwiEnum(mapped.name, mapped.value),
        }));
      }
    },
    [updateTextData],
  );

  // --- Line spacing ---
  const lineHeight = textData.lineHeight;
  const handleLineSpacingChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(String(v));
      if (!isNaN(num) && num > 0) {
        const lineHeightValue = num * textData.fontSize;
        updateTextData((td) => ({
          ...td,
          lineHeight: mergeTextDataLineHeight(td.lineHeight, lineHeightValue),
        }));
      }
    },
    [updateTextData, textData.fontSize],
  );

  // --- Vertical alignment (fig-specific) ---
  const vAlign = kiwiName(textData.textAlignVertical);
  const setVAlign = useCallback(
    (name: string, value: number) => {
      updateTextData((td) => ({
        ...td,
        textAlignVertical: makeKiwiEnum(name, value),
      }));
    },
    [updateTextData],
  );

  // --- Auto resize (fig-specific) ---
  const autoResize = getAutoResize(textData);
  const setAutoResize = useCallback(
    (mode: FigTextAutoResize) => {
      updateTextData((td) => ({
        ...td,
        textAutoResize: makeAutoResizeEnum(mode),
      }));
    },
    [updateTextData],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Text content */}
      <textarea
        value={textData.characters}
        onChange={(e) => {
          updateTextData((td) => ({ ...td, characters: e.target.value }));
        }}
        style={textareaStyle}
        rows={3}
      />

      {/* Run formatting: font, size, bold, italic, underline, strikethrough, spacing */}
      <TextFormattingEditor
        value={textFormatting}
        onChange={handleFormattingChange}
        features={FIG_TEXT_FEATURES}
      />

      {/* Horizontal alignment (react-editor-ui — same component as PPTX) */}
      <TextJustifySection
        data={justifyData}
        onChange={handleJustifyChange}
        size="sm"
      />

      {/* Line spacing */}
      {lineHeight && (
        <FieldRow>
          <FieldGroup label="Line" inline labelWidth={40}>
            <Input
              type="number"
              value={Math.round((lineHeight.value / textData.fontSize) * 100) / 100}
              min={0.5}
              max={10}
              step={0.1}
              onChange={handleLineSpacingChange}
              width={60}
              suffix="x"
            />
          </FieldGroup>
        </FieldRow>
      )}

      {/* Vertical alignment (fig-specific) */}
      <FieldRow>
        <FieldGroup label="V Align" inline labelWidth={48}>
          <div style={alignButtonGroupStyle}>
            <button type="button" style={alignButtonStyle(vAlign === "TOP")} onClick={() => setVAlign("TOP", 0)} title="Top">
              <AlignTopIcon size={14} />
            </button>
            <button type="button" style={alignButtonStyle(vAlign === "CENTER")} onClick={() => setVAlign("CENTER", 1)} title="Center">
              <AlignMiddleIcon size={14} />
            </button>
            <button type="button" style={alignButtonStyle(vAlign === "BOTTOM")} onClick={() => setVAlign("BOTTOM", 2)} title="Bottom">
              <AlignBottomIcon size={14} />
            </button>
          </div>
        </FieldGroup>
      </FieldRow>

      {/* Auto Resize (fig-specific) */}
      <FieldRow>
        <FieldGroup label="Resize" inline labelWidth={48}>
          <div style={alignButtonGroupStyle}>
            <button type="button" style={alignButtonStyle(autoResize === "WIDTH_AND_HEIGHT")} onClick={() => setAutoResize("WIDTH_AND_HEIGHT")} title="Auto width & height">
              W+H
            </button>
            <button type="button" style={alignButtonStyle(autoResize === "HEIGHT")} onClick={() => setAutoResize("HEIGHT")} title="Fixed width, auto height">
              H
            </button>
            <button type="button" style={alignButtonStyle(autoResize === "NONE")} onClick={() => setAutoResize("NONE")} title="Fixed size (clips overflow)">
              Fix
            </button>
          </div>
        </FieldGroup>
      </FieldRow>
    </div>
  );
}
