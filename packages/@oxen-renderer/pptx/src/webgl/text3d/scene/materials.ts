/**
 * @file 3D Materials for WebGL text rendering
 *
 * Maps ECMA-376 material presets to Three.js materials.
 * Supports both solid colors and gradient fills.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetMaterialType)
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 */

import * as THREE from "three";
import type { PresetMaterialType } from "@oxen-office/pptx/domain/index";
import { createLinearGradientTextureFromResolved } from "./gradient-texture";
import { createPatternTextureFromResolved, type PatternPreset } from "./pattern-texture";
import { type ImageFillMode, type SourceRect } from "./image-texture";

// =============================================================================
// Material Configuration Types
// =============================================================================

export type MaterialConfig = {
  /** Material color */
  readonly color: number;
  /** Roughness (0 = mirror, 1 = rough) */
  readonly roughness: number;
  /** Metalness (0 = dielectric, 1 = metal) */
  readonly metalness: number;
  /** Emissive color (self-illumination) */
  readonly emissive: number;
  /** Emissive intensity */
  readonly emissiveIntensity: number;
  /** Transparency (0 = opaque, 1 = fully transparent) */
  readonly opacity: number;
  /** Whether material is transparent */
  readonly transparent: boolean;
  /** Environment map intensity */
  readonly envMapIntensity: number;
};

// =============================================================================
// Material Preset Implementations
// =============================================================================

/**
 * Create material configuration from preset
 *
 * @see ECMA-376 Part 1, Section 20.1.10.50
 */
export function createMaterialConfig(
  preset: PresetMaterialType | undefined,
  baseColor: number = 0x4080ff,
): MaterialConfig {
  const defaultConfig: MaterialConfig = {
    color: baseColor,
    roughness: 0.5,
    metalness: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
    opacity: 1,
    transparent: false,
    envMapIntensity: 0.5,
  };

  if (!preset) {
    return defaultConfig;
  }

  switch (preset) {
    // =========================================================================
    // Basic Materials
    // =========================================================================
    case "flat":
      return {
        ...defaultConfig,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0,
      };

    case "matte":
      return {
        ...defaultConfig,
        roughness: 0.9,
        metalness: 0,
        envMapIntensity: 0.1,
      };

    case "plastic":
      return {
        ...defaultConfig,
        roughness: 0.3,
        metalness: 0,
        envMapIntensity: 0.6,
      };

    case "metal":
      return {
        ...defaultConfig,
        roughness: 0.2,
        metalness: 0.9,
        envMapIntensity: 0.8,
      };

    // =========================================================================
    // Specialty Materials
    // =========================================================================
    case "clear":
      return {
        ...defaultConfig,
        roughness: 0.1,
        metalness: 0,
        opacity: 0.3,
        transparent: true,
        envMapIntensity: 1.0,
      };

    case "powder":
      return {
        ...defaultConfig,
        roughness: 0.95,
        metalness: 0,
        envMapIntensity: 0.05,
      };

    case "translucentPowder":
      return {
        ...defaultConfig,
        roughness: 0.9,
        metalness: 0,
        opacity: 0.7,
        transparent: true,
        envMapIntensity: 0.1,
      };

    case "softEdge":
      return {
        ...defaultConfig,
        roughness: 0.7,
        metalness: 0,
        envMapIntensity: 0.2,
      };

    case "softmetal":
      return {
        ...defaultConfig,
        roughness: 0.5,
        metalness: 0.6,
        envMapIntensity: 0.5,
      };

    case "dkEdge":
      return {
        ...defaultConfig,
        roughness: 0.4,
        metalness: 0.3,
        envMapIntensity: 0.4,
      };

    case "warmMatte":
      return {
        ...defaultConfig,
        color: adjustColorWarmth(baseColor, 0.1),
        roughness: 0.85,
        metalness: 0,
        envMapIntensity: 0.15,
      };

    // =========================================================================
    // Legacy Materials
    // =========================================================================
    case "legacyMatte":
      return {
        ...defaultConfig,
        roughness: 0.85,
        metalness: 0,
        envMapIntensity: 0.1,
      };

    case "legacyPlastic":
      return {
        ...defaultConfig,
        roughness: 0.35,
        metalness: 0,
        envMapIntensity: 0.5,
      };

    case "legacyMetal":
      return {
        ...defaultConfig,
        roughness: 0.25,
        metalness: 0.85,
        envMapIntensity: 0.7,
      };

    case "legacyWireframe":
      return {
        ...defaultConfig,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0,
        // Note: Wireframe is handled separately in material creation
      };

    default:
      return defaultConfig;
  }
}

// =============================================================================
// Three.js Material Creation
// =============================================================================

/**
 * Create Three.js material from configuration
 */
export function createMaterial(config: MaterialConfig, isWireframe: boolean = false): THREE.Material {
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: config.roughness,
    metalness: config.metalness,
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    opacity: config.opacity,
    transparent: config.transparent,
    envMapIntensity: config.envMapIntensity,
    wireframe: isWireframe,
    side: THREE.DoubleSide,
  });

  return material;
}

/**
 * Create material for extrusion sides (usually darker)
 */
export function createExtrusionMaterial(config: MaterialConfig): THREE.Material {
  const darkerColor = darkenColor(config.color, 0.3);

  return new THREE.MeshStandardMaterial({
    color: darkerColor,
    roughness: config.roughness,
    metalness: config.metalness,
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    opacity: config.opacity,
    transparent: config.transparent,
    envMapIntensity: config.envMapIntensity * 0.7,
    side: THREE.DoubleSide,
  });
}

/**
 * Create material for bevel surfaces
 */
export function createBevelMaterial(config: MaterialConfig): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: Math.max(0.1, config.roughness - 0.2),
    metalness: Math.min(1, config.metalness + 0.1),
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    opacity: config.opacity,
    transparent: config.transparent,
    envMapIntensity: config.envMapIntensity * 1.2,
    side: THREE.DoubleSide,
  });
}

// =============================================================================
// Color Utility Functions
// =============================================================================

/**
 * Darken a color by a factor
 */
function darkenColor(color: number, factor: number): number {
  const r = ((color >> 16) & 0xff) * (1 - factor);
  const g = ((color >> 8) & 0xff) * (1 - factor);
  const b = (color & 0xff) * (1 - factor);
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

/**
 * Adjust color warmth (add red/orange tint)
 */
function adjustColorWarmth(color: number, factor: number): number {
  let r = (color >> 16) & 0xff;
  let g = (color >> 8) & 0xff;
  const b = color & 0xff;

  r = Math.min(255, r + Math.floor(factor * 50));
  g = Math.min(255, g + Math.floor(factor * 20));

  return (r << 16) | (g << 8) | b;
}

/**
 * Parse hex color string to number
 */
export function parseColor(hex: string): number {
  // Remove # if present
  const cleaned = hex.replace("#", "");
  return parseInt(cleaned, 16);
}

/**
 * Convert RGB to hex number
 */
export function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

// =============================================================================
// Gradient Material Support
// =============================================================================

/**
 * Resolved gradient stop for material rendering.
 * This is an INTERNAL type with pre-resolved hex colors.
 * For domain type, use GradientStop from domain/color.ts
 */
export type ResolvedMaterialGradientStop = {
  /** Position 0-100 as percentage */
  readonly position: number;
  /** Resolved hex color string (e.g., "#ff0000") */
  readonly color: string;
};

/**
 * Pattern fill configuration for 3D materials
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 */
export type Material3DPatternFill = {
  readonly type: "pattern";
  readonly preset: PatternPreset;
  readonly foregroundColor: string;
  readonly backgroundColor: string;
};

/**
 * Image fill configuration for 3D materials
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type Material3DImageFill = {
  readonly type: "image";
  /** Pre-loaded THREE.Texture or data URL */
  readonly texture?: THREE.Texture;
  readonly imageUrl?: string;
  readonly mode?: ImageFillMode;
  readonly sourceRect?: SourceRect;
};

/**
 * Fill type for 3D materials.
 * This is an INTERNAL render type with pre-resolved colors.
 *
 * For ECMA-376 compliant domain types, see:
 * - domain/color.ts: SolidFill, GradientFill, PatternFill, BlipFill
 *
 * @internal
 */
export type Material3DFill =
  | { readonly type: "solid"; readonly color: string }
  | { readonly type: "gradient"; readonly angle: number; readonly stops: readonly ResolvedMaterialGradientStop[] }
  | Material3DPatternFill
  | Material3DImageFill;

/**
 * Create a Three.js material with gradient texture
 *
 * Uses canvas-based gradient texture for the material's map.
 * The base color is set to white so the texture is displayed correctly.
 *
 * @internal This function accepts resolved colors (hex strings).
 */
export function createGradientMaterial(
  config: MaterialConfig,
  gradientFill: { readonly angle: number; readonly stops: readonly ResolvedMaterialGradientStop[] },
  isWireframe: boolean = false,
): THREE.Material {
  // Create gradient texture using resolved colors
  const texture = createLinearGradientTextureFromResolved(
    gradientFill.angle,
    gradientFill.stops,
  );

  // Create material with gradient texture
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff, // White base so texture shows correctly
    roughness: config.roughness,
    metalness: config.metalness,
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    opacity: config.opacity,
    transparent: config.transparent,
    envMapIntensity: config.envMapIntensity,
    wireframe: isWireframe,
    side: THREE.DoubleSide,
  });

  return material;
}

/**
 * Create a Three.js material with pattern texture
 *
 * Uses canvas-based pattern texture for the material's map.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 */
export function createPatternMaterial(
  config: MaterialConfig,
  patternFill: Material3DPatternFill,
  isWireframe: boolean = false,
): THREE.Material {
  // Create pattern texture using resolved colors
  const texture = createPatternTextureFromResolved(
    patternFill.preset,
    patternFill.foregroundColor,
    patternFill.backgroundColor,
  );

  // Create material with pattern texture
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff, // White base so texture shows correctly
    roughness: config.roughness,
    metalness: config.metalness,
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    opacity: config.opacity,
    transparent: config.transparent,
    envMapIntensity: config.envMapIntensity,
    wireframe: isWireframe,
    side: THREE.DoubleSide,
  });

  return material;
}

/**
 * Create a Three.js material with image texture
 *
 * Uses a pre-loaded texture or placeholder for the material's map.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export function createImageMaterial(
  config: MaterialConfig,
  imageFill: Material3DImageFill,
  isWireframe: boolean = false,
): THREE.Material {
  // Use provided texture or create a placeholder
  const texture = imageFill.texture;

  // Create material with or without texture
  const material = new THREE.MeshStandardMaterial({
    map: texture ?? null,
    color: texture ? 0xffffff : config.color, // White base if texture, else use color
    roughness: config.roughness,
    metalness: config.metalness,
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    opacity: config.opacity,
    transparent: config.transparent || (texture?.format === THREE.RGBAFormat),
    envMapIntensity: config.envMapIntensity,
    wireframe: isWireframe,
    side: THREE.DoubleSide,
  });

  return material;
}

/**
 * Create material from fill specification
 *
 * Unified function that handles solid, gradient, pattern, and image fills.
 * Automatically chooses the appropriate material creation method.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export function createMaterialFromFill(
  fill: Material3DFill,
  preset: PresetMaterialType | undefined,
  isWireframe: boolean = false,
): THREE.Material {
  switch (fill.type) {
    case "solid": {
      const baseColor = parseColor(fill.color);
      const materialConfig = createMaterialConfig(preset, baseColor);
      return createMaterial(materialConfig, isWireframe);
    }
    case "gradient": {
      // Gradient fill - use first stop color for material config base
      const primaryColor = fill.stops[0]?.color ?? "#4080ff";
      const baseColor = parseColor(primaryColor);
      const materialConfig = createMaterialConfig(preset, baseColor);
      return createGradientMaterial(materialConfig, fill, isWireframe);
    }
    case "pattern": {
      // Pattern fill - use foreground color for material config base
      const baseColor = parseColor(fill.foregroundColor);
      const materialConfig = createMaterialConfig(preset, baseColor);
      return createPatternMaterial(materialConfig, fill, isWireframe);
    }
    case "image": {
      // Image fill - use default color for material config
      const materialConfig = createMaterialConfig(preset);
      return createImageMaterial(materialConfig, fill, isWireframe);
    }
    default: {
      // Exhaustive check
      const _exhaustive: never = fill;
      throw new Error(`Unknown fill type: ${(_exhaustive as Material3DFill).type}`);
    }
  }
}
