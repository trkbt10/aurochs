#!/usr/bin/env bun
/**
 * @file PPTX MCP Server entry point
 *
 * Usage:
 *   bun src/index.ts                    # stdio transport (default)
 *   bun src/index.ts --transport http   # HTTP transport
 *   bun src/index.ts --port 3000        # HTTP on custom port
 */

import { parseArgs } from "node:util";
import { startStdioServer } from "./transports/stdio";
import { startHttpServer } from "./transports/http";

const { values } = parseArgs({
  options: {
    transport: {
      type: "string",
      short: "t",
      default: "stdio",
    },
    port: {
      type: "string",
      short: "p",
      default: "3000",
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
    },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
PPTX MCP Server

Usage:
  pptx-mcp [options]

Options:
  -t, --transport <type>  Transport type: stdio (default) or http
  -p, --port <port>       HTTP port (default: 3000)
  -h, --help              Show this help message

Examples:
  pptx-mcp                      # Run with stdio transport
  pptx-mcp --transport http     # Run with HTTP transport on port 3000
  pptx-mcp -t http -p 8080      # Run with HTTP transport on port 8080
`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (values.transport === "http") {
    const port = Number.parseInt(values.port ?? "3000", 10);
    await startHttpServer(port);
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
