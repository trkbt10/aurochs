/**
 * @file Section node builder
 *
 * SECTION nodes are canvas-level organizational elements.
 * They help organize frames on a canvas and have a distinct background color.
 */

export type SectionNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly size: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly sectionContentsHidden?: boolean;
  readonly visible: boolean;
  readonly opacity: number;
};

/** Section node builder instance */
export type SectionNodeBuilder = {
  name: (name: string) => SectionNodeBuilder;
  size: (width: number, height: number) => SectionNodeBuilder;
  position: (x: number, y: number) => SectionNodeBuilder;
  contentsHidden: (hidden?: boolean) => SectionNodeBuilder;
  visible: (v: boolean) => SectionNodeBuilder;
  opacity: (o: number) => SectionNodeBuilder;
  build: () => SectionNodeData;
};

/** Create a section node builder */
function createSectionNodeBuilder(localID: number, parentID: number): SectionNodeBuilder {
  const state = {
    name: "Section",
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    contentsHidden: false,
    visible: true,
    opacity: 1,
  };

  const builder: SectionNodeBuilder = {
    name(n: string) { state.name = n; return builder; },
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    /** Hide or show the section contents */
    contentsHidden(hidden: boolean = true) { state.contentsHidden = hidden; return builder; },
    visible(v: boolean) { state.visible = v; return builder; },
    opacity(o: number) { state.opacity = o; return builder; },

    build(): SectionNodeData {
      return {
        localID,
        parentID,
        name: state.name,
        size: { x: state.width, y: state.height },
        transform: {
          m00: 1,
          m01: 0,
          m02: state.x,
          m10: 0,
          m11: 1,
          m12: state.y,
        },
        sectionContentsHidden: state.contentsHidden || undefined,
        visible: state.visible,
        opacity: state.opacity,
      };
    },
  };

  return builder;
}

/**
 * Create a new Section node builder
 */
export function sectionNode(localID: number, parentID: number): SectionNodeBuilder {
  return createSectionNodeBuilder(localID, parentID);
}
