/**
 * @file WordArt Gallery Component
 *
 * Displays WordArt preset gallery similar to classic Microsoft Office WordArt picker.
 * Uses static images for thumbnails to avoid WebGL context exhaustion.
 * Only the main preview uses a live WebGL context.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Text3DRenderer } from "@lib/pptx/render/webgl/text3d";
import { extractText3DRuns } from "@lib/pptx/render/react/primitives";
import { demoWordArtPresetRows, type DemoWordArtPreset } from "./wordart-demo-presets";
import {
  demoColorContext,
  createTextBody,
  createParagraph,
  createTextRun,
  createRunProperties,
  buildScene3d,
  buildShape3d,
  getPrimaryColor,
  demoFillToMaterial3DFill,
  getShadowConfigFromPreset,
} from "./demo-utils";
import "./WordArtGallery.css";
import type {
  PresetCameraType,
  PresetMaterialType,
  BevelPresetType,
  LightRigType,
  LightRigDirection,
} from "@lib/pptx/domain/three-d";

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
  const className = `wordart-thumbnail ${selected ? "selected" : ""}`;
  const content = renderThumbnailContent(preset.name, thumbnailUrl);

  return (
    <button className={className} onClick={onClick} title={preset.name}>
      <div className="wordart-thumbnail-canvas">{content}</div>
    </button>
  );
}

function renderThumbnailContent(name: string, thumbnailUrl: string | undefined) {
  if (thumbnailUrl) {
    const imgStyle = { width: "100%", height: "100%", objectFit: "contain" as const };
    return <img src={thumbnailUrl} alt={name} style={imgStyle} />;
  }
  return <div className="wordart-thumbnail-loading">{name}</div>;
}

// =============================================================================
// WordArt Preview Component (Live WebGL)
// =============================================================================

type BackgroundType = "solid" | "checker";

type WordArtPreviewProps = {
  preset: DemoWordArtPreset;
  text: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  scene3d: ReturnType<typeof buildScene3d>;
  shape3d: ReturnType<typeof buildShape3d>;
  background: BackgroundType;
};

function WordArtPreview({
  preset,
  text,
  fontFamily,
  bold,
  italic,
  scene3d,
  shape3d,
  background,
}: WordArtPreviewProps) {
  const primaryColor = getPrimaryColor(preset);
  const fill = useMemo(() => demoFillToMaterial3DFill(preset.fill), [preset.fill]);
  const shadow = useMemo(() => getShadowConfigFromPreset(preset), [preset]);

  const textBody = useMemo(() => createTextBody([
    createParagraph([
      createTextRun(text, createRunProperties({
        fontSize: 48,
        fontFamily,
        bold,
        italic,
        color: primaryColor,
      })),
    ]),
  ]), [text, fontFamily, bold, italic, primaryColor]);

  // Use library function and apply fill and shadow overrides
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
    return baseRuns.map((run) => ({ ...run, fill, shadow }));
  }, [textBody, fill, shadow]);

  const canvasClass = `wordart-preview-canvas bg-${background}`;

  return (
    <div className="wordart-preview">
      <div className={canvasClass}>
        <Text3DRenderer
          runs={runs}
          width={400}
          height={150}
          scene3d={scene3d}
          shape3d={shape3d}
        />
      </div>
      <div className="wordart-preview-info">
        <span className="wordart-preview-name">{preset.name}</span>
        <span className="wordart-preview-details">
          {preset.material} / {preset.camera} / extrusion: {preset.extrusion}px
          {preset.bevel && ` / bevel: ${preset.bevel.preset}`}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Gallery Component
// =============================================================================

/**
 * WordArt Gallery component displaying classic Office WordArt styles.
 * Allows users to select from 30 preset styles and preview with custom text.
 */
export function WordArtGallery() {
  // Default to first preset (Gold Outline - classic first choice)
  const [selectedPreset, setSelectedPreset] = useState(demoWordArtPresetRows[0][0]);
  const [previewText, setPreviewText] = useState("WordArt");
  const [showChecker, setShowChecker] = useState(false);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [camera, setCamera] = useState<PresetCameraType>(selectedPreset.camera);
  const [material, setMaterial] = useState<PresetMaterialType>(selectedPreset.material);
  const [lightRig, setLightRig] = useState<LightRigType>(selectedPreset.lightRig.rig);
  const [lightDirection, setLightDirection] = useState<LightRigDirection>(selectedPreset.lightRig.direction);
  const [extrusion, setExtrusion] = useState(selectedPreset.extrusion);
  const [bevelEnabled, setBevelEnabled] = useState(selectedPreset.bevel !== undefined);
  const [bevelPreset, setBevelPreset] = useState<BevelPresetType>(selectedPreset.bevel?.preset ?? "relaxedInset");
  const [bevelWidth, setBevelWidth] = useState(selectedPreset.bevel?.width ?? 6);
  const [bevelHeight, setBevelHeight] = useState(selectedPreset.bevel?.height ?? 6);

  // Disable thumbnail generation for now to debug main preview
  // const thumbnails = useWordArtThumbnails(allDemoWordArtPresets);
  const thumbnails = new Map<string, string>(); // Empty map - no thumbnails

  const handlePresetClick = useCallback((preset: DemoWordArtPreset) => {
    setSelectedPreset(preset);
  }, []);

  const background: BackgroundType = showChecker ? "checker" : "solid";

  useEffect(() => {
    setFontFamily(selectedPreset.fontFamily ?? "Arial");
    setBold(selectedPreset.bold === true);
    setItalic(selectedPreset.italicAngle !== undefined);
    setCamera(selectedPreset.camera);
    setMaterial(selectedPreset.material);
    setLightRig(selectedPreset.lightRig.rig);
    setLightDirection(selectedPreset.lightRig.direction);
    setExtrusion(selectedPreset.extrusion);
    setBevelEnabled(selectedPreset.bevel !== undefined);
    setBevelPreset(selectedPreset.bevel?.preset ?? "relaxedInset");
    setBevelWidth(selectedPreset.bevel?.width ?? 6);
    setBevelHeight(selectedPreset.bevel?.height ?? 6);
  }, [selectedPreset]);

  const scene3d = useMemo(() => buildScene3d({
    camera,
    lightRig: { rig: lightRig, direction: lightDirection },
  }), [camera, lightRig, lightDirection]);

  const shape3d = useMemo(() => buildShape3d({
    extrusionHeight: extrusion,
    preset: material,
    bevel: bevelEnabled ? { width: bevelWidth, height: bevelHeight, preset: bevelPreset } : undefined,
    contourWidth: selectedPreset.contour?.width,
    contourColor: selectedPreset.contour?.color,
  }), [extrusion, material, bevelEnabled, bevelWidth, bevelHeight, bevelPreset, selectedPreset.contour]);

  return (
    <div className="wordart-gallery">
      <div className="wordart-gallery-header">
        <h4>WordArt Gallery</h4>
        <div className="wordart-header-actions">
          <div className="wordart-bg-toggle">
            <input
              type="checkbox"
              id="bg-checker"
              checked={showChecker}
              onChange={(e) => setShowChecker(e.target.checked)}
            />
            <label htmlFor="bg-checker">Transparency</label>
          </div>
        </div>
      </div>
      <div className="wordart-controls">
        <div className="wordart-controls-group">
          <div className="wordart-controls-title">Text</div>
          <label className="wordart-control">
            <span>Text</span>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value || "WordArt")}
              maxLength={20}
            />
          </label>
          <label className="wordart-control">
            <span>Font</span>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              <option value="sans-serif">sans-serif</option>
              <option value="serif">serif</option>
              <option value="monospace">monospace</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Verdana">Verdana</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Impact">Impact</option>
            </select>
          </label>
          <label className="wordart-control">
            <span>Bold</span>
            <input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)} />
          </label>
          <label className="wordart-control">
            <span>Italic</span>
            <input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)} />
          </label>
        </div>
        <div className="wordart-controls-group">
          <div className="wordart-controls-title">3D Properties</div>
          <label className="wordart-control">
            <span>Camera</span>
            <select value={camera} onChange={(e) => setCamera(e.target.value as PresetCameraType)}>
              <option value="orthographicFront">orthographicFront</option>
              <option value="perspectiveFront">perspectiveFront</option>
              <option value="perspectiveLeft">perspectiveLeft</option>
              <option value="perspectiveRight">perspectiveRight</option>
              <option value="perspectiveAbove">perspectiveAbove</option>
              <option value="perspectiveRelaxed">perspectiveRelaxed</option>
              <option value="isometricTopUp">isometricTopUp</option>
              <option value="isometricTopDown">isometricTopDown</option>
              <option value="obliqueTop">obliqueTop</option>
              <option value="obliqueTopLeft">obliqueTopLeft</option>
              <option value="perspectiveContrastingLeftFacing">perspectiveContrastingLeftFacing</option>
              <option value="perspectiveHeroicRightFacing">perspectiveHeroicRightFacing</option>
            </select>
          </label>
          <label className="wordart-control">
            <span>Material</span>
            <select value={material} onChange={(e) => setMaterial(e.target.value as PresetMaterialType)}>
              <option value="flat">flat</option>
              <option value="matte">matte</option>
              <option value="plastic">plastic</option>
              <option value="metal">metal</option>
              <option value="softEdge">softEdge</option>
              <option value="warmMatte">warmMatte</option>
              <option value="clear">clear</option>
            </select>
          </label>
          <label className="wordart-control">
            <span>Light Rig</span>
            <select value={lightRig} onChange={(e) => setLightRig(e.target.value as LightRigType)}>
              <option value="brightRoom">brightRoom</option>
              <option value="threePt">threePt</option>
              <option value="twoPt">twoPt</option>
              <option value="soft">soft</option>
              <option value="balanced">balanced</option>
              <option value="harsh">harsh</option>
            </select>
          </label>
          <label className="wordart-control">
            <span>Light Dir</span>
            <select value={lightDirection} onChange={(e) => setLightDirection(e.target.value as LightRigDirection)}>
              <option value="t">t</option>
              <option value="b">b</option>
              <option value="l">l</option>
              <option value="r">r</option>
              <option value="tl">tl</option>
              <option value="tr">tr</option>
              <option value="bl">bl</option>
              <option value="br">br</option>
            </select>
          </label>
          <label className="wordart-control">
            <span>Extrusion</span>
            <input
              type="number"
              min={0}
              max={50}
              value={extrusion}
              onChange={(e) => setExtrusion(Number(e.target.value))}
            />
          </label>
          <label className="wordart-control">
            <span>Bevel</span>
            <input type="checkbox" checked={bevelEnabled} onChange={(e) => setBevelEnabled(e.target.checked)} />
          </label>
          <label className="wordart-control">
            <span>Bevel Preset</span>
            <select
              value={bevelPreset}
              onChange={(e) => setBevelPreset(e.target.value as BevelPresetType)}
              disabled={!bevelEnabled}
            >
              <option value="relaxedInset">relaxedInset</option>
              <option value="circle">circle</option>
              <option value="slope">slope</option>
              <option value="cross">cross</option>
              <option value="angle">angle</option>
              <option value="softRound">softRound</option>
              <option value="convex">convex</option>
            </select>
          </label>
          <label className="wordart-control">
            <span>Bevel W</span>
            <input
              type="number"
              min={0}
              max={50}
              value={bevelWidth}
              onChange={(e) => setBevelWidth(Number(e.target.value))}
              disabled={!bevelEnabled}
            />
          </label>
          <label className="wordart-control">
            <span>Bevel H</span>
            <input
              type="number"
              min={0}
              max={50}
              value={bevelHeight}
              onChange={(e) => setBevelHeight(Number(e.target.value))}
              disabled={!bevelEnabled}
            />
          </label>
        </div>
      </div>

      {/* Preview - only this uses live WebGL */}
      <WordArtPreview
        preset={selectedPreset}
        text={previewText}
        fontFamily={fontFamily}
        bold={bold}
        italic={italic}
        scene3d={scene3d}
        shape3d={shape3d}
        background={background}
      />

      {/* Gallery Grid - uses static images */}
      <div className="wordart-gallery-grid">
        <div className="wordart-gallery-label">Select a WordArt style:</div>
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
