/**
 * @file PicShape property panel component
 *
 * Displays property editors for PicShape (picture/image) elements.
 * When a property is undefined, shows an "Add" button to initialize it with defaults.
 */

import type { PicShape } from "@aurochs-office/pptx/domain/index";
import type { Percent } from "@aurochs-office/drawing-ml/domain/units";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Toggle } from "@aurochs-ui/ui-components/primitives";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  EffectsEditor,
  PercentEditor,
  createDefaultTransform,
  createDefaultEffects,
} from "../../editors/index";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";

// =============================================================================
// Types
// =============================================================================

export type PicShapePanelProps = {
  readonly shape: PicShape;
  readonly onChange: (shape: PicShape) => void;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get media type label for display.
 */
function getMediaTypeLabel(shape: PicShape): string {
  if (shape.mediaType === "video") {
    return "Video";
  }
  if (shape.mediaType === "audio") {
    return "Audio";
  }
  return "Image";
}

/**
 * Get media reference description.
 */
function getMediaDescription(shape: PicShape): string {
  if (!shape.media) {
    return "";
  }
  if (shape.media.audioCd) {
    return "Audio CD";
  }
  if (shape.media.audioFile) {
    return `Audio: ${shape.media.audioFile.link ?? "embedded"}`;
  }
  if (shape.media.videoFile) {
    return `Video: ${shape.media.videoFile.link ?? "embedded"}`;
  }
  if (shape.media.wavAudioFile) {
    return "WAV Audio (embedded)";
  }
  if (shape.media.quickTimeFile) {
    return "QuickTime";
  }
  return "";
}

// =============================================================================
// Component
// =============================================================================

/**
 * PicShape editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Media Info (type, compression, DPI, media reference)
 * - Transform
 * - Crop (source rectangle)
 * - Effects
 */
export function PicShapePanel({ shape, onChange }: PicShapePanelProps) {
  /** Update shape properties immutably. */
  function updateProperties(update: Partial<PicShape["properties"]>) {
    onChange({ ...shape, properties: { ...shape.properties, ...update } });
  }

  const handleSourceRectChange = (field: "left" | "top" | "right" | "bottom", value: number) => {
    const currentRect = shape.blipFill.sourceRect ?? {
      left: 0 as Percent,
      top: 0 as Percent,
      right: 0 as Percent,
      bottom: 0 as Percent,
    };
    onChange({
      ...shape,
      blipFill: {
        ...shape.blipFill,
        sourceRect: {
          ...currentRect,
          [field]: value as Percent,
        },
      },
    });
  };

  const hasMediaInfo = shape.mediaType || shape.media || shape.blipFill.compressionState;

  return (
    <>
      <OptionalPropertySection title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor value={shape.nonVisual} onChange={(nv) => onChange({ ...shape, nonVisual: nv })} />
      </OptionalPropertySection>

      {/* Media Info */}
      {hasMediaInfo && (
        <OptionalPropertySection title="Media Info" defaultExpanded={false}>
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--bg-tertiary, #111111)",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              color: "var(--text-secondary, #a1a1a1)",
            }}
          >
            <div>
              <span
                style={{
                  color: "var(--text-tertiary, #737373)",
                  fontSize: "11px",
                }}
              >
                Type
              </span>
              <br />
              {getMediaTypeLabel(shape)}
            </div>
            {shape.blipFill.compressionState && (
              <div>
                <span
                  style={{
                    color: "var(--text-tertiary, #737373)",
                    fontSize: "11px",
                  }}
                >
                  Compression
                </span>
                <br />
                {shape.blipFill.compressionState}
              </div>
            )}
            {shape.blipFill.dpi && (
              <div>
                <span
                  style={{
                    color: "var(--text-tertiary, #737373)",
                    fontSize: "11px",
                  }}
                >
                  DPI
                </span>
                <br />
                {shape.blipFill.dpi}
              </div>
            )}
            {shape.media && (
              <div>
                <span
                  style={{
                    color: "var(--text-tertiary, #737373)",
                    fontSize: "11px",
                  }}
                >
                  Media Reference
                </span>
                <br />
                <code style={{ fontSize: "10px" }}>{getMediaDescription(shape)}</code>
              </div>
            )}
          </div>
        </OptionalPropertySection>
      )}

      <OptionalPropertySection
        title="Transform"
        value={shape.properties.transform}
        createDefault={createDefaultTransform}
        onChange={(transform) => updateProperties({ transform })}
        renderEditor={(v, set) => <TransformEditor value={v} onChange={set} />}
        defaultExpanded
      />

      <OptionalPropertySection title="Crop (Source Rect)" defaultExpanded={false}>
        <FieldRow>
          <FieldGroup label="L" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.left ?? 0) as Percent}
              onChange={(v) => handleSourceRectChange("left", v as number)}
            />
          </FieldGroup>
          <FieldGroup label="R" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.right ?? 0) as Percent}
              onChange={(v) => handleSourceRectChange("right", v as number)}
            />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup label="T" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.top ?? 0) as Percent}
              onChange={(v) => handleSourceRectChange("top", v as number)}
            />
          </FieldGroup>
          <FieldGroup label="B" inline labelWidth={16} style={{ flex: 1 }}>
            <PercentEditor
              value={(shape.blipFill.sourceRect?.bottom ?? 0) as Percent}
              onChange={(v) => handleSourceRectChange("bottom", v as number)}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow style={{ marginTop: "4px" }}>
          <Toggle
            checked={shape.blipFill.stretch ?? false}
            onChange={(stretch) =>
              onChange({
                ...shape,
                blipFill: { ...shape.blipFill, stretch },
              })
            }
            label="Stretch"
          />
          <Toggle
            checked={shape.blipFill.rotateWithShape ?? true}
            onChange={(rotateWithShape) =>
              onChange({
                ...shape,
                blipFill: { ...shape.blipFill, rotateWithShape },
              })
            }
            label="Rotate"
          />
        </FieldRow>
      </OptionalPropertySection>

      <OptionalPropertySection
        title="Effects"
        value={shape.properties.effects}
        createDefault={createDefaultEffects}
        onChange={(effects) => updateProperties({ effects })}
        renderEditor={(v, set) => <EffectsEditor value={v} onChange={set} />}
      />
    </>
  );
}
