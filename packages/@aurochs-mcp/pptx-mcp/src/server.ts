/**
 * @file MCP Server for PPTX
 *
 * Initializes the McpServer instance with tools, resources, and UI.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPresentationSession, type PresentationSession } from "@aurochs-cli/pptx-cli/core";
import { registerTools } from "./tools";
import { registerResources } from "./resources";

export type CreateServerOptions = {
  readonly session?: PresentationSession;
};

/**
 * Create and configure the MCP server.
 */
export function createServer(options?: CreateServerOptions): {
  server: McpServer;
  session: PresentationSession;
} {
  const session = options?.session ?? createPresentationSession();

  const server = new McpServer({
    name: "pptx-mcp-server",
    version: "0.1.0",
  });

  // Register tools
  registerTools(server, session);

  // Register resources
  registerResources(server, session);

  return { server, session };
}
