/**
 * @file JSONL scenario-based consistency tests
 *
 * Reads .jsonl scenario files from spec/scenarios/, spawns the MCP server as a
 * subprocess, pipes JSON-RPC messages, and validates response consistency.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const SERVER_ENTRY = resolve(import.meta.dirname, "../src/index.ts");
const SCENARIOS_DIR = join(import.meta.dirname, "scenarios");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScenarioMeta = {
  _meta: { name: string; description: string; timeout?: number };
};

type StepAssert = {
  slideCount?: number;
  hasPresentation?: boolean;
  hasSlideData?: boolean;
  svgContains?: string;
  contentContains?: string;
  isError?: boolean;
  errorContains?: string;
  skipMeta?: boolean;
};

type ScenarioStep = {
  id: number;
  method: string;
  params: Record<string, unknown>;
  assert?: StepAssert;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: {
    content?: Array<{ type: string; text: string }>;
    isError?: boolean;
    _meta?: Record<string, unknown>;
  };
  error?: { code: number; message: string };
};

// ---------------------------------------------------------------------------
// Response assertion
// ---------------------------------------------------------------------------

function assertResponse(
  response: JsonRpcResponse,
  stepAssert: StepAssert,
  stepLabel: string,
): void {
  // No JSON-RPC protocol error
  if (!stepAssert.isError) {
    expect(response.error).toBeUndefined();
  }

  const result = response.result;
  if (!result) {
    throw new Error(`${stepLabel}: no result in response`);
  }

  // Expected error path
  if (stepAssert.isError) {
    expect(result.isError).toBe(true);
    if (stepAssert.errorContains) {
      expect(result.content?.[0]?.text).toContain(stepAssert.errorContains);
    }
    return;
  }

  // No unexpected tool error
  expect(result.isError).not.toBe(true);

  // Universal _meta.presentation consistency
  if (!stepAssert.skipMeta) {
    const meta = result._meta as Record<string, unknown> | undefined;
    expect(meta).toBeDefined();

    const pres = meta?.presentation as Record<string, unknown> | undefined;
    expect(pres).toBeDefined();
    expect(typeof pres?.slideCount).toBe("number");
    expect(typeof pres?.width).toBe("number");
    expect(typeof pres?.height).toBe("number");
    expect(pres!.width as number).toBeGreaterThan(0);
    expect(pres!.height as number).toBeGreaterThan(0);
  }

  // Step-specific: slideCount
  if (stepAssert.slideCount !== undefined) {
    const pres = (result._meta as Record<string, unknown>)?.presentation as Record<string, unknown>;
    expect(pres?.slideCount).toBe(stepAssert.slideCount);
  }

  // Step-specific: hasSlideData
  if (stepAssert.hasSlideData) {
    const meta = result._meta as Record<string, unknown>;
    const sd = meta?.slideData as Record<string, unknown> | undefined;
    expect(sd).toBeDefined();
    expect(typeof sd?.svg).toBe("string");
    expect(sd!.svg as string).toContain("<svg");
  }

  // Step-specific: svgContains
  if (stepAssert.svgContains) {
    const sd = (result._meta as Record<string, unknown>)?.slideData as Record<string, unknown>;
    expect(sd?.svg as string).toContain(stepAssert.svgContains);
  }

  // Step-specific: contentContains
  if (stepAssert.contentContains) {
    expect(result.content?.[0]?.text).toContain(stepAssert.contentContains);
  }
}

// ---------------------------------------------------------------------------
// Scenario runner
// ---------------------------------------------------------------------------

async function runScenario(scenarioPath: string): Promise<void> {
  const lines = readFileSync(scenarioPath, "utf-8").trim().split("\n");
  const meta: ScenarioMeta = JSON.parse(lines[0]!);
  const steps: ScenarioStep[] = lines.slice(1).map((l) => JSON.parse(l));

  // Create temp dir for exports
  const tempDir = mkdtempSync(join(tmpdir(), "pptx-scenario-"));

  // Replace __TEMP__ placeholder in step arguments
  for (const step of steps) {
    const argsStr = JSON.stringify(step.params);
    if (argsStr.includes("__TEMP__")) {
      step.params = JSON.parse(argsStr.replace(/__TEMP__/g, tempDir));
    }
  }

  const proc = Bun.spawn(["bun", SERVER_ENTRY], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const responses = new Map<number, JsonRpcResponse>();
  let responseBuffer = "";

  // Read stdout in background, parse newline-delimited JSON
  const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();

  const readLoop = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseBuffer += decoder.decode(value, { stream: true });
        const parts = responseBuffer.split("\n");
        responseBuffer = parts.pop()!;
        for (const part of parts) {
          if (!part.trim()) continue;
          try {
            const msg = JSON.parse(part) as JsonRpcResponse;
            if (msg.id !== undefined) {
              responses.set(msg.id as number, msg);
            }
          } catch {
            // Ignore non-JSON lines
          }
        }
      }
    } catch {
      // Stream closed
    }
  })();

  const timeout = meta._meta.timeout ?? 30000;

  async function sendAndWait(msg: object, id: number): Promise<JsonRpcResponse> {
    const json = JSON.stringify(msg) + "\n";
    proc.stdin!.write(json);
    await proc.stdin!.flush();

    const deadline = Date.now() + timeout;
    while (!responses.has(id)) {
      if (Date.now() > deadline) {
        throw new Error(`Timeout waiting for response id=${id}`);
      }
      await Bun.sleep(20);
    }
    return responses.get(id)!;
  }

  try {
    // Initialize handshake
    await sendAndWait(
      {
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "scenario-test", version: "1.0" },
        },
      },
      0,
    );

    // Initialized notification
    proc.stdin!.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
    );
    await proc.stdin!.flush();
    await Bun.sleep(50);

    // Execute steps
    for (const step of steps) {
      const rpcMessage = {
        jsonrpc: "2.0",
        id: step.id,
        method: step.method,
        params: step.params,
      };

      const response = await sendAndWait(rpcMessage, step.id);
      const label = `Step ${step.id} (${(step.params as Record<string, unknown>).name ?? step.method})`;
      assertResponse(response, step.assert ?? {}, label);
    }
  } finally {
    proc.kill();
    await readLoop.catch(() => {});
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Dynamic test generation
// ---------------------------------------------------------------------------

describe("JSONL Scenario Tests", () => {
  const scenarioFiles = readdirSync(SCENARIOS_DIR).filter((f) =>
    f.endsWith(".jsonl"),
  );

  for (const file of scenarioFiles) {
    const scenarioPath = join(SCENARIOS_DIR, file);
    const firstLine = readFileSync(scenarioPath, "utf-8").split("\n")[0]!;
    const meta: ScenarioMeta = JSON.parse(firstLine);
    const testTimeout = meta._meta.timeout ?? 30000;

    it(
      `scenario: ${meta._meta.name}`,
      async () => {
        await runScenario(scenarioPath);
      },
      testTimeout,
    );
  }
});
