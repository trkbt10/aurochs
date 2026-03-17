/**
 * @file SlideSizeEditor - PPTX-specific slide size editor
 *
 * Thin wrapper around the shared PageSizeEditor with PPTX presets.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.34 (sldSz)
 */

import { useCallback, type CSSProperties } from "react";
import type { SlideSize, SlideSizeType } from "@aurochs-office/pptx/domain";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import type { PageSizeData, PageSizePreset } from "@aurochs-ui/editor-core/adapter-types";
import { PageSizeEditor } from "@aurochs-ui/editor-controls/page";

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
 * PPTX predefined slide sizes in pixels (96 DPI).
 *
 * Values match ECMA-376 sldSz@type enumeration.
 */
const PPTX_PRESETS: readonly PageSizePreset[] = [
  { value: "screen16x9", label: "Widescreen (16:9)", width: 960, height: 540 },
  { value: "screen16x10", label: "Widescreen (16:10)", width: 960, height: 600 },
  { value: "screen4x3", label: "Standard (4:3)", width: 960, height: 720 },
  { value: "A4", label: "A4 Paper", width: 794, height: 1123 },
  { value: "A3", label: "A3 Paper", width: 1123, height: 1587 },
  { value: "letter", label: "US Letter", width: 816, height: 1056 },
  { value: "ledger", label: "US Ledger", width: 1056, height: 1632 },
  { value: "B4ISO", label: "B4 (ISO)", width: 945, height: 1334 },
  { value: "B5ISO", label: "B5 (ISO)", width: 665, height: 945 },
  { value: "B4JIS", label: "B4 (JIS)", width: 971, height: 1373 },
  { value: "B5JIS", label: "B5 (JIS)", width: 686, height: 971 },
  { value: "35mm", label: "35mm Slide", width: 1024, height: 768 },
  { value: "overhead", label: "Overhead", width: 1024, height: 768 },
  { value: "banner", label: "Banner", width: 720, height: 540 },
  { value: "hagakiCard", label: "Hagaki Card", width: 378, height: 567 },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for PPTX slide size dimensions.
 *
 * Delegates to the shared PageSizeEditor with PPTX-specific presets,
 * converting between SlideSize domain type and PageSizeData.
 */
export function SlideSizeEditor({ value, onChange, disabled, style: _style }: SlideSizeEditorProps) {
  const data: PageSizeData = {
    width: String(value.width),
    height: String(value.height),
    preset: value.type === "custom" ? "" : (value.type ?? ""),
  };

  const handleChange = useCallback(
    (next: PageSizeData) => {
      const preset = PPTX_PRESETS.find((p) => p.value === next.preset);
      onChange({
        width: px(preset?.width ?? parseFloat(next.width)),
        height: px(preset?.height ?? parseFloat(next.height)),
        type: (next.preset || "custom") as SlideSizeType,
      });
    },
    [onChange],
  );

  return (
    <PageSizeEditor
      data={data}
      onChange={handleChange}
      presets={PPTX_PRESETS}
      unitLabel="px"
      disabled={disabled}
      min={100}
      max={10000}
      step={10}
    />
  );
}

// =============================================================================
// Helpers
// =============================================================================

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
