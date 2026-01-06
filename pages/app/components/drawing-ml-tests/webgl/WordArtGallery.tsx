/**
 * @file WordArt Gallery Component
 *
 * Displays WordArt preset gallery similar to classic Microsoft Office WordArt picker.
 * Uses static images for thumbnails to avoid WebGL context exhaustion.
 * Only the main preview uses a live WebGL context.
 */

import { useState, useMemo, useCallback } from "react";
import { Text3DRenderer } from "@lib/pptx/render/webgl/text3d";
import { extractText3DRuns } from "@lib/pptx/render/react/primitives/Text";
import { demoWordArtPresetRows, type DemoWordArtPreset } from "./wordart-demo-presets";
import {
  demoColorContext,
  createTextBody,
  createParagraph,
  createTextRun,
  createRunProperties,
  getPrimaryColor,
  demoFillToMaterial3DFill,
  buildShape3dFromPreset,
  buildScene3dFromPreset,
} from "./demo-utils";
import "./WordArtGallery.css";

// =============================================================================
// WordArt Thumbnail Component (Static Image)
// =============================================================================

type WordArtThumbnailProps = {
  preset: DemoWordArtPreset;
  selected: boolean;
  thumbnailUrl: string | undefined;
  onClick: () => void;
};

function WordArtThumbnail({ preset, selected, thumbnailUrl, onClick }: WordArtThumbnailProps) {
  return (
    <button
      className={`wordart-thumbnail ${selected ? "selected" : ""}`}
      onClick={onClick}
      title={preset.name}
    >
      <div className="wordart-thumbnail-canvas">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={preset.name}
            style={{ width: 100, height: 40, objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: 100,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#666",
              background: "#1a1a2e",
            }}
          >
            Loading...
          </div>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// WordArt Preview Component (Live WebGL)
// =============================================================================

type WordArtPreviewProps = {
  preset: DemoWordArtPreset;
  text: string;
};

function WordArtPreview({ preset, text }: WordArtPreviewProps) {
  const primaryColor = getPrimaryColor(preset);
  const fill = useMemo(() => demoFillToMaterial3DFill(preset.fill), [preset.fill]);

  const textBody = useMemo(() => createTextBody([
    createParagraph([
      createTextRun(text, createRunProperties({
        fontSize: 48,
        fontFamily: "Arial",
        bold: true,
        color: primaryColor,
      })),
    ]),
  ]), [text, primaryColor]);

  // Use library function and apply fill override
  const runs = useMemo(() => {
    const baseRuns = extractText3DRuns(
      textBody,
      400,
      150,
      demoColorContext,
      undefined,
      undefined,
      () => undefined,
    );
    return baseRuns.map((run) => ({ ...run, fill }));
  }, [textBody, fill]);

  return (
    <div className="wordart-preview">
      <div className="wordart-preview-canvas">
        <Text3DRenderer
          runs={runs}
          width={400}
          height={150}
          scene3d={buildScene3dFromPreset(preset)}
          shape3d={buildShape3dFromPreset(preset)}
        />
      </div>
      <div className="wordart-preview-info">
        <span className="wordart-preview-name">{preset.name}</span>
        <span className="wordart-preview-details">
          {preset.material} / {preset.camera} / extrusion: {preset.extrusion}px
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Gallery Component
// =============================================================================

export function WordArtGallery() {
  const [selectedPreset, setSelectedPreset] = useState(demoWordArtPresetRows[2][0]); // Default to first 3D preset
  const [previewText, setPreviewText] = useState("WordArt");

  // Disable thumbnail generation for now to debug main preview
  // const thumbnails = useWordArtThumbnails(allDemoWordArtPresets);
  const thumbnails = new Map<string, string>(); // Empty map - no thumbnails

  const handlePresetClick = useCallback((preset: DemoWordArtPreset) => {
    setSelectedPreset(preset);
  }, []);

  return (
    <div className="wordart-gallery">
      <div className="wordart-gallery-header">
        <h4>WordArt Gallery</h4>
        <label className="wordart-text-input">
          Text:
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value || "WordArt")}
            maxLength={20}
          />
        </label>
      </div>

      {/* Preview - only this uses live WebGL */}
      <WordArtPreview preset={selectedPreset} text={previewText} />

      {/* Gallery Grid - uses static images */}
      <div className="wordart-gallery-grid">
        {demoWordArtPresetRows.map((row, rowIndex) => (
          <div key={rowIndex} className="wordart-gallery-row">
            {row.map((preset) => (
              <WordArtThumbnail
                key={preset.id}
                preset={preset}
                selected={preset.id === selectedPreset.id}
                thumbnailUrl={thumbnails.get(preset.id)}
                onClick={() => handlePresetClick(preset)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
