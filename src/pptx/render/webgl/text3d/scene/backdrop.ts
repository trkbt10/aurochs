/**
 * @file 3D Backdrop Implementation
 *
 * Implements ECMA-376 backdrop element for 3D scenes.
 * The backdrop defines a 3D plane that serves as a background for 3D effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.3 (backdrop)
 */

import * as THREE from "three";

// =============================================================================
// Backdrop Types
// =============================================================================

/**
 * Backdrop configuration derived from ECMA-376 Backdrop3d
 *
 * @see ECMA-376 Part 1, Section 20.1.5.3 (backdrop)
 */
export type BackdropConfig = {
  /** Anchor point in 3D space (x, y, z in scene units) */
  readonly anchor: { x: number; y: number; z: number };
  /** Normal vector defining plane orientation */
  readonly normal: { x: number; y: number; z: number };
  /** Up vector for plane rotation */
  readonly up: { x: number; y: number; z: number };
  /** Backdrop size (default based on scene) */
  readonly size?: number;
  /** Backdrop color (optional, default transparent) */
  readonly color?: string;
  /** Backdrop opacity (0-1) */
  readonly opacity?: number;
  /** Whether backdrop receives shadows */
  readonly receiveShadow?: boolean;
};

/**
 * Backdrop state for renderer
 */
export type BackdropState = {
  readonly mesh: THREE.Mesh;
  readonly plane: THREE.Plane;
};

// =============================================================================
// Coordinate Scale
// =============================================================================

/**
 * Coordinate scale for converting pixel units to scene units.
 * Must match COORDINATE_SCALE in core.ts.
 */
const COORDINATE_SCALE = 1 / 96;

// =============================================================================
// Backdrop Implementation
// =============================================================================

/**
 * Create a backdrop plane from ECMA-376 configuration.
 *
 * The backdrop is positioned using:
 * - anchor: The center point of the plane
 * - normal: The direction the plane faces
 * - up: The "up" direction for the plane
 *
 * @param config - Backdrop configuration
 * @param sceneSize - Approximate scene size for default backdrop size
 * @see ECMA-376 Part 1, Section 20.1.5.3 (backdrop)
 */
export function createBackdropMesh(
  config: BackdropConfig,
  sceneSize: number = 10,
): BackdropState {
  // Determine backdrop size
  const size = config.size ?? sceneSize * 2;

  // Create plane geometry
  const geometry = new THREE.PlaneGeometry(size, size);

  // Create material
  const color = config.color ? new THREE.Color(config.color) : new THREE.Color(0xffffff);
  const opacity = config.opacity ?? 0;

  const material = new THREE.MeshStandardMaterial({
    color: color,
    transparent: opacity < 1,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthWrite: opacity > 0.5,
  });

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "backdrop";

  // Position at anchor point
  mesh.position.set(
    config.anchor.x * COORDINATE_SCALE,
    config.anchor.y * COORDINATE_SCALE,
    config.anchor.z * COORDINATE_SCALE,
  );

  // Orient based on normal and up vectors
  const normal = new THREE.Vector3(config.normal.x, config.normal.y, config.normal.z).normalize();
  const up = new THREE.Vector3(config.up.x, config.up.y, config.up.z).normalize();

  // Calculate rotation to align plane with normal
  // Default plane faces +Z, we need to rotate to face along normal
  const quaternion = new THREE.Quaternion();
  const defaultNormal = new THREE.Vector3(0, 0, 1);

  // If normal is opposite to default, we need special handling
  if (normal.dot(defaultNormal) < -0.999) {
    // Rotate 180° around up axis
    quaternion.setFromAxisAngle(up, Math.PI);
  } else {
    quaternion.setFromUnitVectors(defaultNormal, normal);
  }

  mesh.quaternion.copy(quaternion);

  // Apply up vector rotation (roll around normal)
  const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  const upRotation = new THREE.Quaternion();
  if (Math.abs(currentUp.dot(up)) < 0.999) {
    upRotation.setFromUnitVectors(currentUp, up);
    mesh.quaternion.premultiply(upRotation);
  }

  // Configure shadow receiving
  if (config.receiveShadow !== false) {
    mesh.receiveShadow = true;
  }

  // Create mathematical plane for intersection tests
  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(
    normal,
    new THREE.Vector3(
      config.anchor.x * COORDINATE_SCALE,
      config.anchor.y * COORDINATE_SCALE,
      config.anchor.z * COORDINATE_SCALE,
    ),
  );

  return { mesh, plane };
}

/**
 * Create a default backdrop behind the scene.
 *
 * This creates a simple backdrop plane positioned behind all 3D content.
 *
 * @param depth - Distance behind origin
 * @param size - Size of the backdrop
 * @param color - Backdrop color
 */
export function createDefaultBackdrop(
  depth: number = 5,
  size: number = 20,
  color: string = "#ffffff",
): BackdropState {
  return createBackdropMesh({
    anchor: { x: 0, y: 0, z: -depth / COORDINATE_SCALE },
    normal: { x: 0, y: 0, z: 1 }, // Facing forward
    up: { x: 0, y: 1, z: 0 },
    size,
    color,
    opacity: 1,
    receiveShadow: true,
  });
}

/**
 * Create a gradient backdrop.
 *
 * Creates a backdrop with a vertical gradient from top to bottom.
 *
 * @param config - Base backdrop configuration
 * @param topColor - Color at top of backdrop
 * @param bottomColor - Color at bottom of backdrop
 */
export function createGradientBackdrop(
  config: Omit<BackdropConfig, "color">,
  topColor: string,
  bottomColor: string,
): BackdropState {
  const size = config.size ?? 10;

  // Create plane geometry with vertex colors
  const geometry = new THREE.PlaneGeometry(size, size, 1, 10);

  // Apply gradient via vertex colors
  const colors: number[] = [];
  const topColorObj = new THREE.Color(topColor);
  const bottomColorObj = new THREE.Color(bottomColor);
  const positions = geometry.getAttribute("position");

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    // Normalize y to 0-1 range
    const t = (y / size) + 0.5;
    const color = new THREE.Color().lerpColors(bottomColorObj, topColorObj, t);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  // Create material with vertex colors
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: (config.opacity ?? 1) < 1,
    opacity: config.opacity ?? 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "backdrop-gradient";

  // Position and orient
  mesh.position.set(
    config.anchor.x * COORDINATE_SCALE,
    config.anchor.y * COORDINATE_SCALE,
    config.anchor.z * COORDINATE_SCALE,
  );

  const normal = new THREE.Vector3(config.normal.x, config.normal.y, config.normal.z).normalize();
  const defaultNormal = new THREE.Vector3(0, 0, 1);
  const quaternion = new THREE.Quaternion();

  if (normal.dot(defaultNormal) < -0.999) {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  } else {
    quaternion.setFromUnitVectors(defaultNormal, normal);
  }

  mesh.quaternion.copy(quaternion);

  if (config.receiveShadow !== false) {
    mesh.receiveShadow = true;
  }

  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(
    normal,
    new THREE.Vector3(
      config.anchor.x * COORDINATE_SCALE,
      config.anchor.y * COORDINATE_SCALE,
      config.anchor.z * COORDINATE_SCALE,
    ),
  );

  return { mesh, plane };
}

// =============================================================================
// Backdrop from Domain Type
// =============================================================================

/**
 * Create backdrop from ECMA-376 Backdrop3d domain type.
 *
 * @param backdrop - Backdrop3d from domain
 * @param options - Additional options
 */
export function createBackdropFromDomain(
  backdrop: {
    readonly anchor: { x: number; y: number };
    readonly normal: { x: number; y: number };
    readonly up: { x: number; y: number };
  },
  options?: {
    readonly size?: number;
    readonly color?: string;
    readonly opacity?: number;
    readonly receiveShadow?: boolean;
  },
): BackdropState {
  // Convert 2D points to 3D (ECMA-376 uses 2D for backdrop vectors)
  // The Z component is derived from context
  return createBackdropMesh({
    anchor: { x: backdrop.anchor.x, y: backdrop.anchor.y, z: 0 },
    normal: { x: backdrop.normal.x, y: backdrop.normal.y, z: 1 },
    up: { x: backdrop.up.x, y: backdrop.up.y, z: 0 },
    ...options,
  });
}

// =============================================================================
// Backdrop Utilities
// =============================================================================

/**
 * Update backdrop color.
 */
export function updateBackdropColor(backdrop: BackdropState, color: string): void {
  const material = backdrop.mesh.material as THREE.MeshStandardMaterial;
  material.color.set(color);
}

/**
 * Update backdrop opacity.
 */
export function updateBackdropOpacity(backdrop: BackdropState, opacity: number): void {
  const material = backdrop.mesh.material as THREE.MeshStandardMaterial;
  material.opacity = opacity;
  material.transparent = opacity < 1;
  material.depthWrite = opacity > 0.5;
}

/**
 * Update backdrop position.
 */
export function updateBackdropPosition(
  backdrop: BackdropState,
  anchor: { x: number; y: number; z: number },
): void {
  backdrop.mesh.position.set(
    anchor.x * COORDINATE_SCALE,
    anchor.y * COORDINATE_SCALE,
    anchor.z * COORDINATE_SCALE,
  );

  const normal = new THREE.Vector3();
  backdrop.plane.normal.clone();

  backdrop.plane.setFromNormalAndCoplanarPoint(
    normal,
    backdrop.mesh.position,
  );
}

/**
 * Dispose backdrop resources.
 */
export function disposeBackdrop(backdrop: BackdropState): void {
  backdrop.mesh.geometry.dispose();
  if (backdrop.mesh.material instanceof THREE.Material) {
    backdrop.mesh.material.dispose();
  }
}

/**
 * Add backdrop to scene at appropriate render order.
 */
export function addBackdropToScene(scene: THREE.Scene, backdrop: BackdropState): void {
  backdrop.mesh.renderOrder = -1000; // Render first (behind everything)
  scene.add(backdrop.mesh);
}
