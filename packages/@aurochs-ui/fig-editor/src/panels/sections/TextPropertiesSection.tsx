/**
 * @file Text properties section
 *
 * Edits text-specific properties of a TEXT node:
 * - Text content (multiline textarea)
 * - Font family and style
 * - Font size
 * - Horizontal alignment (LEFT / CENTER / RIGHT / JUSTIFIED)
 * - Vertical alignment (TOP / CENTER / BOTTOM)
 * - Line height
 * - Letter spacing
 * - Text decoration (underline, strikethrough)
 *
 * Uses UPDATE_NODE action with immutable updater functions.
 * All text properties are stored in the FigDesignNode.textData field.
 */

import { useCallback, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { TextData } from "@aurochs/fig/domain";
import type { KiwiEnumValue } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  AlignTopIcon,
  AlignMiddleIcon,
  AlignBottomIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
} from "@aurochs-ui/ui-components/icons";

// =============================================================================
// KiwiEnumValue helpers
// =============================================================================

function kiwiName(value: KiwiEnumValue | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.name ?? "";
}

function makeKiwiEnum(name: string, value: number): KiwiEnumValue {
  return { value, name } as KiwiEnumValue;
}

// =============================================================================
// Styles
// =============================================================================

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "3lh",
  resize: "vertical",
  fontFamily: "inherit",
  fontSize: fontTokens.size.md,
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

const fontInfoStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.secondary,
};

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
          if (!n.textData) return n;
          return { ...n, textData: updater(n.textData) };
        },
      });
    },
    [dispatch, node.id],
  );

  const hAlign = kiwiName(textData.textAlignHorizontal);
  const vAlign = kiwiName(textData.textAlignVertical);
  const fontFamily = textData.fontName.family;
  const fontStyle = textData.fontName.style;
  const isBold = fontStyle.toLowerCase().includes("bold");
  const isItalic = fontStyle.toLowerCase().includes("italic");
  const decoration = kiwiName(textData.textDecoration);
  const lineHeight = textData.lineHeight;
  const letterSpacing = textData.letterSpacing;

  const setHAlign = useCallback(
    (name: string, value: number) => {
      updateTextData((td) => ({
        ...td,
        textAlignHorizontal: makeKiwiEnum(name, value),
      }));
    },
    [updateTextData],
  );

  const setVAlign = useCallback(
    (name: string, value: number) => {
      updateTextData((td) => ({
        ...td,
        textAlignVertical: makeKiwiEnum(name, value),
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

      {/* Font family & style */}
      <FieldRow>
        <FieldGroup label="Font" inline labelWidth={40}>
          <span style={fontInfoStyle}>
            {fontFamily} {fontStyle}
          </span>
        </FieldGroup>
      </FieldRow>

      {/* Font size */}
      <FieldRow>
        <FieldGroup label="Size" inline labelWidth={40}>
          <Input
            type="number"
            value={textData.fontSize}
            min={1}
            max={1000}
            step={1}
            onChange={(v) => {
              updateTextData((td) => ({ ...td, fontSize: v as number }));
            }}
            width={60}
          />
        </FieldGroup>

        {/* Line height */}
        {lineHeight && (
          <FieldGroup label="LH" inline labelWidth={24}>
            <Input
              type="number"
              value={Math.round(lineHeight.value * 100) / 100}
              min={0}
              step={0.1}
              onChange={(v) => {
                updateTextData((td) => ({
                  ...td,
                  lineHeight: td.lineHeight
                    ? { ...td.lineHeight, value: v as number }
                    : undefined,
                }));
              }}
              width={50}
            />
          </FieldGroup>
        )}

        {/* Letter spacing */}
        {letterSpacing && (
          <FieldGroup label="LS" inline labelWidth={24}>
            <Input
              type="number"
              value={Math.round(letterSpacing.value * 100) / 100}
              step={0.1}
              onChange={(v) => {
                updateTextData((td) => ({
                  ...td,
                  letterSpacing: td.letterSpacing
                    ? { ...td.letterSpacing, value: v as number }
                    : undefined,
                }));
              }}
              width={50}
            />
          </FieldGroup>
        )}
      </FieldRow>

      {/* Horizontal alignment */}
      <FieldRow>
        <FieldGroup label="H" inline labelWidth={20}>
          <div style={alignButtonGroupStyle}>
            <button type="button" style={alignButtonStyle(hAlign === "LEFT")} onClick={() => setHAlign("LEFT", 0)} title="Left">
              <AlignLeftIcon size={14} />
            </button>
            <button type="button" style={alignButtonStyle(hAlign === "CENTER")} onClick={() => setHAlign("CENTER", 1)} title="Center">
              <AlignCenterIcon size={14} />
            </button>
            <button type="button" style={alignButtonStyle(hAlign === "RIGHT")} onClick={() => setHAlign("RIGHT", 2)} title="Right">
              <AlignRightIcon size={14} />
            </button>
            <button type="button" style={alignButtonStyle(hAlign === "JUSTIFIED")} onClick={() => setHAlign("JUSTIFIED", 3)} title="Justify">
              <AlignJustifyIcon size={14} />
            </button>
          </div>
        </FieldGroup>
      </FieldRow>

      {/* Vertical alignment */}
      <FieldRow>
        <FieldGroup label="V" inline labelWidth={20}>
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

      {/* Decoration indicator */}
      {decoration && decoration !== "NONE" && (
        <div style={{ fontSize: fontTokens.size.xs, color: colorTokens.text.tertiary }}>
          Decoration: {decoration}
        </div>
      )}
    </div>
  );
}
