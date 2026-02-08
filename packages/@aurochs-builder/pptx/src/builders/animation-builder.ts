/**
 * @file Animation builder for build command
 *
 * Converts CLI animation specs to patcher animation specs and applies them.
 */

import type { XmlDocument } from "@aurochs/xml";
import { addAnimationsToSlide, type SimpleAnimationSpec } from "@aurochs-builder/pptx/patcher";
import type { AnimationSpec } from "../types";

/**
 * Convert CLI animation spec to patcher animation spec.
 * The types are now compatible, so this is a straightforward mapping.
 */
function convertAnimationSpec(spec: AnimationSpec): SimpleAnimationSpec {
  return {
    shapeId: spec.shapeId,
    class: spec.class,
    effect: spec.effect,
    trigger: spec.trigger,
    duration: spec.duration,
    delay: spec.delay,
    direction: spec.direction,
    repeat: spec.repeat,
    autoReverse: spec.autoReverse,
  };
}

/**
 * Result of applying animations.
 */
export type ApplyAnimationsResult = {
  readonly doc: XmlDocument;
  readonly added: number;
};

/**
 * Apply animations to a slide document.
 *
 * @param slideDoc - The slide XML document
 * @param specs - Animation specifications
 * @returns Updated document and count of added animations
 */
export function applyAnimations(slideDoc: XmlDocument, specs: readonly AnimationSpec[]): ApplyAnimationsResult {
  if (specs.length === 0) {
    return { doc: slideDoc, added: 0 };
  }

  const patcherSpecs = specs.map(convertAnimationSpec);
  const updatedDoc = addAnimationsToSlide(slideDoc, patcherSpecs);

  return {
    doc: updatedDoc,
    added: specs.length,
  };
}
