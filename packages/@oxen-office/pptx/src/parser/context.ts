/**
 * @file Parser context for PPTX processing
 *
 * Provides type-safe context for parsing XML to Domain Objects.
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import type { ResourceMap } from "../domain/opc";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type { FontScheme } from "@oxen-office/ooxml/domain/font-scheme";
import type { ResourceRelationshipResolver } from "../domain";

export type ResourceResolver = ResourceRelationshipResolver;

/**
 * Create a resource resolver from ResourceMap
 */
export function createResourceResolver(resources: ResourceMap): ResourceResolver {
  return {
    getTarget: (id: string) => resources.getTarget(id),
    getType: (id: string) => resources.getType(id),
  };
}

// =============================================================================
// Placeholder Context
// =============================================================================

/**
 * Index tables for placeholder lookup.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 */
export type PlaceholderTables = {
  /**
   * Shapes indexed by p:ph/@idx.
   * idx is xsd:unsignedInt per ECMA-376.
   */
  readonly byIdx: ReadonlyMap<number, XmlElement>;
  /** Shapes indexed by p:ph/@type (ST_PlaceholderType) */
  readonly byType: Readonly<Record<string, XmlElement>>;
};

/**
 * Context for resolving placeholder inheritance
 */
export type PlaceholderContext = {
  readonly layout: PlaceholderTables;
  readonly master: PlaceholderTables;
};

// =============================================================================
// Text Style Context
// =============================================================================

/**
 * Master text styles from slide master (p:txStyles)
 * @see ECMA-376 Part 1, Section 19.3.1.51
 */
export type MasterTextStyles = {
  /** Title style (p:titleStyle) */
  readonly titleStyle: XmlElement | undefined;
  /** Body style (p:bodyStyle) */
  readonly bodyStyle: XmlElement | undefined;
  /** Other style (p:otherStyle) */
  readonly otherStyle: XmlElement | undefined;
};

/**
 * Context for resolving text styles.
 *
 * Contains all information needed to resolve text properties (font size, color, alignment)
 * according to ECMA-376 style resolution rules.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (Text)
 */
export type TextStyleContext = {
  /** Placeholder type (e.g., "title", "body", "ctrTitle") */
  readonly placeholderType: string | undefined;
  /**
   * Placeholder index for idx-based lookup.
   * Per ECMA-376 Part 1, Section 19.3.1.36 (p:ph):
   * idx is xsd:unsignedInt. Placeholders can be matched by either type or idx.
   */
  readonly placeholderIdx: number | undefined;
  /** Layout placeholders table */
  readonly layoutPlaceholders: PlaceholderTables;
  /** Master placeholders table */
  readonly masterPlaceholders: PlaceholderTables;
  /** Master text styles from slide master */
  readonly masterTextStyles: MasterTextStyles | undefined;
  /** Default text style from presentation.xml */
  readonly defaultTextStyle: XmlElement | undefined;
  /**
   * Default text color from shape style (p:style/a:fontRef).
   *
   * Per ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef):
   * The fontRef element may contain a color child element (e.g., a:schemeClr)
   * that specifies the default text color for the shape's text body.
   *
   * This color is used as a fallback when no explicit color is defined
   * in the text run properties or inheritance chain.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.17
   */
  readonly shapeFontReferenceColor?: Color;
};

// =============================================================================
// Parse Context
// =============================================================================

/**
 * Master text styles info for ParseContext (slide-level)
 */
export type MasterStylesInfo = {
  /** Master text styles from slide master */
  readonly masterTextStyles: MasterTextStyles | undefined;
  /** Default text style from presentation.xml */
  readonly defaultTextStyle: XmlElement | undefined;
};

/**
 * Theme format scheme for style reference resolution
 * @see ECMA-376 Part 1, Section 20.1.4.1.14 (a:fmtScheme)
 */
export type FormatScheme = {
  /** Fill styles from a:fillStyleLst (indexed 1-based) */
  readonly fillStyles: readonly XmlElement[];
  /** Line styles from a:lnStyleLst (indexed 1-based) */
  readonly lineStyles: readonly XmlElement[];
  /** Effect styles from a:effectStyleLst (indexed 1-based) */
  readonly effectStyles: readonly XmlElement[];
};

/**
 * Complete parse context for slide parsing
 */
export type ParseContext = {
  /** Color resolution context */
  readonly colorContext: ColorContext;

  /** Placeholder resolution context */
  readonly placeholderContext: PlaceholderContext;

  /** Master text styles info (slide-level) */
  readonly masterStylesInfo: MasterStylesInfo;

  /** Resource resolver for the current slide */
  readonly slideResources: ResourceResolver;

  /** Resource resolver for the layout */
  readonly layoutResources: ResourceResolver;

  /** Resource resolver for the master */
  readonly masterResources: ResourceResolver;

  /** Theme content for resolving theme-based colors/fonts */
  readonly themeContent: XmlDocument | undefined;

  /**
   * Theme format scheme for style reference resolution
   * @see ECMA-376 Part 1, Section 20.1.4.1.14 (a:fmtScheme)
   */
  readonly formatScheme?: FormatScheme;

  /**
   * Font scheme from theme for resolving font references (+mj-lt, +mn-lt, etc.)
   * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
   */
  readonly fontScheme?: FontScheme;
};

/**
 * Minimal parse context for standalone parsing
 */
export type MinimalParseContext = {
  readonly colorContext?: Partial<ColorContext>;
};

/**
 * Create an empty parse context for testing
 */
export function createEmptyParseContext(): ParseContext {
  const emptyResolver: ResourceResolver = {
    getTarget: () => undefined,
    getType: () => undefined,
  };
  const emptyTables: PlaceholderTables = {
    byIdx: new Map(),
    byType: {},
  };
  return {
    colorContext: {
      colorScheme: {},
      colorMap: {},
    },
    placeholderContext: {
      layout: emptyTables,
      master: emptyTables,
    },
    masterStylesInfo: {
      masterTextStyles: undefined,
      defaultTextStyle: undefined,
    },
    slideResources: emptyResolver,
    layoutResources: emptyResolver,
    masterResources: emptyResolver,
    themeContent: undefined,
    fontScheme: undefined,
  };
}

// =============================================================================
// Parse Context Builder (from SlideRenderContext)
// =============================================================================

import type { SlideContext } from "./slide/context";

// Re-export ResourceContext for shape parser
export type { ResourceContext } from "./slide/context";
export { createResourceContextImpl } from "./slide/context";

/**
 * Create ParseContext from SlideRenderContext.
 *
 * This factory function bridges the reader layer (SlideRenderContext)
 * to the parser layer (ParseContext), extracting all necessary information
 * for parsing slides to domain objects.
 *
 * @see ECMA-376 Part 1, Section 19 (PresentationML)
 */
export function createParseContext(ctx: SlideContext): ParseContext {
  const masterTextStyles = ctx.master.textStyles;
  const formatScheme = ctx.presentation.theme.formatScheme;
  const fontScheme = ctx.presentation.theme.fontScheme;
  const colorContext = buildColorContext(ctx);

  return {
    colorContext,
    placeholderContext: {
      layout: toPlaceholderTables(ctx.layout.placeholders),
      master: toPlaceholderTables(ctx.master.placeholders),
    },
    masterStylesInfo: {
      masterTextStyles: {
        titleStyle: masterTextStyles.titleStyle,
        bodyStyle: masterTextStyles.bodyStyle,
        otherStyle: masterTextStyles.otherStyle,
      },
      defaultTextStyle: ctx.presentation.defaultTextStyle ?? undefined,
    },
    slideResources: {
      getTarget: (id) => ctx.slide.resources.getTarget(id),
      getType: (id) => ctx.slide.resources.getType(id),
    },
    layoutResources: {
      getTarget: (id) => ctx.layout.resources.getTarget(id),
      getType: (id) => ctx.layout.resources.getType(id),
    },
    masterResources: {
      getTarget: (id) => ctx.master.resources.getTarget(id),
      getType: (id) => ctx.master.resources.getType(id),
    },
    themeContent: undefined,
    formatScheme: {
      fillStyles: formatScheme.fillStyles,
      lineStyles: formatScheme.lineStyles,
      effectStyles: formatScheme.effectStyles,
    },
    fontScheme: {
      majorFont: {
        latin: fontScheme.majorFont.latin,
        eastAsian: fontScheme.majorFont.eastAsian,
        complexScript: fontScheme.majorFont.complexScript,
      },
      minorFont: {
        latin: fontScheme.minorFont.latin,
        eastAsian: fontScheme.minorFont.eastAsian,
        complexScript: fontScheme.minorFont.complexScript,
      },
    },
  };
}

function toPlaceholderTables(table: {
  byIdx: ReadonlyMap<number, unknown>;
  byType: Readonly<Record<string, unknown>>;
}): PlaceholderTables {
  return {
    byIdx: table.byIdx as ReadonlyMap<number, XmlElement>,
    byType: table.byType as Readonly<Record<string, XmlElement>>,
  };
}

/**
 * Build ColorContext from SlideRenderContext.
 *
 * Merges color scheme from theme with color map from master,
 * applying any slide-level overrides.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.10 (a:clrScheme)
 */
function buildColorContext(ctx: SlideContext): ColorContext {
  const scheme = ctx.presentation.theme.colorScheme;
  const masterMap = ctx.master.colorMap;
  const overrideMap = ctx.slide.colorMapOverride;

  const colorScheme: Record<string, string> = {};
  const schemeColors = [
    "dk1", "lt1", "dk2", "lt2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink",
  ];
  for (const name of schemeColors) {
    const value = scheme[name];
    if (value !== undefined) {
      colorScheme[name] = value;
    }
  }

  const colorMap: Record<string, string> = {};
  const mappedColors = [
    "tx1", "tx2", "bg1", "bg2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink",
  ];
  for (const name of mappedColors) {
    if (overrideMap !== undefined) {
      const value = overrideMap[name];
      if (value !== undefined) {
        colorMap[name] = value;
        continue;
      }
    }
    const value = masterMap[name];
    if (value !== undefined) {
      colorMap[name] = value;
    }
  }

  return { colorScheme, colorMap };
}
