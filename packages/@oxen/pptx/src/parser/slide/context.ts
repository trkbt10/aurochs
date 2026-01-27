/**
 * @file Slide context hierarchy
 *
 * Hierarchical accessor structure for slide data access:
 * - SlideContext: Slide-level (shared data, inheritance chain)
 * - ShapeContext: Shape-level (type, idx determined)
 * - ParagraphContext: Paragraph-level (lvl determined)
 *
 * Each accessor provides methods scoped to its level.
 * All accessors are created via factory functions (no classes).
 *
 * This module belongs to the parser layer as it handles XML access
 * and inheritance resolution (slide → layout → master → theme).
 *
 * @see ECMA-376 Part 1, Section 13 (PresentationML)
 */

import type { XmlElement } from "@oxen/xml";
import { getChild, getByPath } from "@oxen/xml";
import type { RenderOptions } from "../../render/render-options";

// Import domain types from canonical sources
import type { ZipFile, ResourceMap, PlaceholderTable, Theme, RawMasterTextStyles, ColorMap, ResolvedBlipResource } from "../../domain/index";
import type { TableStyleList } from "../table/style-parser";
import type { ColorResolveContext } from "../../domain/color/context";
import { getMimeType } from "@oxen/files";

// =============================================================================
// Params (immutable data)
// =============================================================================

export type SlideMasterParams = {
  textStyles: RawMasterTextStyles;
  placeholders: PlaceholderTable;
  colorMap: ColorMap;
  resources: ResourceMap;
  /** Master content element (p:sldMaster) for background lookup */
  content?: XmlElement;
};

export type SlideLayoutParams = {
  placeholders: PlaceholderTable;
  resources: ResourceMap;
  /** Layout content element (p:sldLayout) for background lookup */
  content?: XmlElement;
};

export type SlideParams = {
  content: XmlElement;
  resources: ResourceMap;
  colorMapOverride?: ColorMap;
};

export type PresentationContext = {
  theme: Theme;
  defaultTextStyle: XmlElement | null;
  zip: ZipFile;
  renderOptions: RenderOptions;
  /**
   * Theme's resource map for resolving images in bgFillStyleLst.
   *
   * Per ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst):
   * Background fill styles may contain a:blipFill elements with r:embed
   * references. These references are relative to the theme's relationships,
   * not the slide's relationships.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7
   */
  themeResources?: ResourceMap;
  /**
   * Table styles from ppt/tableStyles.xml.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.2 (a:tblStyleLst)
   */
  tableStyles?: TableStyleList;
};

// =============================================================================
// Type to Master Style Mapping
// =============================================================================

/**
 * Mapping from placeholder type to master text style key.
 *
 * Per ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles):
 * - titleStyle: Applied to title placeholders (title, ctrTitle)
 * - bodyStyle: Applied to content placeholders (body, subTitle, obj, chart, tbl, clipArt, dgm, media, pic, sldImg)
 * - otherStyle: Applied to metadata placeholders (dt, ftr, sldNum, hdr)
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph) - Placeholder element
 * @see ECMA-376 Part 1, Section 19.7.10 (ST_PlaceholderType) - All 16 placeholder types
 */
const TYPE_TO_MASTER_STYLE: Record<string, keyof RawMasterTextStyles> = {
  // Title placeholders → titleStyle
  ctrTitle: "titleStyle",
  title: "titleStyle",

  // Content placeholders → bodyStyle
  subTitle: "bodyStyle",
  body: "bodyStyle",
  obj: "bodyStyle",
  chart: "bodyStyle",
  tbl: "bodyStyle",
  clipArt: "bodyStyle",
  dgm: "bodyStyle",
  media: "bodyStyle",
  pic: "bodyStyle",
  sldImg: "bodyStyle", // Slide image (for Notes)

  // Metadata placeholders → otherStyle
  dt: "otherStyle",
  ftr: "otherStyle",
  sldNum: "otherStyle",
  hdr: "otherStyle",
};

// =============================================================================
// ParagraphContext
// =============================================================================

export type ParagraphContext = {
  readonly lvl: number;
  readonly type: string;
  /** Placeholder index (xsd:unsignedInt per ECMA-376) */
  readonly idx: number | undefined;
  readonly shape: ShapeContext;

  getDefRPr(lstStyle?: XmlElement): XmlElement | undefined;
  getDefPPr(lstStyle?: XmlElement): XmlElement | undefined;
  resolveThemeFont(typeface: string): string | undefined;
  resolveSchemeColor(schemeColor: string): string | undefined;
};

/**
 * Create paragraph context for text style resolution.
 *
 * @param shape - Shape context
 * @param lvl - Paragraph level (1-9)
 */
export function createParagraphContext(shape: ShapeContext, lvl: number): ParagraphContext {
  const lvlpPr = `a:lvl${lvl}pPr`;

  return {
    lvl,
    type: shape.type,
    idx: shape.idx,
    shape,

    getDefRPr(lstStyle?: XmlElement): XmlElement | undefined {
      // 1. Local list style
      if (lstStyle !== undefined) {
        const defRPr = getByPath(lstStyle, [lvlpPr, "a:defRPr"]);
        if (defRPr !== undefined) {
          return defRPr;
        }
      }

      // 2. Layout placeholder
      const layoutPh = shape.slide.layout.placeholders.byType[shape.type];
      if (layoutPh !== undefined) {
        const defRPr = getByPath(layoutPh, ["p:txBody", "a:lstStyle", lvlpPr, "a:defRPr"]);
        if (defRPr !== undefined) {
          return defRPr;
        }
      }

      // 3. Master placeholder
      const masterPh = shape.slide.master.placeholders.byType[shape.type];
      if (masterPh !== undefined) {
        const defRPr = getByPath(masterPh, ["p:txBody", "a:lstStyle", lvlpPr, "a:defRPr"]);
        if (defRPr !== undefined) {
          return defRPr;
        }
      }

      // 4. Master text styles
      const masterStyleKey = TYPE_TO_MASTER_STYLE[shape.type];
      if (masterStyleKey !== undefined) {
        const masterStyle = shape.slide.master.textStyles[masterStyleKey];
        if (masterStyle !== undefined) {
          const defRPr = getByPath(masterStyle, [lvlpPr, "a:defRPr"]);
          if (defRPr !== undefined) {
            return defRPr;
          }
        }
      }

      // 5. Default text style
      const defaultTextStyle = shape.slide.presentation.defaultTextStyle;
      if (defaultTextStyle !== null) {
        return getByPath(defaultTextStyle, [lvlpPr, "a:defRPr"]);
      }

      return undefined;
    },

    getDefPPr(lstStyle?: XmlElement): XmlElement | undefined {
      // 1. Local list style
      if (lstStyle !== undefined) {
        const pPr = getChild(lstStyle, lvlpPr);
        if (pPr !== undefined) {
          return pPr;
        }
      }

      // 2. Layout placeholder
      const layoutPh = shape.slide.layout.placeholders.byType[shape.type];
      if (layoutPh !== undefined) {
        const pPr = getByPath(layoutPh, ["p:txBody", "a:lstStyle", lvlpPr]);
        if (pPr !== undefined) {
          return pPr;
        }
      }

      // 3. Master placeholder
      const masterPh = shape.slide.master.placeholders.byType[shape.type];
      if (masterPh !== undefined) {
        const pPr = getByPath(masterPh, ["p:txBody", "a:lstStyle", lvlpPr]);
        if (pPr !== undefined) {
          return pPr;
        }
      }

      // 4. Master text styles
      const masterStyleKey = TYPE_TO_MASTER_STYLE[shape.type];
      if (masterStyleKey !== undefined) {
        const masterStyle = shape.slide.master.textStyles[masterStyleKey];
        if (masterStyle !== undefined) {
          const pPr = getChild(masterStyle, lvlpPr);
          if (pPr !== undefined) {
            return pPr;
          }
        }
      }

      // 5. Default text style
      const defaultTextStyle = shape.slide.presentation.defaultTextStyle;
      if (defaultTextStyle !== null) {
        return getChild(defaultTextStyle, lvlpPr);
      }

      return undefined;
    },

    resolveThemeFont(typeface: string): string | undefined {
      const fontScheme = shape.slide.presentation.theme.fontScheme;

      if (typeface === "+mj-lt" || typeface === "+mj-ea") {
        return fontScheme.majorFont.latin ?? fontScheme.majorFont.eastAsian;
      }
      if (typeface === "+mn-lt" || typeface === "+mn-ea") {
        return fontScheme.minorFont.latin ?? fontScheme.minorFont.eastAsian;
      }

      return typeface;
    },

    resolveSchemeColor(schemeColor: string): string | undefined {
      const slideCtx = shape.slide;

      // Check slide color map override first
      const slideOverride = slideCtx.slide.colorMapOverride;
      if (slideOverride !== undefined) {
        const mapped = slideOverride[schemeColor];
        if (mapped !== undefined) {
          return slideCtx.presentation.theme.colorScheme[mapped];
        }
      }

      // Fall back to master color map
      const mapped = slideCtx.master.colorMap[schemeColor];
      if (mapped !== undefined) {
        return slideCtx.presentation.theme.colorScheme[mapped];
      }

      // Try direct lookup in color scheme
      return slideCtx.presentation.theme.colorScheme[schemeColor];
    },
  };
}

// =============================================================================
// ShapeContext
// =============================================================================

export type ShapeContext = {
  readonly slide: SlideContext;
  readonly type: string;
  /** Placeholder index (xsd:unsignedInt per ECMA-376) */
  readonly idx: number | undefined;

  forParagraph(lvl: number): ParagraphContext;
  getLayoutPlaceholder(): XmlElement | undefined;
  getMasterPlaceholder(): XmlElement | undefined;
};

/**
 * Create shape context for placeholder resolution.
 *
 * @param slide - Slide render context
 * @param type - Placeholder type (ST_PlaceholderType)
 * @param idx - Placeholder index (xsd:unsignedInt per ECMA-376)
 */
export function createShapeContext(slide: SlideContext, type: string, idx: number | undefined): ShapeContext {
  const self: ShapeContext = {
    slide,
    type,
    idx,

    forParagraph(lvl: number): ParagraphContext {
      return createParagraphContext(self, lvl);
    },

    getLayoutPlaceholder(): XmlElement | undefined {
      if (idx !== undefined) {
        const byIdx = slide.layout.placeholders.byIdx.get(idx);
        if (byIdx !== undefined) {
          return byIdx;
        }
      }
      return slide.layout.placeholders.byType[type];
    },

    getMasterPlaceholder(): XmlElement | undefined {
      if (idx !== undefined) {
        const byIdx = slide.master.placeholders.byIdx.get(idx);
        if (byIdx !== undefined) {
          return byIdx;
        }
      }
      return slide.master.placeholders.byType[type];
    },
  };

  return self;
}

// =============================================================================
// SlideRenderContext
// =============================================================================

export type SlideContext = {
  readonly slide: SlideParams;
  readonly layout: SlideLayoutParams;
  readonly master: SlideMasterParams;
  readonly presentation: PresentationContext;

  forShape(type: string, idx?: number): ShapeContext;
  readFile(path: string): ArrayBuffer | null;
  resolveResource(rId: string): string | undefined;

  // Scoped context derivation methods
  toColorContext(): ColorResolveContext;
  toPlaceholderContext(): PlaceholderContext;
  toResourceContext(): ResourceContext;
  toTextStyleContext(): TextStyleContext;
  /**
   * Get resource context for theme resources.
   *
   * Used when resolving images from theme's bgFillStyleLst/fillStyleLst.
   * These styles may contain a:blipFill with r:embed references that are
   * relative to the theme's relationships, not the slide's.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
   */
  toThemeResourceContext(): ResourceContext;
};

/**
 * Create slide render context from slide parameters.
 *
 * @param slide - Slide parameters
 * @param layout - Layout parameters
 * @param master - Master parameters
 * @param presentation - Presentation context
 */
export function createSlideContext(
  slide: SlideParams,
  layout: SlideLayoutParams,
  master: SlideMasterParams,
  presentation: PresentationContext,
): SlideContext {
  const self: SlideContext = {
    slide,
    layout,
    master,
    presentation,

    forShape(type: string, idx?: number): ShapeContext {
      return createShapeContext(self, type, idx);
    },

    readFile(path: string): ArrayBuffer | null {
      const entry = presentation.zip.file(path);
      if (entry === null) {
        return null;
      }
      return entry.asArrayBuffer();
    },

    resolveResource(rId: string): string | undefined {
      // Try slide resources first
      const slideTarget = slide.resources.getTarget(rId);
      if (slideTarget !== undefined) {
        return slideTarget;
      }

      // Fall back to layout resources
      const layoutTarget = layout.resources.getTarget(rId);
      if (layoutTarget !== undefined) {
        return layoutTarget;
      }

      // Fall back to master resources
      return master.resources.getTarget(rId);
    },

    toColorContext(): ColorResolveContext {
      return {
        colorMap: master.colorMap,
        colorMapOverride: slide.colorMapOverride,
        colorScheme: presentation.theme.colorScheme,
      };
    },

    toPlaceholderContext(): PlaceholderContext {
      return {
        layoutPlaceholders: layout.placeholders,
        masterPlaceholders: master.placeholders,
      };
    },

    toResourceContext(): ResourceContext {
      return createResourceContextImpl(
        self.resolveResource.bind(self),
        self.readFile.bind(self),
      );
    },

    toTextStyleContext(): TextStyleContext {
      return {
        masterTextStyles: master.textStyles,
        defaultTextStyle: presentation.defaultTextStyle,
        placeholders: self.toPlaceholderContext(),
      };
    },

    toThemeResourceContext(): ResourceContext {
      return createResourceContextImpl(
        (rId: string) => presentation.themeResources?.getTarget(rId),
        self.readFile.bind(self),
      );
    },
  };

  return self;
}

// =============================================================================
// Scoped Context Types
// =============================================================================

/**
 * Context for placeholder resolution.
 *
 * Provides access to layout and master placeholders for style inheritance.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph - Placeholder Shape)
 */
export type PlaceholderContext = {
  readonly layoutPlaceholders: PlaceholderTable;
  readonly masterPlaceholders: PlaceholderTable;
};

/**
 * Context for resource access.
 *
 * Provides methods to resolve relationship IDs and read files from the package.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */
export type ResourceContext = {
  /** Resolve relationship ID to target path */
  readonly resolveResource: (rId: string) => string | undefined;
  /** Read file from package */
  readonly readFile: (path: string) => ArrayBuffer | null;
  /**
   * Resolve a blipFill resource ID to raw image data.
   * This is the unified method for resolving image resources at parse time.
   * Conversion to Data URL or Blob URL is done by the render layer.
   *
   * @param rId - Relationship ID (e.g., "rId2")
   * @returns ResolvedBlipResource containing raw image data, or undefined if not found
   */
  readonly resolveBlipFill: (rId: string) => ResolvedBlipResource | undefined;
};

/**
 * Background source extracted from slide/layout/master.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.1 (p:bg - Slide Background)
 */
export type BackgroundSource = {
  /** Background properties element (p:bgPr) */
  readonly bgPr?: XmlElement;
  /** Background reference element (p:bgRef) */
  readonly bgRef?: XmlElement;
};

/**
 * Context for background processing.
 *
 * Contains pre-extracted background elements from the slide hierarchy,
 * avoiding the need to traverse XML during rendering.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.1 (p:bg)
 */
export type BackgroundContext = {
  /**
   * Background sources in priority order [slide, layout, master].
   * The first non-empty source should be used.
   */
  readonly sources: readonly BackgroundSource[];
  /** Resolve relationship ID to target path */
  readonly resolveResource: (rId: string) => string | undefined;
  /** Read file from package */
  readonly readFile: (path: string) => ArrayBuffer | null;
  /** Color resolution context */
  readonly colorCtx: ColorResolveContext;
};

/**
 * Context for text style resolution.
 *
 * Provides access to master text styles and default text style
 * for text formatting inheritance.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.46 (p:txStyles)
 * @see ECMA-376 Part 1, Section 19.2.1.8 (p:defaultTextStyle)
 */
export type TextStyleContext = {
  readonly masterTextStyles: RawMasterTextStyles;
  readonly defaultTextStyle: XmlElement | null;
  readonly placeholders: PlaceholderContext;
};

// =============================================================================
// ResourceContext Factory
// =============================================================================

/**
 * Create a ResourceContext implementation with resolveBlipFill.
 *
 * This is the canonical factory for creating ResourceContext instances.
 * The resolveBlipFill method provides unified image resource resolution,
 * separating resolution (here) from conversion (in render layer).
 *
 * @param resolveResource - Function to resolve rId to file path
 * @param readFile - Function to read file contents from the package
 */
export function createResourceContextImpl(
  resolveResource: (rId: string) => string | undefined,
  readFile: (path: string) => ArrayBuffer | null,
): ResourceContext {
  return {
    resolveResource,
    readFile,
    resolveBlipFill(rId: string): ResolvedBlipResource | undefined {
      const path = resolveResource(rId);
      if (path === undefined) {
        return undefined;
      }

      // Skip non-image files (e.g., XML relationships)
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      if (ext === "xml" || ext === "rels") {
        return undefined;
      }

      const data = readFile(path);
      if (data === null) {
        return undefined;
      }

      return {
        data,
        mimeType: getMimeType(ext),
        path,
      };
    },
  };
}

// =============================================================================
// Context Derivation Functions
// =============================================================================

/**
 * Derive ColorResolveContext from SlideRenderContext.
 */
export function toColorResolveContext(ctx: SlideContext): ColorResolveContext {
  return {
    colorMap: ctx.master.colorMap,
    colorMapOverride: ctx.slide.colorMapOverride,
    colorScheme: ctx.presentation.theme.colorScheme,
  };
}

/**
 * Derive PlaceholderContext from SlideContext.
 */
export function toPlaceholderContext(ctx: SlideContext): PlaceholderContext {
  return {
    layoutPlaceholders: ctx.layout.placeholders,
    masterPlaceholders: ctx.master.placeholders,
  };
}

/**
 * Derive ResourceContext from SlideRenderContext.
 */
export function toResourceContext(ctx: SlideContext): ResourceContext {
  return createResourceContextImpl(
    ctx.resolveResource.bind(ctx),
    ctx.readFile.bind(ctx),
  );
}

/**
 * Derive TextStyleContext from SlideRenderContext.
 */
export function toTextStyleContext(ctx: SlideContext): TextStyleContext {
  return {
    masterTextStyles: ctx.master.textStyles,
    defaultTextStyle: ctx.presentation.defaultTextStyle,
    placeholders: toPlaceholderContext(ctx),
  };
}
