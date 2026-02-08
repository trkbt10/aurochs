/**
 * @file stdio transport for MCP server
 *
 * Standard I/O transport for local CLI usage and Claude Desktop integration.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../server";

/**
 * Start the MCP server with stdio transport.
 */
export async function startStdioServer(): Promise<void> {
  const { server } = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error("PPTX MCP server running via stdio");
}
