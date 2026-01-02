/**
 * @file HTML render context
 *
 * HTML-specific render context extending core context.
 */

import type { SlideSize } from "../../domain";
import type { ColorContext } from "../../domain/resolution";
import { px } from "../../domain/types";
import type {
  CoreRenderContext,
  RenderOptions,
  ResourceResolver,
} from "../core";
import {
  createEmptyResourceResolver,
  createWarningCollector,
  DEFAULT_RENDER_OPTIONS,
} from "../core";

// =============================================================================
// Style Collection (HTML-specific)
// =============================================================================

/**
 * Style collector for deferred CSS generation
 */
export type StyleCollector = {
  /**
   * Add a CSS rule
   */
  readonly add: (selector: string, properties: Record<string, string>) => void;

  /**
   * Generate all collected CSS
   */
  readonly generate: () => string;

  /**
   * Get unique class name for a style hash
   */
  readonly getClassName: (styleHash: string) => string;
};

/**
 * Create a style collector
 */
export function createStyleCollector(): StyleCollector {
  const rules: Map<string, Record<string, string>> = new Map();
  const classNames: Map<string, string> = new Map();
  const classCounter = { value: 0 };

  return {
    add: (selector, properties) => {
      const existing = rules.get(selector);
      if (existing) {
        Object.assign(existing, properties);
      } else {
        rules.set(selector, { ...properties });
      }
    },

    generate: () => {
      const lines: string[] = [];
      Array.from(rules.entries()).forEach(([selector, props]) => {
        const propStr = Object.entries(props)
          .map(([key, value]) => `  ${key}: ${value};`)
          .join("\n");
        lines.push(`${selector} {\n${propStr}\n}`);
      });
      return lines.join("\n\n");
    },

    getClassName: (styleHash) => {
      const existing = classNames.get(styleHash);
      if (existing) {
        return existing;
      }
      const className = `s${classCounter.value++}`;
      classNames.set(styleHash, className);
      return className;
    },
  };
}

// =============================================================================
// HTML Render Context
// =============================================================================

/**
 * HTML-specific render context
 * Extends CoreRenderContext with HTML-specific features
 */
export type HtmlRenderContext = CoreRenderContext & {
  /** Style collector for CSS generation */
  readonly styles: StyleCollector;
};

/**
 * Configuration for creating HTML render context
 */
export type HtmlRenderContextConfig = {
  slideSize: SlideSize;
  options?: Partial<RenderOptions>;
  colorContext?: ColorContext;
  resources?: ResourceResolver;
};

/**
 * Create an HTML render context
 */
export function createHtmlRenderContext(config: HtmlRenderContextConfig): HtmlRenderContext {
  const shapeId = { value: 0 };

  return {
    slideSize: config.slideSize,
    options: { ...DEFAULT_RENDER_OPTIONS, ...config.options },
    colorContext: config.colorContext ?? { colorScheme: {}, colorMap: {} },
    resources: config.resources ?? createEmptyResourceResolver(),
    warnings: createWarningCollector(),
    getNextShapeId: () => `shape-${shapeId.value++}`,
    styles: createStyleCollector(),
  };
}

/**
 * Create an empty HTML render context (for testing)
 */
export function createEmptyHtmlRenderContext(): HtmlRenderContext {
  return createHtmlRenderContext({
    slideSize: { width: px(960), height: px(540) },
  });
}
