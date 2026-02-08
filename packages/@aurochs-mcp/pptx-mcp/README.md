# @aurochs-mcp/pptx-mcp

MCP (Model Context Protocol) server for PowerPoint presentation creation and editing.

## Features

- Create presentations from templates
- Add/remove/duplicate/reorder slides
- Add shapes, text boxes, tables, images
- Set transitions and animations
- Add speaker notes and comments
- Export to PPTX files
- Live SVG preview

## Quick Start

### 1. Start the MCP Server

```bash
# From the repository root
cd packages/@aurochs-mcp/pptx-mcp

# Start with stdio transport (for Claude Desktop)
bun run dev

# Or start with HTTP transport (for testing)
bun src/index.ts --transport http --port 3000
```

### 2. Configure Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

First, find your paths:

```bash
# Find bun path
which bun

# Find this package path (run from repo root)
echo "$(pwd)/packages/@aurochs-mcp/pptx-mcp/src/index.ts"
```

Then add to config:

```json
{
  "mcpServers": {
    "pptx": {
      "command": "<BUN_PATH>",
      "args": ["<REPO_PATH>/packages/@aurochs-mcp/pptx-mcp/src/index.ts"],
      "env": {}
    }
  }
}
```

**Important**: Use `bun` directly, not `bun run`

### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the MCP server.

## Available Tools

| Tool                       | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `pptx_create_presentation` | Create a new presentation from template          |
| `pptx_add_slide`           | Add a new slide                                  |
| `pptx_remove_slide`        | Remove a slide                                   |
| `pptx_duplicate_slide`     | Duplicate an existing slide                      |
| `pptx_reorder_slide`       | Move a slide to a different position             |
| `pptx_add_shape`           | Add a shape (rect, ellipse, roundRect, etc.)     |
| `pptx_add_text_box`        | Add a text box                                   |
| `pptx_add_table`           | Add a table                                      |
| `pptx_add_image`           | Add an image                                     |
| `pptx_add_connector`       | Add a connector line                             |
| `pptx_add_group`           | Add a group of shapes                            |
| `pptx_set_transition`      | Set slide transition effect                      |
| `pptx_add_animations`      | Add animations to shapes                         |
| `pptx_add_comments`        | Add comments to a slide                          |
| `pptx_set_speaker_notes`   | Set speaker notes                                |
| `pptx_modify_slide`        | Modify slide (background, add multiple elements) |
| `pptx_update_table`        | Update existing table                            |
| `pptx_render_slide`        | Render slide to SVG                              |
| `pptx_get_info`            | Get presentation info                            |
| `pptx_export`              | Export presentation to file                      |

## Example Usage

After starting the server and configuring Claude Desktop, you can ask Claude:

```
Create a presentation with 3 slides:
1. Title slide with "Quarterly Report"
2. A slide with a table showing sales data
3. A slide with a chart
```

Claude will use the MCP tools to create the presentation.

## Testing the Server

### Quick Test (List Tools)

```bash
cd packages/@aurochs-mcp/pptx-mcp
bun run test:tools
```

### Manual JSON-RPC Test

```bash
cd packages/@aurochs-mcp/pptx-mcp

# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun src/index.ts

# Create a presentation
TEMPLATE="../@aurochs-cli/pptx-cli/spec/verify-cases/templates/blank.pptx"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"pptx_create_presentation","arguments":{"template_path":"'$TEMPLATE'","title":"Test"}}}' | bun src/index.ts
```

### HTTP Transport Test

```bash
# Start server with HTTP
bun src/index.ts --transport http --port 3000

# Call tool via HTTP
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Run Integration Tests

```bash
# From repository root
bun test packages/@aurochs-mcp/pptx-mcp/spec
```

## Development

```bash
# Run server in development mode
bun run dev

# Type check
bun run typecheck

# Build UI
bun run build:ui
```

## Templates

Place your PPTX templates in a location accessible to the server. The blank template is available at:

```
packages/@aurochs-cli/pptx-cli/spec/verify-cases/templates/blank.pptx
```

## Architecture

```
pptx-mcp/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── tools/            # Tool registrations
│   ├── resources/        # Resource handlers
│   └── transports/       # stdio/http transports
└── ui-src/               # React UI for preview
    ├── App.tsx
    └── components/
```

The MCP server uses `@aurochs-cli/pptx-cli/core` for all presentation operations, making it a thin wrapper that exposes the CLI functionality via MCP protocol.
