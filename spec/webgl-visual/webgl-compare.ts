/**
 * WebGL Visual Regression Test Utilities
 *
 * Provides screenshot capture and comparison for 3D WebGL rendering.
 * Uses Puppeteer to run WebGL in headless Chrome for consistent rendering.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const VISUAL_DIR = path.dirname(new URL(import.meta.url).pathname);
const SNAPSHOT_DIR = path.join(VISUAL_DIR, "snapshots");
const OUTPUT_DIR = path.join(VISUAL_DIR, "__output__");
const DIFF_DIR = path.join(VISUAL_DIR, "__diff__");
const DIST_DIR = path.join(VISUAL_DIR, "dist");

// =============================================================================
// Types
// =============================================================================

export type CompareResult = {
  match: boolean;
  diffPixels: number;
  diffPercent: number;
  totalPixels: number;
  snapshotPath: string;
  actualPath: string;
  diffImagePath: string | null;
};

export type CompareOptions = {
  /** Threshold for color difference (0-1, default: 0.1) */
  threshold?: number;
  /** Maximum allowed diff percentage (0-100, default: 1) */
  maxDiffPercent?: number;
  /** Include anti-aliased pixels in diff (default: false) */
  includeAA?: boolean;
};

export type RenderConfig = {
  /** Test name (used for file naming) */
  name: string;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** JavaScript code to execute for rendering */
  renderScript: string;
  /** Background color (CSS color string, default: transparent) */
  backgroundColor?: string;
};

// =============================================================================
// Directory Management
// =============================================================================

function ensureDirs(): void {
  for (const dir of [OUTPUT_DIR, DIFF_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function ensureSnapshotDir(subdir: string): void {
  const dir = path.join(SNAPSHOT_DIR, subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// =============================================================================
// Browser Management
// =============================================================================

let browserInstance: Browser | null = null;

/**
 * Get or create a shared browser instance.
 * Reuses the same browser for multiple tests to improve performance.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--use-gl=angle", // Use ANGLE for WebGL
        "--enable-webgl",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu-sandbox",
      ],
    });
  }
  return browserInstance;
}

/**
 * Close the shared browser instance.
 * Call this after all tests are complete.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// =============================================================================
// Screenshot Capture
// =============================================================================

/**
 * Generate HTML page for rendering 3D scene.
 */
function generateRenderHTML(config: RenderConfig): string {
  const { width, height, renderScript, backgroundColor = "transparent" } = config;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; }
    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${backgroundColor};
    }
    #container {
      width: ${width}px;
      height: ${height}px;
    }
    canvas {
      display: block;
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js"
    }
  }
  </script>
  <script type="module">
    import * as THREE from 'three';

    // Make THREE available globally for render script
    window.THREE = THREE;

    // Render script will set window.renderComplete = true when done
    window.renderComplete = false;
    window.renderError = null;

    async function render() {
      try {
        ${renderScript}
        window.renderComplete = true;
      } catch (e) {
        window.renderError = e.message;
        console.error('Render error:', e);
      }
    }

    render();
  </script>
</body>
</html>`;
}

/**
 * Capture screenshot from WebGL rendering.
 *
 * @param config - Render configuration
 * @returns PNG image buffer
 */
export async function captureWebGLScreenshot(config: RenderConfig): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport
    await page.setViewport({
      width: config.width,
      height: config.height,
      deviceScaleFactor: 1,
    });

    // Generate and load HTML
    const html = generateRenderHTML(config);
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for render to complete (max 10 seconds)
    await page.waitForFunction(
      () => (window as unknown as { renderComplete: boolean }).renderComplete === true ||
            (window as unknown as { renderError: string | null }).renderError !== null,
      { timeout: 10000 },
    );

    // Check for render error
    const renderError = await page.evaluate(
      () => (window as unknown as { renderError: string | null }).renderError,
    );
    if (renderError) {
      throw new Error(`WebGL render error: ${renderError}`);
    }

    // Capture screenshot
    const screenshot = await page.screenshot({
      type: "png",
      omitBackground: config.backgroundColor === "transparent",
    });

    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

// =============================================================================
// Image Comparison
// =============================================================================

/**
 * Load PNG from file.
 */
function loadPng(filePath: string): PNG {
  const buffer = fs.readFileSync(filePath);
  return PNG.sync.read(buffer);
}

/**
 * Save PNG to file.
 */
function savePng(buffer: Buffer, filePath: string): void {
  fs.writeFileSync(filePath, buffer);
}

/**
 * Resize PNG to match target dimensions using nearest-neighbor.
 */
function resizePng(png: PNG, targetWidth: number, targetHeight: number): PNG {
  const resized = new PNG({ width: targetWidth, height: targetHeight });
  const xRatio = png.width / targetWidth;
  const yRatio = png.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * png.width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;

      resized.data[dstIdx] = png.data[srcIdx];
      resized.data[dstIdx + 1] = png.data[srcIdx + 1];
      resized.data[dstIdx + 2] = png.data[srcIdx + 2];
      resized.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  return resized;
}

/**
 * Compare captured screenshot against baseline.
 *
 * @param actualBuffer - Captured screenshot buffer
 * @param snapshotName - Name of snapshot subdirectory
 * @param testName - Name of test (used for file naming)
 * @param options - Comparison options
 * @returns Comparison result
 */
export async function compareToBaseline(
  actualBuffer: Buffer,
  snapshotName: string,
  testName: string,
  options: CompareOptions = {},
): Promise<CompareResult> {
  ensureDirs();

  const {
    threshold = 0.1,
    maxDiffPercent = 1,
    includeAA = false,
  } = options;

  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName, `${testName}.png`);
  const actualPath = path.join(OUTPUT_DIR, `${snapshotName}-${testName}.png`);
  const diffPath = path.join(DIFF_DIR, `${snapshotName}-${testName}-diff.png`);

  // Save actual output
  savePng(actualBuffer, actualPath);

  // Check if baseline exists
  if (!fs.existsSync(snapshotPath)) {
    return {
      match: false,
      diffPixels: -1,
      diffPercent: 100,
      totalPixels: 0,
      snapshotPath,
      actualPath,
      diffImagePath: null,
    };
  }

  // Load images
  const actual = PNG.sync.read(actualBuffer);
  let expected = loadPng(snapshotPath);

  // Handle dimension mismatch
  if (expected.width !== actual.width || expected.height !== actual.height) {
    expected = resizePng(expected, actual.width, actual.height);
  }

  const { width, height } = actual;
  const diff = new PNG({ width, height });

  // Compare
  const diffPixels = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold, includeAA },
  );

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPercent <= maxDiffPercent;

  // Save diff image if there are differences
  let diffImagePath: string | null = null;
  if (diffPixels > 0) {
    const diffBuffer = PNG.sync.write(diff);
    savePng(diffBuffer, diffPath);
    diffImagePath = diffPath;
  }

  return {
    match,
    diffPixels,
    diffPercent,
    totalPixels,
    snapshotPath,
    actualPath,
    diffImagePath,
  };
}

/**
 * Save baseline snapshot.
 *
 * @param buffer - PNG buffer to save
 * @param snapshotName - Snapshot subdirectory name
 * @param testName - Test name
 */
export function saveBaseline(
  buffer: Buffer,
  snapshotName: string,
  testName: string,
): string {
  ensureSnapshotDir(snapshotName);
  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName, `${testName}.png`);
  savePng(buffer, snapshotPath);
  return snapshotPath;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a simple render script for testing shapes with bevels.
 */
export function createBevelRenderScript(params: {
  shapeCode: string;
  extrusionDepth: number;
  bevelTop?: { width: number; height: number; preset: string };
  bevelBottom?: { width: number; height: number; preset: string };
  cameraPosition?: [number, number, number];
  lightIntensity?: number;
}): string {
  const {
    shapeCode,
    extrusionDepth,
    bevelTop,
    bevelBottom,
    cameraPosition = [0, 0, 100],
    lightIntensity = 1,
  } = params;

  const bevelConfig = JSON.stringify({
    top: bevelTop,
    bottom: bevelBottom,
  });

  return `
    const container = document.getElementById('container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(${cameraPosition.join(", ")});
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, ${lightIntensity});
    directionalLight.position.set(5, 5, 10);
    scene.add(directionalLight);

    // Create shape
    ${shapeCode}

    // Extrusion settings
    const extrudeSettings = {
      depth: ${extrusionDepth},
      bevelEnabled: ${bevelTop || bevelBottom ? "true" : "false"},
      ${bevelTop ? `bevelSize: ${bevelTop.width}, bevelThickness: ${bevelTop.height},` : ""}
      bevelSegments: 8,
    };

    // Create geometry
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      metalness: 0.3,
      roughness: 0.4,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Render
    renderer.render(scene, camera);
  `;
}

/**
 * Custom bevel render configuration
 */
export type CustomBevelRenderParams = {
  shapeCode: string;
  extrusionDepth: number;
  bevelTop?: { width: number; height: number; preset: string };
  bevelBottom?: { width: number; height: number; preset: string };
  contourWidth?: number;
  cameraPosition?: [number, number, number];
  lightIntensity?: number;
};

/**
 * Get bundled custom bevel code.
 */
function getCustomBevelCode(): string {
  const bundlePath = path.join(DIST_DIR, "custom-bevel.js");
  if (!fs.existsSync(bundlePath)) {
    throw new Error(
      `Custom bevel bundle not found at ${bundlePath}. Run: bun run spec/webgl-visual/scripts/bundle-custom-bevel.ts`,
    );
  }
  return fs.readFileSync(bundlePath, "utf-8");
}

/**
 * Generate HTML page for rendering with custom bevel implementation.
 */
function generateCustomBevelHTML(
  config: RenderConfig,
  customBevelCode: string,
): string {
  const { width, height, renderScript, backgroundColor = "transparent" } = config;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; }
    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${backgroundColor};
    }
    #container {
      width: ${width}px;
      height: ${height}px;
    }
    canvas {
      display: block;
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js"
    }
  }
  </script>
  <script type="module">
    import * as THREE_IMPORT from 'three';

    // Make THREE available globally for custom bevel code
    window.THREE = THREE_IMPORT;

    // Custom bevel implementation (bundled) - uses window.THREE
    // Note: This bundle defines THREE from window.THREE at the top
    ${customBevelCode}

    // Render script will set window.renderComplete = true when done
    window.renderComplete = false;
    window.renderError = null;

    async function render() {
      try {
        ${renderScript}
        window.renderComplete = true;
      } catch (e) {
        window.renderError = e.message + '\\n' + e.stack;
        console.error('Render error:', e);
      }
    }

    render();
  </script>
</body>
</html>`;
}

/**
 * Capture screenshot using custom bevel implementation.
 *
 * @param config - Render configuration
 * @param debug - If true, log console messages and save HTML for debugging
 * @returns PNG image buffer
 */
export async function captureCustomBevelScreenshot(
  config: RenderConfig,
  debug = false,
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Capture console messages for debugging
  const consoleLogs: string[] = [];
  page.on("console", (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    consoleLogs.push(`[pageerror] ${error.message}`);
  });

  try {
    // Set viewport
    await page.setViewport({
      width: config.width,
      height: config.height,
      deviceScaleFactor: 1,
    });

    // Get bundled custom bevel code
    const customBevelCode = getCustomBevelCode();

    // Generate and load HTML
    const html = generateCustomBevelHTML(config, customBevelCode);

    // Save HTML for debugging if needed
    if (debug) {
      const debugHtmlPath = path.join(OUTPUT_DIR, `${config.name}-debug.html`);
      fs.writeFileSync(debugHtmlPath, html);
      console.log(`Debug HTML saved: ${debugHtmlPath}`);
    }

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for render to complete (max 10 seconds)
    await page.waitForFunction(
      () =>
        (window as unknown as { renderComplete: boolean }).renderComplete === true ||
        (window as unknown as { renderError: string | null }).renderError !== null,
      { timeout: 10000 },
    );

    // Check for render error
    const renderError = await page.evaluate(
      () => (window as unknown as { renderError: string | null }).renderError,
    );
    if (renderError) {
      if (debug) {
        console.log("Console logs:", consoleLogs.join("\n"));
      }
      throw new Error(`WebGL render error: ${renderError}`);
    }

    // Log console messages if debug mode
    if (debug && consoleLogs.length > 0) {
      console.log("Console logs:", consoleLogs.join("\n"));
    }

    // Capture screenshot
    const screenshot = await page.screenshot({
      type: "png",
      omitBackground: config.backgroundColor === "transparent",
    });

    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

/**
 * Create render script for custom bevel geometry (using our bevel implementation).
 */
export function createCustomBevelRenderScript(params: CustomBevelRenderParams): string {
  const {
    shapeCode,
    extrusionDepth,
    bevelTop,
    bevelBottom,
    contourWidth,
    cameraPosition = [0, 0, 100],
    lightIntensity = 1,
  } = params;

  const bevelConfig = JSON.stringify({
    top: bevelTop,
    bottom: bevelBottom,
  });

  // Use contour expansion if specified
  const contourCode = contourWidth
    ? `
    // Expand shape for contour effect
    const expandedShape = expandShape(
      threeShapeToShapeInput(shape),
      ${contourWidth}
    );
    const shapesToExtrude = expandedShape
      ? [shapeInputToThreeShape(expandedShape)]
      : [shape];
    `
    : `const shapesToExtrude = [shape];`;

  return `
    const container = document.getElementById('container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(${cameraPosition.join(", ")});
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, ${lightIntensity});
    directionalLight.position.set(5, 5, 10);
    scene.add(directionalLight);

    // Create shape
    ${shapeCode}

    ${contourCode}

    // Create geometry using custom bevel implementation
    const geometry = createExtrudedGeometryWithBevel(
      shapesToExtrude,
      ${extrusionDepth},
      ${bevelConfig}
    );
    geometry.center();

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      metalness: 0.3,
      roughness: 0.4,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Render
    renderer.render(scene, camera);
  `;
}
