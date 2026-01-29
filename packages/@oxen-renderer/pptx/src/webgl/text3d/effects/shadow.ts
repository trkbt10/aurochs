/**
 * @file 3D Text Shadow Effect
 *
 * Implements shadow effects for 3D text using Three.js shadow mapping.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */

import * as THREE from "three";
import { createEffectCanvas } from "../utils/canvas";

// =============================================================================
// Shadow Types
// =============================================================================

/**
 * Shadow configuration for 3D text
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
export type ShadowConfig = {
  /** Shadow type (outer or inner) */
  readonly type: "outer" | "inner";
  /** Shadow color (hex string) */
  readonly color: string;
  /** Blur radius in pixels */
  readonly blurRadius: number;
  /** Distance from object in pixels */
  readonly distance: number;
  /** Direction in degrees (0 = right, 90 = down) */
  readonly direction: number;
  /** Shadow opacity (0-1) */
  readonly opacity?: number;
  /** Horizontal scale factor (0-100+, default 100) @see ECMA-376 sx attribute */
  readonly scaleX?: number;
  /** Vertical scale factor (0-100+, default 100) @see ECMA-376 sy attribute */
  readonly scaleY?: number;
};

/**
 * Shadow state for renderer
 */
export type ShadowState = {
  readonly enabled: boolean;
  readonly mesh?: THREE.Mesh;
  readonly light?: THREE.DirectionalLight;
};

// =============================================================================
// Shadow Implementation
// =============================================================================

/**
 * Enable shadow mapping on renderer and configure shadow-casting lights.
 *
 * @param renderer - Three.js WebGLRenderer
 */
export function enableShadowMapping(renderer: THREE.WebGLRenderer): void {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/**
 * Create a shadow-casting directional light based on shadow config.
 *
 * @param config - Shadow configuration
 * @param sceneSize - Approximate scene size for shadow camera
 */
export function createShadowLight(
  config: ShadowConfig,
  sceneSize: number = 10,
): THREE.DirectionalLight {
  const color = new THREE.Color(config.color);
  const light = new THREE.DirectionalLight(color, 0.5);

  // Position light based on direction and distance
  const angleRad = (config.direction * Math.PI) / 180;
  const normalizedDist = config.distance / 10; // Normalize to scene units

  light.position.set(
    -Math.cos(angleRad) * normalizedDist * 5,
    5, // Above the scene
    -Math.sin(angleRad) * normalizedDist * 5,
  );

  // Enable shadow casting
  light.castShadow = true;

  // Configure shadow map
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;

  // Configure shadow camera
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = sceneSize * 4;
  light.shadow.camera.left = -sceneSize;
  light.shadow.camera.right = sceneSize;
  light.shadow.camera.top = sceneSize;
  light.shadow.camera.bottom = -sceneSize;

  // Configure blur based on blurRadius
  light.shadow.radius = Math.max(1, config.blurRadius / 5);

  return light;
}

/**
 * Coordinate scale for converting pixel units to scene units.
 * Must match COORDINATE_SCALE in core.ts.
 */
const COORDINATE_SCALE = 1 / 96;

/**
 * Create a drop shadow mesh (2D shadow plane beneath the object).
 *
 * This is a simpler approach than shadow mapping, suitable for
 * stylized shadows.
 *
 * The shadow scale is determined by:
 * 1. ECMA-376 scaleX/scaleY attributes (default 100%)
 * 2. Coordinate system conversion (pixels to scene units)
 *
 * @param geometry - Source geometry to create shadow for
 * @param config - Shadow configuration
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
export function createDropShadowMesh(
  geometry: THREE.BufferGeometry,
  config: ShadowConfig,
): THREE.Mesh {
  // Compute bounding box
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);

  // Create shadow geometry (flattened version)
  const shadowGeometry = new THREE.PlaneGeometry(
    size.x * 1.2,
    size.y * 1.2,
  );

  // Parse color
  const color = new THREE.Color(config.color);

  // Create gradient texture for soft shadow
  const { canvas, ctx } = createEffectCanvas();

  // Create radial gradient for soft edges
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const opacity = config.opacity ?? 0.3;
  gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 0.5})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTexture = new THREE.CanvasTexture(canvas);

  // Create shadow material
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    color: color,
    transparent: true,
    opacity: opacity,
    depthWrite: false,
  });

  // Create shadow mesh
  const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowMesh.name = "text-shadow";

  // Apply ECMA-376 scale (sx, sy) combined with coordinate conversion
  // scaleX/scaleY are in percent (100 = 100%), COORDINATE_SCALE converts pixels to scene units
  const ecmaScaleX = (config.scaleX ?? 100) / 100;
  const ecmaScaleY = (config.scaleY ?? 100) / 100;
  shadowMesh.scale.set(
    ecmaScaleX * COORDINATE_SCALE,
    ecmaScaleY * COORDINATE_SCALE,
    COORDINATE_SCALE,
  );

  // Position shadow based on direction and distance
  const angleRad = (config.direction * Math.PI) / 180;
  const normalizedDist = config.distance * COORDINATE_SCALE;

  shadowMesh.position.set(
    Math.cos(angleRad) * normalizedDist,
    -Math.sin(angleRad) * normalizedDist,
    -0.1, // Slightly behind/below
  );

  return shadowMesh;
}

/**
 * Create an inner shadow effect (shadow inside the shape).
 *
 * Inner shadows in 3D are implemented using an inverted geometry approach:
 * 1. Clone the geometry and flip normals
 * 2. Create a slightly inset version
 * 3. Apply gradient-based shadow material
 *
 * @param geometry - Source geometry
 * @param config - Shadow configuration
 * @see ECMA-376 Part 1, Section 20.1.8.40 (innerShdw)
 */
export function createInnerShadowMesh(
  geometry: THREE.BufferGeometry,
  config: ShadowConfig,
): THREE.Mesh {
  // Clone geometry
  const shadowGeometry = geometry.clone();

  // Flip normals for inside-facing rendering
  const normalAttr = shadowGeometry.getAttribute("normal");
  if (normalAttr) {
    const normals = normalAttr.array as Float32Array;
    for (let i = 0; i < normals.length; i++) {
      normals[i] *= -1;
    }
    normalAttr.needsUpdate = true;
  }

  // Flip face winding
  const indexAttr = shadowGeometry.getIndex();
  if (indexAttr) {
    const indices = indexAttr.array as Uint16Array | Uint32Array;
    for (let i = 0; i < indices.length; i += 3) {
      // Swap second and third vertices to flip winding
      const tmp = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = tmp;
    }
    indexAttr.needsUpdate = true;
  }

  // Parse color
  const color = new THREE.Color(config.color);
  const opacity = config.opacity ?? 0.5;

  // Create inner shadow material
  // Uses transparency and back-face rendering to create inner shadow effect
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.MultiplyBlending,
  });

  // Create mesh
  const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowMesh.name = "text-inner-shadow";

  // Position based on direction and distance
  const angleRad = (config.direction * Math.PI) / 180;
  const normalizedDist = config.distance * COORDINATE_SCALE * 0.3; // Smaller offset for inner

  shadowMesh.position.set(
    Math.cos(angleRad) * normalizedDist,
    -Math.sin(angleRad) * normalizedDist,
    0,
  );

  // Slight scale down to create inset effect
  const insetScale = 1 - config.blurRadius * COORDINATE_SCALE * 0.1;
  shadowMesh.scale.setScalar(Math.max(0.9, insetScale));

  return shadowMesh;
}

/**
 * Create an inner shadow using shader-based approach.
 *
 * This provides more accurate inner shadows using custom shaders
 * that calculate shadow based on depth and normals.
 *
 * @param geometry - Source geometry
 * @param config - Shadow configuration
 * @see ECMA-376 Part 1, Section 20.1.8.40 (innerShdw)
 */
export function createInnerShadowShader(
  geometry: THREE.BufferGeometry,
  config: ShadowConfig,
): THREE.Mesh {
  const color = new THREE.Color(config.color);
  const opacity = config.opacity ?? 0.5;

  // Custom shader for inner shadow
  const innerShadowShader = {
    uniforms: {
      shadowColor: { value: color },
      shadowOpacity: { value: opacity },
      shadowDirection: {
        value: new THREE.Vector2(
          Math.cos((config.direction * Math.PI) / 180),
          -Math.sin((config.direction * Math.PI) / 180),
        ),
      },
      shadowDistance: { value: config.distance * COORDINATE_SCALE },
      shadowBlur: { value: config.blurRadius * COORDINATE_SCALE },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 shadowColor;
      uniform float shadowOpacity;
      uniform vec2 shadowDirection;
      uniform float shadowDistance;
      uniform float shadowBlur;

      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        // Calculate shadow intensity based on normal direction
        vec3 lightDir = normalize(vec3(shadowDirection, 0.5));
        float intensity = max(0.0, -dot(vNormal, lightDir));

        // Apply blur falloff
        float falloff = smoothstep(0.0, shadowBlur, intensity * shadowDistance);

        // Apply shadow
        float alpha = falloff * shadowOpacity;
        gl_FragColor = vec4(shadowColor, alpha);
      }
    `,
  };

  const material = new THREE.ShaderMaterial({
    uniforms: innerShadowShader.uniforms,
    vertexShader: innerShadowShader.vertexShader,
    fragmentShader: innerShadowShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry.clone(), material);
  mesh.name = "text-inner-shadow-shader";

  return mesh;
}

// =============================================================================
// Shadow Utilities
// =============================================================================

/**
 * Configure mesh for shadow casting.
 */
export function enableMeshShadows(mesh: THREE.Mesh, cast: boolean = true, receive: boolean = true): void {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
}

/**
 * Configure group for shadow casting.
 */
export function enableGroupShadows(
  group: THREE.Group,
  cast: boolean = true,
  receive: boolean = true,
): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Create shadow receiving plane.
 *
 * @param size - Size of the plane
 * @param position - Position of the plane
 */
export function createShadowPlane(
  size: number = 20,
  position: THREE.Vector3 = new THREE.Vector3(0, -2, 0),
): THREE.Mesh {
  const planeGeometry = new THREE.PlaneGeometry(size, size);
  const planeMaterial = new THREE.ShadowMaterial({
    opacity: 0.3,
  });

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.copy(position);
  plane.receiveShadow = true;
  plane.name = "shadow-plane";

  return plane;
}

/**
 * Dispose shadow resources.
 */
export function disposeShadow(shadow: THREE.Mesh | THREE.Light): void {
  if (shadow instanceof THREE.Mesh) {
    shadow.geometry.dispose();
    if (shadow.material instanceof THREE.Material) {
      shadow.material.dispose();
    }
  } else if (shadow instanceof THREE.DirectionalLight && shadow.shadow.map) {
    shadow.shadow.map.dispose();
  }
}
