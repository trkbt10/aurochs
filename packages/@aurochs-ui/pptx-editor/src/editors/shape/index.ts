/**
 * @file Shape editors exports
 *
 * Exports all shape-related editors including:
 * - Main editors (NonVisualProperties, Effects, Geometry, ShapeProperties, Scene3d, Shape3d)
 * - Reusable sub-editors (Rotation3d, Point, Hyperlink, Bevel3d, Backdrop3d, Camera3d, LightRig)
 */

// =============================================================================
// Main Editors
// =============================================================================

export {
  NonVisualPropertiesEditor,
  type NonVisualPropertiesEditorProps,
  createDefaultNonVisualProperties,
} from "./NonVisualPropertiesEditor";

export {
  EffectsEditor,
  type EffectsEditorProps,
  createDefaultEffects,
} from "./EffectsEditor";

export {
  EffectsEditorPanel,
  EffectListPanel,
  EffectDetailPanel,
  EFFECT_CONFIGS,
  EFFECT_CATEGORIES,
  type EffectsEditorPanelProps,
  type EffectListPanelProps,
  type EffectDetailPanelProps,
  type EffectKey,
  type EffectCategory,
  type EffectConfig,
  type CategoryMeta,
} from "./effects";

export {
  GeometryEditor,
  type GeometryEditorProps,
  createDefaultGeometry,
} from "./GeometryEditor";

export {
  ShapePropertiesEditor,
  type ShapePropertiesEditorProps,
  createDefaultShapeProperties,
} from "./ShapePropertiesEditor";

export {
  Scene3dEditor,
  type Scene3dEditorProps,
  createDefaultScene3d,
} from "./Scene3dEditor";

export {
  Camera3dEditor,
  type Camera3dEditorProps,
  createDefaultCamera3d,
} from "./Camera3dEditor";

export {
  LightRigEditor,
  type LightRigEditorProps,
  createDefaultLightRig,
} from "./LightRigEditor";

export {
  Shape3dEditor,
  type Shape3dEditorProps,
  createDefaultShape3d,
} from "./Shape3dEditor";

// =============================================================================
// Reusable Sub-Editors
// =============================================================================

export {
  Rotation3dEditor,
  type Rotation3dEditorProps,
  createDefaultRotation3d,
} from "./Rotation3dEditor";

export {
  PointEditor,
  type PointEditorProps,
  createDefaultPoint,
} from "./PointEditor";

export {
  HyperlinkEditor,
  type HyperlinkEditorProps,
  createDefaultHyperlink,
} from "./HyperlinkEditor";

export {
  Bevel3dEditor,
  type Bevel3dEditorProps,
  createDefaultBevel3d,
} from "./Bevel3dEditor";

export {
  Backdrop3dEditor,
  type Backdrop3dEditorProps,
  createDefaultBackdrop3d,
} from "./Backdrop3dEditor";
