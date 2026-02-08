/**
 * @file MCP Server error codes
 */

export const ErrorCodes = {
  NO_ACTIVE_PRESENTATION: "PPTX_NO_ACTIVE_PRESENTATION",
  INVALID_SLIDE_NUMBER: "PPTX_INVALID_SLIDE_NUMBER",
  SHAPE_NOT_FOUND: "PPTX_SHAPE_NOT_FOUND",
  INVALID_TEMPLATE: "PPTX_INVALID_TEMPLATE",
  TEMPLATE_NOT_FOUND: "PPTX_TEMPLATE_NOT_FOUND",
  EXPORT_FAILED: "PPTX_EXPORT_FAILED",
  LAYOUT_NOT_FOUND: "PPTX_LAYOUT_NOT_FOUND",
  BUILD_FAILED: "PPTX_BUILD_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** MCP-specific error with error code */
export class McpError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "McpError";
  }
}
