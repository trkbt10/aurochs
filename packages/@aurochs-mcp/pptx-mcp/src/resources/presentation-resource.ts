/**
 * @file Presentation resource
 *
 * Exposes current presentation state as a readable MCP resource.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PresentationSession } from "@aurochs-cli/pptx-cli/core";

/**
 * Register presentation resource.
 */
export function registerPresentationResource(server: McpServer, session: PresentationSession): void {
  server.registerResource(
    "Current Presentation",
    "pptx://presentation/current",
    { description: "Current presentation state", mimeType: "application/json" },
    async (uri) => {
      const info = session.getInfo();

      if (!info) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({
                error: "No active presentation",
                hint: "Use pptx_create_presentation tool first",
              }),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              slideCount: info.slideCount,
              width: info.width,
              height: info.height,
              hasActivePresentation: true,
            }),
          },
        ],
      };
    },
  );

  const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  server.registerResource(
    "Export Presentation",
    "pptx://presentation/export",
    { description: "Export current presentation as PPTX binary", mimeType: PPTX_MIME },
    async (uri) => {
      if (!session.isActive()) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "No active presentation" }),
            },
          ],
        };
      }

      const buffer = await session.exportBuffer();
      const bytes = new Uint8Array(buffer);
      const blob = btoa(String.fromCharCode(...bytes));

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: PPTX_MIME,
            blob,
          },
        ],
      };
    },
  );
}
