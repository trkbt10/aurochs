/**
 * @file DOCX Parse Context
 *
 * Provides context for parsing DOCX documents, including access to
 * styles, numbering definitions, and relationships.
 *
 * @see ECMA-376 Part 1, Section 17 (WordprocessingML)
 */

import type { DocxStyles, DocxStyle } from "../domain/styles";
import type { DocxNumbering, DocxAbstractNum, DocxNum, DocxLevel } from "../domain/numbering";
import type { DocxRelationships, DocxRelationship } from "../domain/document";
import type { DocxStyleId, DocxAbstractNumId, DocxNumId, DocxIlvl, DocxRelId } from "../domain/types";

// =============================================================================
// Parse Context Interface
// =============================================================================

/**
 * Context for parsing DOCX documents.
 *
 * Provides access to styles, numbering, and relationships that are
 * needed when parsing document content.
 */
export type DocxParseContext = {
  /** Get a style by ID */
  readonly getStyle: (styleId: DocxStyleId) => DocxStyle | undefined;

  /** Get a numbering definition by ID */
  readonly getNumbering: (numId: DocxNumId) => DocxNum | undefined;

  /** Get an abstract numbering definition by ID */
  readonly getAbstractNumbering: (abstractNumId: DocxAbstractNumId) => DocxAbstractNum | undefined;

  /** Get a numbering level */
  readonly getNumberingLevel: (numId: DocxNumId, ilvl: DocxIlvl) => DocxLevel | undefined;

  /** Get a relationship by ID */
  readonly getRelationship: (rId: DocxRelId) => DocxRelationship | undefined;

  /** Get the default paragraph style */
  readonly getDefaultParagraphStyle: () => DocxStyle | undefined;

  /** Get the default run style */
  readonly getDefaultRunStyle: () => DocxStyle | undefined;
};

// =============================================================================
// Parse Context Builder
// =============================================================================

/**
 * Configuration for building a parse context.
 */
export type ParseContextConfig = {
  readonly styles?: DocxStyles;
  readonly numbering?: DocxNumbering;
  readonly relationships?: DocxRelationships;
};

/**
 * Find default style by type.
 */
function findDefaultStyle(styles: DocxStyles | undefined, type: "paragraph" | "character"): DocxStyle | undefined {
  return styles?.style?.find((style) => style.default && style.type === type);
}

/**
 * Create a parse context from the provided configuration.
 *
 * @param config - The configuration containing styles, numbering, and relationships
 * @returns A parse context object
 */
export function createParseContext(config: ParseContextConfig): DocxParseContext {
  const { styles, numbering, relationships } = config;

  // Build style lookup map
  const styleMap = new Map<DocxStyleId, DocxStyle>();

  if (styles?.style) {
    for (const style of styles.style) {
      styleMap.set(style.styleId, style);
    }
  }

  const defaultParagraphStyle = findDefaultStyle(styles, "paragraph");
  const defaultRunStyle = findDefaultStyle(styles, "character");

  // Build numbering lookup maps
  const numMap = new Map<DocxNumId, DocxNum>();
  const abstractNumMap = new Map<DocxAbstractNumId, DocxAbstractNum>();

  if (numbering?.abstractNum) {
    for (const abstractNum of numbering.abstractNum) {
      abstractNumMap.set(abstractNum.abstractNumId, abstractNum);
    }
  }

  if (numbering?.num) {
    for (const num of numbering.num) {
      numMap.set(num.numId, num);
    }
  }

  // Build relationship lookup map
  const relMap = new Map<DocxRelId, DocxRelationship>();

  if (relationships?.relationship) {
    for (const rel of relationships.relationship) {
      relMap.set(rel.id, rel);
    }
  }

  return {
    getStyle: (styleId: DocxStyleId): DocxStyle | undefined => {
      return styleMap.get(styleId);
    },

    getNumbering: (numId: DocxNumId): DocxNum | undefined => {
      return numMap.get(numId);
    },

    getAbstractNumbering: (abstractNumId: DocxAbstractNumId): DocxAbstractNum | undefined => {
      return abstractNumMap.get(abstractNumId);
    },

    getNumberingLevel: (numId: DocxNumId, ilvl: DocxIlvl): DocxLevel | undefined => {
      const num = numMap.get(numId);
      if (!num) {return undefined;}

      // Check for level override first
      if (num.lvlOverride) {
        const override = num.lvlOverride.find((o) => o.ilvl === ilvl);
        if (override?.lvl) {
          return override.lvl;
        }
      }

      // Fall back to abstract numbering
      const abstractNum = abstractNumMap.get(num.abstractNumId);
      if (!abstractNum) {return undefined;}

      return abstractNum.lvl.find((l) => l.ilvl === ilvl);
    },

    getRelationship: (rId: DocxRelId): DocxRelationship | undefined => {
      return relMap.get(rId);
    },

    getDefaultParagraphStyle: (): DocxStyle | undefined => {
      return defaultParagraphStyle;
    },

    getDefaultRunStyle: (): DocxStyle | undefined => {
      return defaultRunStyle;
    },
  };
}

// =============================================================================
// Empty Parse Context
// =============================================================================

/**
 * Create an empty parse context (no styles, numbering, or relationships).
 *
 * Useful for testing or parsing simple documents.
 */
export function createEmptyParseContext(): DocxParseContext {
  return createParseContext({});
}
