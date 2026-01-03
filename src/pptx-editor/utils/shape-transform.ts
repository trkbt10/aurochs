/**
 * @file Shape transform utilities
 *
 * Unified utilities for getting and updating Shape transforms.
 * All Shape types (sp, pic, cxnSp, grpSp, graphicFrame, contentPart)
 * are handled polymorphically.
 *
 * Also provides coordinate calculation utilities for proper group transform handling
 * according to ECMA-376.
 */

import type { Shape, Transform, GrpShape, GroupTransform } from "../../pptx/domain";

// Re-export getShapeTransform for convenience
export { getShapeTransform } from "../../pptx/render/svg/slide-utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Absolute bounds in slide coordinate space.
 */
export type AbsoluteBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

/**
 * Parent transform context for calculating child coordinates.
 * Used internally for recursive group processing.
 */
type ParentContext = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scaleX: number;
  readonly scaleY: number;
};

// =============================================================================
// Coordinate Conversion
// =============================================================================

/**
 * Convert client (mouse) coordinates to slide coordinates.
 *
 * This is the unified coordinate conversion used throughout the editor.
 *
 * @param clientX - Client X coordinate
 * @param clientY - Client Y coordinate
 * @param containerRect - Container element's bounding rect
 * @param slideWidth - Slide width in domain units
 * @param slideHeight - Slide height in domain units
 * @returns Slide coordinates or null if conversion fails
 */
export function clientToSlideCoords(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  slideWidth: number,
  slideHeight: number
): { x: number; y: number } {
  const scaleX = slideWidth / containerRect.width;
  const scaleY = slideHeight / containerRect.height;

  return {
    x: (clientX - containerRect.left) * scaleX,
    y: (clientY - containerRect.top) * scaleY,
  };
}

// =============================================================================
// Group Transform Calculations
// =============================================================================

/**
 * Calculate the absolute bounds of a shape in slide coordinate space.
 *
 * For group children, this correctly applies parent group transforms
 * including childOffset and childExtent according to ECMA-376.
 *
 * @see ECMA-376 Part 1, Section 20.1.7.5 (grpSpPr)
 *
 * @param shape - The shape to get bounds for
 * @param parentGroups - Array of parent groups from outermost to innermost
 * @returns Absolute bounds or undefined if shape has no transform
 */
export function getAbsoluteBounds(
  shape: Shape,
  parentGroups: readonly GrpShape[] = []
): AbsoluteBounds | undefined {
  const transform = getShapeTransformInternal(shape);
  if (!transform) return undefined;

  // Build cumulative parent context
  const context = buildParentContext(parentGroups);

  // Apply parent transforms to get absolute position
  const x = context.offsetX + (transform.x as number) * context.scaleX;
  const y = context.offsetY + (transform.y as number) * context.scaleY;
  const width = (transform.width as number) * context.scaleX;
  const height = (transform.height as number) * context.scaleY;

  return {
    x,
    y,
    width,
    height,
    rotation: transform.rotation as number,
  };
}

/**
 * Build cumulative parent context from a chain of parent groups.
 */
function buildParentContext(parentGroups: readonly GrpShape[]): ParentContext {
  let context: ParentContext = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
  };

  for (const group of parentGroups) {
    const grpTransform = group.properties.transform;
    if (!grpTransform) continue;

    const groupX = grpTransform.x as number;
    const groupY = grpTransform.y as number;
    const groupWidth = grpTransform.width as number;
    const groupHeight = grpTransform.height as number;
    const childOffsetX = (grpTransform as GroupTransform).childOffsetX as number ?? 0;
    const childOffsetY = (grpTransform as GroupTransform).childOffsetY as number ?? 0;
    const childExtentWidth = (grpTransform as GroupTransform).childExtentWidth as number ?? groupWidth;
    const childExtentHeight = (grpTransform as GroupTransform).childExtentHeight as number ?? groupHeight;

    // Calculate scale factors for this group
    const scaleX = groupWidth / childExtentWidth;
    const scaleY = groupHeight / childExtentHeight;

    // Update context: child coordinates are relative to childOffset, scaled, then offset by group position
    context = {
      offsetX: context.offsetX + (groupX - childOffsetX * scaleX) * context.scaleX,
      offsetY: context.offsetY + (groupY - childOffsetY * scaleY) * context.scaleY,
      scaleX: context.scaleX * scaleX,
      scaleY: context.scaleY * scaleY,
    };
  }

  return context;
}

/**
 * Internal helper to get transform from shape.
 * Duplicated here to avoid circular dependencies.
 */
function getShapeTransformInternal(shape: Shape): Transform | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties.transform;
    case "grpSp":
      return shape.properties.transform as Transform | undefined;
    case "graphicFrame":
      return shape.transform;
    case "contentPart":
      return undefined;
  }
}

/**
 * Apply a partial transform update to a shape, returning a new shape.
 *
 * This is the write counterpart to getShapeTransform.
 * It handles the polymorphic nature of Shape types:
 * - sp, pic, cxnSp: transform is in properties.transform
 * - grpSp: transform is in properties.transform (as GroupTransform)
 * - graphicFrame: transform is directly on shape.transform
 * - contentPart: has no transform, returns shape unchanged
 *
 * @param shape - The shape to update
 * @param update - Partial transform to merge
 * @returns New shape with updated transform (or original if no transform exists)
 */
export function withUpdatedTransform(
  shape: Shape,
  update: Partial<Transform>
): Shape {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp": {
      const currentTransform = shape.properties.transform;
      if (!currentTransform) return shape;
      return {
        ...shape,
        properties: {
          ...shape.properties,
          transform: {
            ...currentTransform,
            ...update,
          },
        },
      };
    }

    case "grpSp": {
      const currentTransform = shape.properties.transform;
      if (!currentTransform) return shape;
      return {
        ...shape,
        properties: {
          ...shape.properties,
          transform: {
            ...currentTransform,
            ...update,
          },
        },
      };
    }

    case "graphicFrame": {
      return {
        ...shape,
        transform: {
          ...shape.transform,
          ...update,
        },
      };
    }

    case "contentPart":
      // contentPart has no transform
      return shape;
  }
}

/**
 * Check if a shape has a transform that can be modified.
 *
 * @param shape - The shape to check
 * @returns true if the shape has an editable transform
 */
export function hasEditableTransform(shape: Shape): boolean {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties.transform !== undefined;
    case "grpSp":
      return shape.properties.transform !== undefined;
    case "graphicFrame":
      return true; // graphicFrame always has transform
    case "contentPart":
      return false;
  }
}

// =============================================================================
// Shape Locks (ECMA-376 compliance)
// =============================================================================

/**
 * Shape editing capabilities based on ECMA-376 lock attributes.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2 (Shape Locks)
 * @see ECMA-376 Part 1, Section 20.1.2.2.19 (GraphicFrameLocks)
 */
export type ShapeCapabilities = {
  /** Whether the shape can be resized */
  readonly canResize: boolean;
  /** Whether the shape can be rotated */
  readonly canRotate: boolean;
  /** Whether aspect ratio must be locked during resize */
  readonly aspectLocked: boolean;
  /** Whether the shape can be moved */
  readonly canMove: boolean;
  /** Whether the shape can be selected */
  readonly canSelect: boolean;
  /** Whether the shape can be grouped */
  readonly canGroup: boolean;
};

/**
 * Get shape editing capabilities based on ECMA-376 lock attributes.
 *
 * This function examines the lock properties on each shape type:
 * - sp (SpShape): shapeLocks
 * - pic (PicShape): pictureLocks
 * - grpSp (GrpShape): groupLocks
 * - cxnSp (CxnShape): (no locks defined, always editable)
 * - graphicFrame (GraphicFrame): graphicFrameLocks
 * - contentPart (ContentPartShape): (no editing support)
 *
 * @param shape - The shape to check
 * @returns ShapeCapabilities indicating what operations are allowed
 */
export function getShapeCapabilities(shape: Shape): ShapeCapabilities {
  // Default capabilities (all operations allowed)
  const defaultCapabilities: ShapeCapabilities = {
    canResize: true,
    canRotate: true,
    aspectLocked: false,
    canMove: true,
    canSelect: true,
    canGroup: true,
  };

  switch (shape.type) {
    case "sp": {
      const locks = shape.nonVisual.shapeLocks;
      if (!locks) return defaultCapabilities;
      return {
        canResize: locks.noResize !== true,
        canRotate: locks.noRot !== true,
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "pic": {
      const locks = shape.nonVisual.pictureLocks;
      if (!locks) return defaultCapabilities;
      return {
        canResize: locks.noResize !== true,
        canRotate: locks.noRot !== true,
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "grpSp": {
      const locks = shape.nonVisual.groupLocks;
      if (!locks) return defaultCapabilities;
      return {
        canResize: locks.noResize !== true,
        canRotate: locks.noRot !== true,
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "cxnSp": {
      // CxnShape has no lock properties, always editable
      return defaultCapabilities;
    }

    case "graphicFrame": {
      const locks = shape.nonVisual.graphicFrameLocks;
      if (!locks) return defaultCapabilities;
      return {
        canResize: locks.noResize !== true,
        canRotate: true, // graphicFrameLocks has no noRot
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "contentPart": {
      // ContentPart is not directly editable in the slide editor
      return {
        canResize: false,
        canRotate: false,
        aspectLocked: false,
        canMove: false,
        canSelect: false,
        canGroup: false,
      };
    }
  }
}
