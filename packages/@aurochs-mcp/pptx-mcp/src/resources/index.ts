/**
 * @file Resource registration
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PresentationSession } from "@aurochs-cli/pptx-cli/core";
import { registerPresentationResource } from "./presentation-resource";
import { registerUiResource } from "./ui-resource";

/**
 * Register all resources with the MCP server.
 */
export function registerResources(server: McpServer, session: PresentationSession): void {
  registerPresentationResource(server, session);
  registerUiResource(server);
}
