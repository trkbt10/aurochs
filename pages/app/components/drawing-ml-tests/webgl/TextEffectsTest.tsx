/**
 * @file WebGL Mode Text Effects Test
 *
 * Tests for ECMA-376 text effects rendered in WebGL mode using Three.js.
 * WebGL mode provides true 3D extrusion, materials, and lighting.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */

import { useState, useMemo } from "react";
import { type CheckItem, TestSubsection } from "../common";
import { Text3DRenderer } from "@lib/pptx/render/webgl/text3d";
import { extractText3DRuns } from "@lib/pptx/render/react/primitives/Text";
import { WordArtGallery } from "./WordArtGallery";
import { allDemoWordArtPresets } from "./wordart-demo-presets";
import type { PresetCameraType, PresetMaterialType, BevelPresetType } from "@lib/pptx/domain/three-d";
import type { TextBody } from "@lib/pptx/domain/text";
import {
  demoColorContext,
  createTextBody,
  createParagraph,
  createTextRun,
  createRunProperties,
  buildShape3d,
  buildScene3d,
} from "./demo-utils";


// =============================================================================
// Preset Lists (for UI controls)
// =============================================================================

const cameraPresets: PresetCameraType[] = [
  "orthographicFront",
  "isometricTopUp",
  "isometricTopDown",
  "obliqueTop",
  "obliqueTopLeft",
  "perspectiveAbove",
  "perspectiveFront",
  "perspectiveLeft",
];

const materialPresets: PresetMaterialType[] = [
  "flat",
  "matte",
  "plastic",
  "metal",
  "softEdge",
  "warmMatte",
  "clear",
];

const bevelPresets: BevelPresetType[] = [
  "relaxedInset",
  "circle",
  "slope",
  "cross",
  "angle",
  "softRound",
  "convex",
];

// =============================================================================
// Text3DPreview Component
// =============================================================================

/**
 * Interactive 3D text preview component
 *
 * Demonstrates the Text3DRenderer with per-run styling support.
 * Uses proper ECMA-376 domain objects and layout engine.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */
function Text3DPreview() {
  const [camera, setCamera] = useState<PresetCameraType>("isometricTopUp");
  const [material, setMaterial] = useState<PresetMaterialType>("plastic");
  const [bevelPreset, setBevelPreset] = useState<BevelPresetType>("relaxedInset");
  const [extrusion, setExtrusion] = useState(20);
  const [contourWidth, setContourWidth] = useState(0);
  const [contourColor, setContourColor] = useState("#FF5500");
  const [text, setText] = useState("3D");
  const [showMixedStyles, setShowMixedStyles] = useState(false);

  // Create TextBody domain objects (ECMA-376 a:txBody)
  const singleRunTextBody: TextBody = useMemo(() => createTextBody([
    createParagraph([
      createTextRun(text, createRunProperties({
        fontSize: 48,
        fontFamily: "Arial",
        bold: true,
        color: "#4F81BD",
      })),
    ]),
  ]), [text]);

  // Mixed styles demo: multiple runs with different styles
  const mixedStylesTextBody: TextBody = useMemo(() => createTextBody([
    createParagraph([
      createTextRun("Multi", createRunProperties({
        fontSize: 36,
        fontFamily: "Arial",
        bold: true,
        color: "#C0504D",
      })),
      createTextRun("-", createRunProperties({
        fontSize: 36,
        fontFamily: "Arial",
        bold: false,
        color: "#000000",
      })),
      createTextRun("Style", createRunProperties({
        fontSize: 36,
        fontFamily: "Georgia",
        bold: false,
        italic: true,
        color: "#4F81BD",
      })),
      createTextRun("!", createRunProperties({
        fontSize: 48,
        fontFamily: "Impact",
        bold: true,
        color: "#9BBB59",
      })),
    ]),
  ]), []);

  // Run layout engine using library function (ECMA-376 compliant)
  const runs = useMemo(() => {
    const textBody = showMixedStyles ? mixedStylesTextBody : singleRunTextBody;
    return extractText3DRuns(
      textBody,
      400,
      200,
      demoColorContext,
      undefined, // fontScheme
      undefined, // options
      () => undefined, // resourceResolver
    );
  }, [showMixedStyles, singleRunTextBody, mixedStylesTextBody]);

  return (
    <div className="text3d-preview-container">
      <div className="text3d-controls">
        <label>
          <input
            type="checkbox"
            checked={showMixedStyles}
            onChange={(e) => setShowMixedStyles(e.target.checked)}
          />
          Show Mixed Styles (multi-run)
        </label>
        {!showMixedStyles && (
          <label>
            Text:
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value || "3D")}
              maxLength={10}
            />
          </label>
        )}
        <label>
          Camera:
          <select value={camera} onChange={(e) => setCamera(e.target.value as PresetCameraType)}>
            {cameraPresets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Material:
          <select value={material} onChange={(e) => setMaterial(e.target.value as PresetMaterialType)}>
            {materialPresets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Bevel:
          <select value={bevelPreset} onChange={(e) => setBevelPreset(e.target.value as BevelPresetType)}>
            {bevelPresets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Extrusion: {extrusion}px
          <input
            type="range"
            min={0}
            max={50}
            value={extrusion}
            onChange={(e) => setExtrusion(Number(e.target.value))}
          />
        </label>
        <label>
          Contour Width: {contourWidth}px
          <input
            type="range"
            min={0}
            max={20}
            value={contourWidth}
            onChange={(e) => setContourWidth(Number(e.target.value))}
          />
        </label>
        <label>
          Contour Color:
          <input
            type="color"
            value={contourColor}
            onChange={(e) => setContourColor(e.target.value)}
          />
        </label>
      </div>
      <div className="text3d-canvas" style={{ width: 400, height: 200, background: "#1a1a2e", borderRadius: 8 }}>
        <Text3DRenderer
          runs={runs}
          width={400}
          height={200}
          scene3d={buildScene3d({
            camera,
            lightRig: { rig: "threePt", direction: "tl" },
          })}
          shape3d={buildShape3d({
            extrusionHeight: extrusion,
            preset: material,
            bevel: { width: 8, height: 8, preset: bevelPreset },
            contourWidth: contourWidth > 0 ? contourWidth : undefined,
            contourColor: contourWidth > 0 ? contourColor : undefined,
          })}
        />
      </div>
      {showMixedStyles && (
        <p className="pattern-info" style={{ marginTop: 8 }}>
          Mixed styles demo: "Multi" (red, bold), "-" (black, normal), "Style" (blue, Georgia italic), "!" (green, Impact).
          Each run is rendered as a separate 3D mesh with its own material.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * WebGL Mode Text Effects Test
 *
 * Tests text rendering capabilities in WebGL mode:
 * - True 3D extrusion (ExtrudeGeometry)
 * - Material presets (MeshStandardMaterial)
 * - Bevel effects
 * - Camera presets (orthographic, perspective, isometric)
 * - Light rigs
 * - Per-run styling
 */
export function WebglTextEffectsTest() {
  // Text Fill items
  const textFillItems: CheckItem[] = [
    { label: "Solid fill (solidFill)", status: "pass", notes: "Three.js material color" },
    { label: "Gradient fill (gradFill)", status: "pass", notes: "Canvas-based gradient texture" },
    { label: "Pattern fill (pattFill)", status: "pass", notes: "40+ ECMA-376 pattern presets" },
    { label: "Image fill (blipFill)", status: "pass", notes: "Pre-loaded texture support" },
  ];

  // Text Outline items
  const textOutlineItems: CheckItem[] = [
    { label: "Solid outline (ln)", status: "pass", notes: "BackFace outline geometry" },
    { label: "Outline width (w)", status: "pass", notes: "Scale-based width" },
    { label: "Outline color", status: "pass", notes: "MeshBasicMaterial color" },
  ];

  // Text Effects items
  const textEffectItems: CheckItem[] = [
    { label: "Shadow (outerShdw)", status: "pass", notes: "Drop shadow mesh + PCFSoftShadowMap" },
    { label: "Glow (glow)", status: "pass", notes: "Layered emissive mesh" },
    { label: "Reflection (reflection)", status: "pass", notes: "Mirrored geometry with fade" },
    { label: "Soft edge (softEdge)", status: "pass", notes: "Material opacity-based" },
  ];

  // 3D Properties items
  const text3dItems: CheckItem[] = [
    { label: "3D scene (scene3d)", status: "pass", notes: "Three.js camera presets" },
    { label: "3D shape (sp3d)", status: "pass", notes: "ExtrudeGeometry + materials" },
    { label: "Flat text (flatTx)", status: "pass", notes: "Z-offset positioning" },
    { label: "Bevel effects (bevel)", status: "pass", notes: "ExtrudeGeometry bevelEnabled" },
    { label: "Extrusion (extrusionH)", status: "pass", notes: "ExtrudeGeometry depth" },
    { label: "Contour (contourW/contourClr)", status: "pass", notes: "Scaled shell mesh behind main" },
    { label: "Material presets", status: "pass", notes: "MeshStandardMaterial variants" },
    { label: "Light rig (lightRig)", status: "pass", notes: "Three.js light presets" },
    { label: "Camera presets", status: "pass", notes: "Orthographic/Perspective cameras" },
    { label: "Per-run styling", status: "pass", notes: "Individual mesh per run" },
  ];

  return (
    <div className="test-section">
      <h3>WebGL Mode - Text Effects (3D)</h3>
      <p className="section-description">
        ECMA-376 text effects rendered using Three.js WebGL for true 3D rendering.
        <br />
        Requires WebGL support. Provides extrusion, materials, and lighting.
      </p>

      <TestSubsection title="Text Fill" items={textFillItems}>
        <p className="pattern-info">
          All fill types supported: solidFill (material color), gradFill (canvas gradient texture),
          pattFill (40+ ECMA-376 presets), blipFill (pre-loaded THREE.Texture).
          Pass <code>fill</code> property on Text3DRunConfig.
        </p>
      </TestSubsection>

      <TestSubsection title="Text Outline" items={textOutlineItems}>
        <p className="pattern-info">
          Outline implemented via BackFace geometry technique (scaled clone with BackSide material).
          Pass <code>outline</code> property on Text3DRunConfig with color and width.
        </p>
      </TestSubsection>

      <TestSubsection title="Text Effects" items={textEffectItems}>
        <p className="pattern-info">
          All ECMA-376 text effects supported: shadow (drop shadow mesh), glow (layered emissive),
          reflection (mirrored geometry), softEdge (material opacity).
          Pass corresponding effect property on Text3DRunConfig.
        </p>
      </TestSubsection>

      <TestSubsection title="3D Properties (scene3d / sp3d)" items={text3dItems}>
        <Text3DPreview />
        <p className="pattern-info">
          True 3D rendering with Three.js ExtrudeGeometry.
          Supports ECMA-376 scene3d (camera, lightRig) and sp3d (extrusion, bevel, material presets).
        </p>
      </TestSubsection>

      <TestSubsection
        title={`WordArt Presets (${allDemoWordArtPresets.length} styles)`}
        items={[
          { label: "Classic 2D styles", status: "pass" },
          { label: "Gradient fills", status: "pass", notes: "Canvas-based gradient textures" },
          { label: "3D extrusion styles", status: "pass" },
          { label: "Material variations", status: "pass" },
          { label: "Camera/lighting presets", status: "pass" },
        ]}
      >
        <WordArtGallery />
        <p className="pattern-info">
          Classic WordArt-style presets combining fill, material, extrusion, bevel, camera, and lighting settings.
          Select a style from the gallery to preview.
        </p>
      </TestSubsection>
    </div>
  );
}
