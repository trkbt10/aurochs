/**
 * @file SlideSizeEditor - Editor for slide dimensions
 *
 * Allows editing slide width, height, and predefined size type.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.34 (sldSz)
 */

import { useCallback, type CSSProperties } from "react";
import type { SlideSize, SlideSizeType } from "@oxen-office/pptx/domain";
import { px } from "@oxen-office/ooxml/domain/units";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { Input, Select } from "@oxen-ui/ui-components/primitives";

// =============================================================================
// Types
// =============================================================================

export type SlideSizeEditorProps = EditorProps<SlideSize> & {
  readonly style?: CSSProperties;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * Predefined slide size options with display labels
 */
const SLIDE_SIZE_OPTIONS: readonly SelectOption<SlideSizeType | "">[] = [
  { value: "", label: "Custom" },
  { value: "screen16x9", label: "Widescreen (16:9)" },
  { value: "screen16x10", label: "Widescreen (16:10)" },
  { value: "screen4x3", label: "Standard (4:3)" },
  { value: "A4", label: "A4 Paper" },
  { value: "A3", label: "A3 Paper" },
  { value: "letter", label: "US Letter" },
  { value: "ledger", label: "US Ledger" },
  { value: "B4ISO", label: "B4 (ISO)" },
  { value: "B5ISO", label: "B5 (ISO)" },
  { value: "B4JIS", label: "B4 (JIS)" },
  { value: "B5JIS", label: "B5 (JIS)" },
  { value: "35mm", label: "35mm Slide" },
  { value: "overhead", label: "Overhead" },
  { value: "banner", label: "Banner" },
  { value: "hagakiCard", label: "Hagaki Card" },
];

/**
 * Predefined size dimensions in pixels (96 DPI)
 * These are approximate values based on standard sizes
 */
const PREDEFINED_SIZES: Record<SlideSizeType, { width: number; height: number }> = {
  "screen16x9": { width: 960, height: 540 },
  "screen16x10": { width: 960, height: 600 },
  "screen4x3": { width: 960, height: 720 },
  "A4": { width: 794, height: 1123 },  // 210mm x 297mm at 96 DPI
  "A3": { width: 1123, height: 1587 }, // 297mm x 420mm at 96 DPI
  "letter": { width: 816, height: 1056 }, // 8.5" x 11" at 96 DPI
  "ledger": { width: 1056, height: 1632 }, // 11" x 17" at 96 DPI
  "B4ISO": { width: 945, height: 1334 },
  "B5ISO": { width: 665, height: 945 },
  "B4JIS": { width: 971, height: 1373 },
  "B5JIS": { width: 686, height: 971 },
  "35mm": { width: 1024, height: 768 },
  "overhead": { width: 1024, height: 768 },
  "banner": { width: 720, height: 540 },
  "hagakiCard": { width: 378, height: 567 },
  "custom": { width: 960, height: 540 },
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const infoStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--text-tertiary, #737373)",
  marginTop: "4px",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for slide size dimensions.
 *
 * Features:
 * - Width and height input fields
 * - Predefined size type selector
 * - Automatically updates dimensions when selecting predefined sizes
 */
export function SlideSizeEditor({
  value,
  onChange,
  disabled,
  style,
}: SlideSizeEditorProps) {
  const handleWidthChange = useCallback(
    (newWidth: string | number) => {
      const widthNum = typeof newWidth === "number" ? newWidth : parseFloat(newWidth);
      if (!isNaN(widthNum) && widthNum > 0) {
        onChange({
          ...value,
          width: px(widthNum),
          type: "custom", // Switch to custom when manually editing
        });
      }
    },
    [value, onChange]
  );

  const handleHeightChange = useCallback(
    (newHeight: string | number) => {
      const heightNum = typeof newHeight === "number" ? newHeight : parseFloat(newHeight);
      if (!isNaN(heightNum) && heightNum > 0) {
        onChange({
          ...value,
          height: px(heightNum),
          type: "custom", // Switch to custom when manually editing
        });
      }
    },
    [value, onChange]
  );

  const handleTypeChange = useCallback(
    (newType: string) => {
      if (newType === "" || newType === "custom") {
        // Keep current dimensions, just mark as custom
        onChange({
          ...value,
          type: "custom",
        });
      } else {
        const sizeType = newType as SlideSizeType;
        const predefined = PREDEFINED_SIZES[sizeType];
        if (predefined) {
          onChange({
            width: px(predefined.width),
            height: px(predefined.height),
            type: sizeType,
          });
        }
      }
    },
    [value, onChange]
  );

  // Calculate aspect ratio for display
  const aspectRatio = value.width / value.height;
  const aspectRatioText = getAspectRatioText(aspectRatio);

  return (
    <div style={{ ...containerStyle, ...style }}>
      {/* Predefined size selector */}
      <FieldGroup label="Preset">
        <Select
          value={value.type ?? ""}
          onChange={handleTypeChange}
          options={SLIDE_SIZE_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Width and Height inputs */}
      <FieldRow>
        <FieldGroup label="W" inline labelWidth={20} style={{ flex: 1 }}>
          <Input
            type="number"
            value={value.width}
            onChange={handleWidthChange}
            suffix="px"
            disabled={disabled}
            min={100}
            max={10000}
            step={10}
          />
        </FieldGroup>
        <FieldGroup label="H" inline labelWidth={20} style={{ flex: 1 }}>
          <Input
            type="number"
            value={value.height}
            onChange={handleHeightChange}
            suffix="px"
            disabled={disabled}
            min={100}
            max={10000}
            step={10}
          />
        </FieldGroup>
      </FieldRow>

      {/* Aspect ratio info */}
      <div style={infoStyle}>
        Aspect ratio: {aspectRatioText}
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get human-readable aspect ratio text
 */
function getAspectRatioText(ratio: number): string {
  // Check for common aspect ratios
  const tolerance = 0.01;

  if (Math.abs(ratio - 16/9) < tolerance) {return "16:9";}
  if (Math.abs(ratio - 16/10) < tolerance) {return "16:10";}
  if (Math.abs(ratio - 4/3) < tolerance) {return "4:3";}
  if (Math.abs(ratio - 3/2) < tolerance) {return "3:2";}
  if (Math.abs(ratio - 1) < tolerance) {return "1:1";}
  if (Math.abs(ratio - 21/9) < tolerance) {return "21:9";}

  // For other ratios, show decimal
  return ratio.toFixed(2) + ":1";
}

/**
 * Create a default slide size (16:9 widescreen)
 */
export function createDefaultSlideSize(): SlideSize {
  return {
    width: px(960),
    height: px(540),
    type: "screen16x9",
  };
}
