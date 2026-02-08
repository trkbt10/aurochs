/**
 * @file HTTP transport for MCP server
 *
 * Streamable HTTP transport for remote/web-based integration.
 */

import { Hono } from "hono";
import { createServer } from "../server";

/**
 * Create an HTTP app for the MCP server.
 *
 * Note: Streamable HTTP transport requires proper session handling.
 * This is a simplified implementation for demonstration.
 */
export function createHttpApp(): Hono {
  const app = new Hono();
  // Server and session are created but not used directly in this simplified HTTP handler
  // Full implementation would route calls through the MCP server
  const { server: _server, session: _session } = createServer();

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "ok" }));

  // MCP endpoint - simplified JSON-RPC handler
  app.post("/mcp", async (c) => {
    try {
      const body = await c.req.json();

      // Handle tools/list
      if (body.method === "tools/list") {
        return c.json({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [
              {
                name: "pptx_create_presentation",
                description: "Create a new PowerPoint presentation",
              },
              {
                name: "pptx_add_slide",
                description: "Add a new slide",
              },
              {
                name: "pptx_add_shape",
                description: "Add a shape to a slide",
              },
              {
                name: "pptx_add_text_box",
                description: "Add a text box to a slide",
              },
              {
                name: "pptx_export",
                description: "Export the presentation",
              },
            ],
          },
        });
      }

      // For other methods, return not implemented
      return c.json({
        jsonrpc: "2.0",
        id: body.id,
        error: {
          code: -32601,
          message: "Method not found. Use stdio transport for full functionality.",
        },
      });
    } catch (error) {
      console.error("MCP HTTP parse error:", error);
      return c.json({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      });
    }
  });

  return app;
}

/**
 * Start the HTTP server.
 */
export async function startHttpServer(port: number): Promise<void> {
  const app = createHttpApp();

  console.error(`PPTX MCP server running on http://localhost:${port}/mcp`);

  // Use Bun.serve for HTTP
  // @ts-expect-error Bun global is available at runtime
  Bun.serve({
    port,
    fetch: app.fetch,
  });
}
