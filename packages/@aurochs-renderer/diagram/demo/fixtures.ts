/**
 * @file Sample diagram fixtures for the demo catalog
 *
 * Provides sample DiagramContent objects for testing.
 * Since full diagram rendering requires PPTX context,
 * we display metadata and structure information.
 */

// =============================================================================
// Diagram Types (simplified for demo)
// =============================================================================

export type DiagramShape = {
  readonly id: string;
  readonly name: string;
  readonly type: "rectangle" | "ellipse" | "roundRect" | "arrow" | "text";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text?: string;
  readonly fill?: string;
};

export type DiagramConnection = {
  readonly from: string;
  readonly to: string;
  readonly type: "arrow" | "line";
};

export type DiagramSample = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: "list" | "process" | "cycle" | "hierarchy" | "relationship";
  readonly shapes: readonly DiagramShape[];
  readonly connections: readonly DiagramConnection[];
};

// =============================================================================
// Sample Diagrams
// =============================================================================

export const basicListDiagram: DiagramSample = {
  id: "basic-list",
  name: "Basic List",
  description: "Simple vertical list with 3 items",
  category: "list",
  shapes: [
    { id: "item1", name: "Item 1", type: "roundRect", x: 50, y: 20, width: 200, height: 50, text: "First Item", fill: "#4472C4" },
    { id: "item2", name: "Item 2", type: "roundRect", x: 50, y: 90, width: 200, height: 50, text: "Second Item", fill: "#4472C4" },
    { id: "item3", name: "Item 3", type: "roundRect", x: 50, y: 160, width: 200, height: 50, text: "Third Item", fill: "#4472C4" },
  ],
  connections: [],
};

export const linearProcessDiagram: DiagramSample = {
  id: "linear-process",
  name: "Linear Process",
  description: "Horizontal process flow with arrows",
  category: "process",
  shapes: [
    { id: "step1", name: "Step 1", type: "roundRect", x: 20, y: 60, width: 80, height: 60, text: "Start", fill: "#70AD47" },
    { id: "arrow1", name: "Arrow 1", type: "arrow", x: 100, y: 80, width: 40, height: 20 },
    { id: "step2", name: "Step 2", type: "roundRect", x: 140, y: 60, width: 80, height: 60, text: "Process", fill: "#4472C4" },
    { id: "arrow2", name: "Arrow 2", type: "arrow", x: 220, y: 80, width: 40, height: 20 },
    { id: "step3", name: "Step 3", type: "roundRect", x: 260, y: 60, width: 80, height: 60, text: "End", fill: "#C0504D" },
  ],
  connections: [
    { from: "step1", to: "step2", type: "arrow" },
    { from: "step2", to: "step3", type: "arrow" },
  ],
};

export const cycleDiagram: DiagramSample = {
  id: "cycle",
  name: "Basic Cycle",
  description: "Circular process with 4 stages",
  category: "cycle",
  shapes: [
    { id: "stage1", name: "Stage 1", type: "ellipse", x: 120, y: 10, width: 60, height: 60, text: "Plan", fill: "#4472C4" },
    { id: "stage2", name: "Stage 2", type: "ellipse", x: 190, y: 80, width: 60, height: 60, text: "Do", fill: "#70AD47" },
    { id: "stage3", name: "Stage 3", type: "ellipse", x: 120, y: 150, width: 60, height: 60, text: "Check", fill: "#FFC000" },
    { id: "stage4", name: "Stage 4", type: "ellipse", x: 50, y: 80, width: 60, height: 60, text: "Act", fill: "#C0504D" },
  ],
  connections: [
    { from: "stage1", to: "stage2", type: "arrow" },
    { from: "stage2", to: "stage3", type: "arrow" },
    { from: "stage3", to: "stage4", type: "arrow" },
    { from: "stage4", to: "stage1", type: "arrow" },
  ],
};

export const hierarchyDiagram: DiagramSample = {
  id: "hierarchy",
  name: "Organization Chart",
  description: "Simple org chart with 3 levels",
  category: "hierarchy",
  shapes: [
    { id: "ceo", name: "CEO", type: "rectangle", x: 110, y: 10, width: 80, height: 40, text: "CEO", fill: "#4472C4" },
    { id: "vp1", name: "VP 1", type: "rectangle", x: 40, y: 80, width: 80, height: 40, text: "VP Sales", fill: "#5B9BD5" },
    { id: "vp2", name: "VP 2", type: "rectangle", x: 180, y: 80, width: 80, height: 40, text: "VP Eng", fill: "#5B9BD5" },
    { id: "mgr1", name: "Mgr 1", type: "rectangle", x: 10, y: 150, width: 70, height: 35, text: "Manager", fill: "#9DC3E6" },
    { id: "mgr2", name: "Mgr 2", type: "rectangle", x: 85, y: 150, width: 70, height: 35, text: "Manager", fill: "#9DC3E6" },
    { id: "mgr3", name: "Mgr 3", type: "rectangle", x: 160, y: 150, width: 70, height: 35, text: "Manager", fill: "#9DC3E6" },
    { id: "mgr4", name: "Mgr 4", type: "rectangle", x: 235, y: 150, width: 70, height: 35, text: "Manager", fill: "#9DC3E6" },
  ],
  connections: [
    { from: "ceo", to: "vp1", type: "line" },
    { from: "ceo", to: "vp2", type: "line" },
    { from: "vp1", to: "mgr1", type: "line" },
    { from: "vp1", to: "mgr2", type: "line" },
    { from: "vp2", to: "mgr3", type: "line" },
    { from: "vp2", to: "mgr4", type: "line" },
  ],
};

export const vennDiagram: DiagramSample = {
  id: "venn",
  name: "Venn Diagram",
  description: "Two overlapping circles showing relationships",
  category: "relationship",
  shapes: [
    { id: "circle1", name: "Set A", type: "ellipse", x: 30, y: 40, width: 150, height: 150, text: "Set A", fill: "#4472C4" },
    { id: "circle2", name: "Set B", type: "ellipse", x: 120, y: 40, width: 150, height: 150, text: "Set B", fill: "#70AD47" },
    { id: "intersection", name: "Intersection", type: "text", x: 125, y: 100, width: 50, height: 30, text: "A ∩ B" },
  ],
  connections: [],
};

// =============================================================================
// Catalog
// =============================================================================

export const diagramCatalog: readonly DiagramSample[] = [
  basicListDiagram,
  linearProcessDiagram,
  cycleDiagram,
  hierarchyDiagram,
  vennDiagram,
];
