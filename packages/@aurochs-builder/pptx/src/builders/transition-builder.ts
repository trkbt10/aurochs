/**
 * @file Slide transition builder for Build command
 *
 * This module provides CLI-specific wrappers around the core transition serializer.
 */

import { getChild, isXmlElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
import {
  isTransitionType as coreIsTransitionType,
  serializeSlideTransition,
  updateDocumentRoot,
} from "@aurochs-builder/pptx/patcher";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import type { TransitionType } from "@aurochs-office/pptx/domain";
import type { SlideTransitionSpec } from "../types";

function insertTransitionAfter(root: XmlElement, transition: XmlElement, afterName: string): XmlElement {
  // Filter out existing transitions and find insertion point
  const filtered = root.children.filter((c) => !(isXmlElement(c) && c.name === "p:transition"));
  const afterIndex = filtered.findIndex((c) => isXmlElement(c) && c.name === afterName);

  if (afterIndex === -1) {
    return { ...root, children: [...filtered, transition] };
  }

  const before = filtered.slice(0, afterIndex + 1);
  const after = filtered.slice(afterIndex + 1);
  return { ...root, children: [...before, transition, ...after] };
}

function removeTransition(root: XmlElement): XmlElement {
  const children = root.children.filter((c) => !(isXmlElement(c) && c.name === "p:transition"));
  return { ...root, children };
}

/**
 * Convert SlideTransitionSpec to SlideTransition domain type
 */
function toSlideTransition(spec: SlideTransitionSpec): SlideTransition {
  return {
    type: spec.type,
    duration: spec.duration,
    advanceOnClick: spec.advanceOnClick,
    advanceAfter: spec.advanceAfter,
    direction: spec.direction,
    orientation: spec.orientation,
    spokes: spec.spokes,
    inOutDirection: spec.inOutDirection,
  };
}

/**
 * Apply a slide transition to a slide document.
 */
export function applySlideTransition(slideDoc: XmlDocument, transition: SlideTransitionSpec): XmlDocument {
  if (transition.type === "none") {
    return updateDocumentRoot(slideDoc, removeTransition);
  }

  const transitionEl = serializeSlideTransition(toSlideTransition(transition));
  if (!transitionEl) {
    return slideDoc;
  }

  return updateDocumentRoot(slideDoc, (root) => {
    const clrMapOvr = getChild(root, "p:clrMapOvr");
    if (clrMapOvr) {
      return insertTransitionAfter(root, transitionEl, "p:clrMapOvr");
    }
    return insertTransitionAfter(root, transitionEl, "p:cSld");
  });
}

/**
 * Check if a string is a valid transition type.
 */
export function isTransitionType(value: string): value is TransitionType {
  return coreIsTransitionType(value);
}
